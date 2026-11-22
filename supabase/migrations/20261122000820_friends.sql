-- alpha_08 (Freunde), part 3 (docs/GAME_DESIGN.md §16.1):
-- Aushelfen: once per friend and day the helper takes time off the friend's grading orders and shift; both get a
-- little money and EP. Kaffee und Kuchen: once per friend and day, both get a short EP buff.
-- Sammelbestellung: friends fill a case of six displays at the wholesale price; when it is full, everyone gets a
-- parcel with their displays. Nobody can fill a case alone, and shares per week are capped.

create table game.friend_acts (
  actor_id uuid not null references game.players (id) on delete cascade,
  target_id uuid not null references game.players (id) on delete cascade,
  kind text not null check (kind in ('aushelfen', 'kaffee')),
  day date not null,
  primary key (actor_id, target_id, kind, day)
);
create index friend_acts_target on game.friend_acts (target_id);
alter table game.friend_acts enable row level security;

create table game.group_orders (
  id bigint generated always as identity primary key,
  host_id uuid references game.players (id) on delete set null,
  product_id text not null references game.product_defs (id),
  unit_cents bigint not null,
  state text not null default 'open' check (state in ('open', 'done', 'cancelled')),
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create index group_orders_host on game.group_orders (host_id);
create index group_orders_product on game.group_orders (product_id);
create index group_orders_state on game.group_orders (state, expires_at);
alter table game.group_orders enable row level security;

create table game.group_order_shares (
  order_id bigint not null references game.group_orders (id) on delete cascade,
  player_id uuid not null references game.players (id) on delete cascade,
  shares int not null check (shares > 0),
  paid_cents bigint not null,
  at timestamptz not null,
  primary key (order_id, player_id)
);
create index group_order_shares_player on game.group_order_shares (player_id, at);
alter table game.group_order_shares enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Aushelfen, Kaffee und Kuchen
-- ---------------------------------------------------------------------------------------------
-- What the player did for whom today (for the buttons on the player list).
create function private.friend_acts_today(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.target_id, x.kinds), '{}'::jsonb) from (
    select target_id, jsonb_agg(kind order by kind) as kinds
    from game.friend_acts where actor_id = p_player and day = private.today()
    group by target_id
  ) x
$$;

create function public.friend_act(p_request_id uuid, p_target uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'friend_act');
  v_name text;
  v_cut interval;
  v_saved int := 0;
  v_reward bigint := 0;
  v_who uuid;
  r record;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'friends');
  perform private.rate_limit(v_player, 'friend', private.cfg_num('rate.friend')::int, 60);
  if p_kind is null or p_kind not in ('aushelfen', 'kaffee') or p_target is null or p_target = v_player
     or not exists (select 1 from game.players where id = p_target) then
    perform private.fail('invalid_request');
  end if;
  -- both rows in a fixed order: two friends helping each other at once must not deadlock
  perform 1 from game.players where id in (v_player, p_target) order by id for update;
  insert into game.friend_acts (actor_id, target_id, kind, day) values (v_player, p_target, p_kind, private.today())
  on conflict do nothing;
  if not found then
    perform private.fail('already_done');
  end if;
  select username into v_name from game.players where id = v_player;

  if p_kind = 'aushelfen' then
    -- a share of the remaining time, at most an hour, off every grading order and the shift
    for r in select id, due_at from game.grading_orders where player_id = p_target and due_at > private.now() loop
      v_cut := least(make_interval(mins => private.cfg_num('help.max_minutes')::int),
                     (r.due_at - private.now()) * (private.cfg_num('help.speedup_pct') / 100));
      update game.grading_orders set due_at = due_at - v_cut where id = r.id;
      v_saved := greatest(v_saved, ceil(extract(epoch from v_cut) / 60)::int);
    end loop;
    -- the whole shift moves earlier, so the friend is paid for the full shift sooner
    select ends_at into r from game.shifts where player_id = p_target and ends_at > private.now();
    if found then
      v_cut := least(make_interval(mins => private.cfg_num('help.max_minutes')::int),
                     (r.ends_at - private.now()) * (private.cfg_num('help.speedup_pct') / 100));
      update game.shifts set started_at = started_at - v_cut, ends_at = ends_at - v_cut, last_checkin_at = last_checkin_at - v_cut
      where player_id = p_target;
      v_saved := greatest(v_saved, ceil(extract(epoch from v_cut) / 60)::int);
    end if;
    foreach v_who in array array[v_player, p_target] loop
      v_reward := private.eur(private.ref_income_base((select level from game.players where id = v_who))
                              * private.cfg_num('help.reward_minutes') / 60);
      perform private.money_add(v_who, v_reward, 'help', p_kind);
      perform private.ep_grant(v_who, private.cfg_num('help.ep'));
    end loop;
    v_reward := private.eur(private.ref_income_base((select level from game.players where id = v_player))
                            * private.cfg_num('help.reward_minutes') / 60);
    perform private.notify(p_target, 'helped', jsonb_build_object('name', v_name, 'minutes', v_saved));
  else
    foreach v_who in array array[v_player, p_target] loop
      insert into game.modifiers (player_id, source, stat, op, value, expires_at)
      values (v_who, 'buff:kuchen', 'ep', 'pct', private.cfg_num('kaffee.ep_pct'),
              private.now() + make_interval(mins => private.cfg_num('kaffee.minutes')::int))
      on conflict (player_id, source, stat) do update set value = excluded.value, expires_at = excluded.expires_at;
    end loop;
    perform private.notify(p_target, 'kaffee', jsonb_build_object('name', v_name));
  end if;
  perform private.emit(v_player, 'friend_helped');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'kind', p_kind, 'minutes', v_saved, 'reward_cents', v_reward, 'player', private.me(v_player)));
end $$;
select private.expose('public.friend_act(uuid, uuid, text)');

-- The player list also says what was done for whom today.
create or replace function public.players_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  return jsonb_build_object('players', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.username,
      'title', p.title,
      'level', p.level,
      'online', p.id = v_player or p.last_seen_at > v_now - make_interval(secs => private.cfg_num('presence.online_seconds')),
      'last_seen_at', p.last_seen_at,
      'me', p.id = v_player,
      'locked_until', private.trade_lock_until(p),
      'is_admin', p.is_admin,
      'look', private.look(p)
    ) order by p.last_seen_at desc), '[]'::jsonb)
    from game.players p
  ), 'trades', private.trades_doc(v_player),
  'friends', jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.friends')::int,
    'done', private.friend_acts_today(v_player),
    'help_minutes', private.cfg_num('help.max_minutes')::int,
    'kaffee_pct', private.cfg_num('kaffee.ep_pct')::int,
    'kaffee_minutes', private.cfg_num('kaffee.minutes')::int));
end $$;

-- ---------------------------------------------------------------------------------------------
-- Sammelbestellung
-- ---------------------------------------------------------------------------------------------
create function private.group_order_unit(p_product text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(price_base_cents * private.cfg_num('group_order.price_bps') / 10000)
  from game.product_defs where id = p_product
$$;

-- Shares the player has taken this week (open and delivered orders).
create function private.group_shares_week(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce(sum(s.shares), 0)::int
  from game.group_order_shares s join game.group_orders o on o.id = s.order_id
  where s.player_id = p_player and o.state <> 'cancelled'
    and s.at >= (private.week_start()::timestamp at time zone 'Europe/Berlin')
$$;

create function private.group_order_doc(o game.group_orders, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'product_id', o.product_id, 'unit_cents', o.unit_cents, 'state', o.state,
    'host_id', o.host_id, 'created_at', o.created_at, 'expires_at', o.expires_at,
    'taken', (select coalesce(sum(shares), 0) from game.group_order_shares where order_id = o.id),
    'mine', (select coalesce(sum(shares), 0) from game.group_order_shares where order_id = o.id and player_id = p_player),
    'shares', (select coalesce(jsonb_agg(jsonb_build_object('player_id', s.player_id, 'name', p.username, 'look', private.look(p),
                 'shares', s.shares) order by s.at), '[]'::jsonb)
               from game.group_order_shares s join game.players p on p.id = s.player_id where s.order_id = o.id)
  )
$$;

create function private.group_orders_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.group_orders')::int,
    'case_displays', private.cfg_num('group_order.case_displays')::int,
    'max_shares_week', private.cfg_num('group_order.max_shares_week')::int,
    'shares_left', greatest(0, private.cfg_num('group_order.max_shares_week')::int - private.group_shares_week(p_player)),
    'delivery_minutes', private.cfg_num('group_order.delivery_minutes')::int,
    'displays', (select coalesce(jsonb_agg(jsonb_build_object('product_id', d.id, 'unit_cents', private.group_order_unit(d.id),
                   'list_cents', private.eur(d.price_base_cents)) order by d.id), '[]'::jsonb)
                 from game.product_defs d join game.set_defs s on s.id = d.set_id
                 where d.kind = 'display' and s.phase in ('print', 'last_wave')),
    'open', (select coalesce(jsonb_agg(private.group_order_doc(o, p_player) order by o.created_at desc), '[]'::jsonb)
             from game.group_orders o where o.state = 'open'),
    'recent', (select coalesce(jsonb_agg(private.group_order_doc(o, p_player) order by o.created_at desc), '[]'::jsonb)
               from (select * from game.group_orders o where o.state = 'done'
                       and exists (select 1 from game.group_order_shares where order_id = o.id and player_id = p_player)
                     order by o.created_at desc limit 5) o)
  )
$$;

create function private.on_group_order_rt() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.rt_send('world', 'poke', jsonb_build_object('area', 'group_orders'));
  return null;
end $$;
create trigger group_orders_rt after insert or update on game.group_orders for each row execute function private.on_group_order_rt();
create trigger group_order_shares_rt after insert or update or delete on game.group_order_shares for each row execute function private.on_group_order_rt();

-- Every share back to its owner.
create function private.group_order_cancel(p_order bigint) returns void
language plpgsql set search_path = '' as $$
declare
  s record;
begin
  update game.group_orders set state = 'cancelled' where id = p_order and state = 'open';
  if not found then
    return;
  end if;
  for s in select * from game.group_order_shares where order_id = p_order order by player_id loop
    perform private.money_add(s.player_id, s.paid_cents, 'group_order_refund', p_order::text);
    perform private.notify(s.player_id, 'group_order_cancelled', jsonb_build_object('product_id',
      (select product_id from game.group_orders where id = p_order)));
  end loop;
end $$;

-- Takes shares of an open order (new or existing participant); a full case is ordered at once.
create function private.group_order_take(p_player uuid, p_order bigint, p_shares int) returns void
language plpgsql set search_path = '' as $$
declare
  o game.group_orders;
  v_case int := private.cfg_num('group_order.case_displays')::int;
  v_taken int;
  v_mine int;
  s record;
begin
  select * into o from game.group_orders where id = p_order for update;
  if not found or o.state <> 'open' then
    perform private.fail('not_found');
  end if;
  select coalesce(sum(shares), 0), coalesce(sum(shares) filter (where player_id = p_player), 0) into v_taken, v_mine
  from game.group_order_shares where order_id = o.id;
  if p_shares is null or p_shares < 1 or v_taken + p_shares > v_case then
    perform private.fail('invalid_request');
  end if;
  -- a case needs at least two buyers
  if v_mine + p_shares > v_case - 1 then
    perform private.fail('group_alone');
  end if;
  if private.group_shares_week(p_player) + p_shares > private.cfg_num('group_order.max_shares_week') then
    perform private.fail('group_week_limit');
  end if;
  perform private.lager_check(p_player, p_shares);
  perform private.money_add(p_player, -o.unit_cents * p_shares, 'group_order', o.id::text);
  insert into game.group_order_shares (order_id, player_id, shares, paid_cents, at)
  values (o.id, p_player, p_shares, o.unit_cents * p_shares, private.now())
  on conflict (order_id, player_id) do update set shares = game.group_order_shares.shares + excluded.shares,
    paid_cents = game.group_order_shares.paid_cents + excluded.paid_cents;

  if v_taken + p_shares = v_case then
    update game.group_orders set state = 'done' where id = o.id;
    for s in select * from game.group_order_shares where order_id = o.id order by player_id loop
      insert into game.shipments (buyer_id, item_kind, item_id, qty, total_cents, fee_cents, arrives_at, created_at)
      values (s.player_id, 'sealed', o.product_id, s.shares, s.paid_cents, 0,
              private.now() + make_interval(mins => private.cfg_num('group_order.delivery_minutes')::int), private.now());
      perform private.notify(s.player_id, 'group_order_done', jsonb_build_object('product_id', o.product_id, 'qty', s.shares));
      perform private.emit(s.player_id, 'group_order_done');
    end loop;
  end if;
end $$;

create function public.group_orders_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.group_orders_doc(private.require_player());
end $$;
select private.expose('public.group_orders_get()');

create function public.group_order_create(p_request_id uuid, p_product text, p_shares int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'group_order_create');
  v_id bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'group_orders');
  perform private.rate_limit(v_player, 'group_order', private.cfg_num('rate.trade')::int, 60);
  if not exists (select 1 from game.product_defs d join game.set_defs s on s.id = d.set_id
                 where d.id = p_product and d.kind = 'display' and s.phase in ('print', 'last_wave')) then
    perform private.fail('invalid_request');
  end if;
  insert into game.group_orders (host_id, product_id, unit_cents, created_at, expires_at)
  values (v_player, p_product, private.group_order_unit(p_product), private.now(),
          private.now() + make_interval(hours => private.cfg_num('group_order.open_hours')::int))
  returning id into v_id;
  perform private.group_order_take(v_player, v_id, p_shares);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'orders', private.group_orders_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.group_order_create(uuid, text, int)');

create function public.group_order_join(p_request_id uuid, p_order bigint, p_shares int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'group_order_join');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'group_orders');
  perform private.rate_limit(v_player, 'group_order', private.cfg_num('rate.trade')::int, 60);
  perform private.group_order_take(v_player, p_order, p_shares);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'orders', private.group_orders_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.group_order_join(uuid, bigint, int)');

-- Out of an open order with the money back; the host leaving cancels it for everybody.
create function public.group_order_leave(p_request_id uuid, p_order bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'group_order_leave');
  o game.group_orders;
  s game.group_order_shares;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into o from game.group_orders where id = p_order for update;
  if not found or o.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if o.host_id = v_player then
    perform private.group_order_cancel(o.id);
  else
    delete from game.group_order_shares where order_id = o.id and player_id = v_player returning * into s;
    if not found then
      perform private.fail('not_found');
    end if;
    perform private.money_add(v_player, s.paid_cents, 'group_order_refund', o.id::text);
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'orders', private.group_orders_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.group_order_leave(uuid, bigint)');

-- Orders that do not fill up in time are cancelled and refunded.
create function private.tick_orders() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.group_orders where state = 'open' and expires_at <= private.now() order by id loop
    begin
      perform private.group_order_cancel(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('orders', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('orders', 600);
