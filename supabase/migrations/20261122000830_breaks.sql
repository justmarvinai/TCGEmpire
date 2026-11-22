-- alpha_08 (Freunde), part 4: Box Breaks (docs/GAME_DESIGN.md §16.1). A host puts up a display they own and sells
-- its packs as spots by pack number at a price near the booster's Marktwert. When the host starts, the server opens
-- every pack (same odds for everyone) and reveals them one by one on the server clock; each pack belongs to its
-- spot's buyer, unsold packs to the host. Buyers pay into escrow; the host is paid at the start. Spectators and
-- emotes as in Pack Battles.

create table game.breaks (
  id bigint generated always as identity primary key,
  host_id uuid references game.players (id) on delete cascade,
  product_id text not null references game.product_defs (id),
  booster_id text not null references game.product_defs (id),
  packs int not null,
  spot_cents bigint not null,
  state text not null default 'open' check (state in ('open', 'running', 'done', 'cancelled')),
  created_at timestamptz not null,
  started_at timestamptz,
  round_seconds int,
  ends_at timestamptz
);
create index breaks_host on game.breaks (host_id);
create index breaks_product on game.breaks (product_id);
create index breaks_booster on game.breaks (booster_id);
create index breaks_state on game.breaks (state, ends_at);

create table game.break_spots (
  break_id bigint not null references game.breaks (id) on delete cascade,
  spot int not null,
  player_id uuid references game.players (id) on delete set null,
  paid_cents bigint not null,
  primary key (break_id, spot)
);
create index break_spots_player on game.break_spots (player_id);

create table game.break_pulls (
  break_id bigint not null references game.breaks (id) on delete cascade,
  spot int not null,
  idx int not null,
  card_id text not null references game.card_defs (id),
  value_cents bigint not null,
  q smallint[],
  primary key (break_id, spot, idx)
);
create index break_pulls_card on game.break_pulls (card_id);

create table game.break_emotes (
  id bigint generated always as identity primary key,
  break_id bigint not null references game.breaks (id) on delete cascade,
  player_id uuid not null references game.players (id) on delete cascade,
  emote text not null,
  at timestamptz not null
);
create index break_emotes_break on game.break_emotes (break_id, id);
create index break_emotes_player on game.break_emotes (player_id);

alter table game.breaks enable row level security;
alter table game.break_spots enable row level security;
alter table game.break_pulls enable row level security;
alter table game.break_emotes enable row level security;

create function private.on_break_rt() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  perform private.rt_send('break:' || coalesce(v_row ->> 'break_id', v_row ->> 'id'), 'poke', jsonb_build_object('area', 'break'));
  if tg_table_name <> 'break_emotes' then
    perform private.rt_send('world', 'poke', jsonb_build_object('area', 'battles'));
  end if;
  return null;
end $$;
create trigger breaks_rt after insert or update on game.breaks for each row execute function private.on_break_rt();
create trigger break_spots_rt after insert or update on game.break_spots for each row execute function private.on_break_rt();
create trigger break_emotes_rt after insert on game.break_emotes for each row execute function private.on_break_rt();

-- Break channels join the private topics signed-in players may receive.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists tcge_receive on realtime.messages';
    execute $p$
      create policy tcge_receive on realtime.messages for select to authenticated
      using (
        realtime.messages.extension = 'broadcast'
        and (realtime.topic() = 'world' or realtime.topic() like 'player:%' or realtime.topic() like 'battle:%'
             or realtime.topic() like 'break:%')
      )
    $p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
-- Packs shown so far: pack n appears (n − 1) rounds after the start.
create function private.break_round(b game.breaks) returns int
language sql stable set search_path = '' as $$
  select case
    when b.started_at is null or private.now() < b.started_at then 0
    else least(b.packs, floor(extract(epoch from private.now() - b.started_at) / b.round_seconds)::int + 1)
  end
$$;

-- The booster price band for spots (Marktwert of the booster).
create function private.break_band(p_display text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'min_cents', private.product_value(d.contents ->> 'product') * private.cfg_num('break.min_price_bps')::bigint / 10000,
    'max_cents', private.product_value(d.contents ->> 'product') * private.cfg_num('break.max_price_bps')::bigint / 10000,
    'booster_cents', private.product_value(d.contents ->> 'product'))
  from game.product_defs d where d.id = p_display
$$;

create function private.break_summary(b game.breaks, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'product_id', b.product_id, 'packs', b.packs, 'spot_cents', b.spot_cents, 'state', b.state,
    'host_id', b.host_id, 'host_name', (select username from game.players where id = b.host_id),
    'started_at', b.started_at, 'ends_at', b.ends_at, 'round_seconds', b.round_seconds,
    'sold', (select count(*) from game.break_spots where break_id = b.id),
    'mine', (select count(*) from game.break_spots where break_id = b.id and player_id = p_player)
  )
$$;

create function private.break_doc(b game.breaks, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select private.break_summary(b, p_player) || jsonb_build_object(
    'round', private.break_round(b),
    'server_now', private.now(),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object('spot', s.spot, 'player_id', s.player_id, 'name', p.username, 'look', private.look(p)) order by s.spot)
      from game.break_spots s join game.players p on p.id = s.player_id where s.break_id = b.id
    ), '[]'::jsonb),
    'pulls', coalesce((
      select jsonb_agg(jsonb_build_object('spot', spot, 'card_id', card_id, 'value_cents', value_cents) order by spot, value_cents desc, idx)
      from game.break_pulls where break_id = b.id and spot <= private.break_round(b)
    ), '[]'::jsonb),
    'emotes', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'name', p.username, 'emote', e.emote, 'at', e.at) order by e.id)
      from (select * from game.break_emotes where break_id = b.id order by id desc limit 30) e
      join game.players p on p.id = e.player_id
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Engine
-- ---------------------------------------------------------------------------------------------
-- Refunds every spot and gives the display back.
create function private.break_cancel(p_break bigint) returns void
language plpgsql set search_path = '' as $$
declare
  b game.breaks;
  s record;
begin
  update game.breaks set state = 'cancelled' where id = p_break and state = 'open' returning * into b;
  if not found then
    return;
  end if;
  for s in select * from game.break_spots where break_id = b.id and player_id is not null order by spot loop
    perform private.money_add(s.player_id, s.paid_cents, 'break_refund', b.id::text);
  end loop;
  if b.host_id is not null then
    perform private.sealed_add(b.host_id, b.product_id, 1);
  end if;
end $$;

-- The packs go to their owners once the last one has been shown.
create function private.break_settle(p_break bigint) returns void
language plpgsql set search_path = '' as $$
declare
  b game.breaks;
  r record;
  v_to uuid;
  v_name text;
begin
  select * into b from game.breaks where id = p_break and state = 'running' and ends_at <= private.now() for update skip locked;
  if not found then
    return;
  end if;
  for r in select p.*, d.tier from game.break_pulls p join game.card_defs d on d.id = p.card_id
           where p.break_id = b.id order by p.spot, p.idx loop
    v_to := coalesce((select player_id from game.break_spots where break_id = b.id and spot = r.spot), b.host_id);
    if v_to is null then
      continue;
    end if;
    if r.q is not null then
      insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
      values (v_to, r.card_id, r.q[1], r.q[2], r.q[3], r.q[4], private.now());
    else
      perform private.stack_add(v_to, r.card_id, 1);
    end if;
    insert into game.collection (player_id, card_id, first_at) values (v_to, r.card_id, private.now()) on conflict do nothing;
    if found then
      perform private.ep_grant(v_to, private.cfg_num('ep.new_card'));
      perform private.emit(v_to, 'card_new');
    end if;
    update game.players set best_pull_card = r.card_id, best_pull_cents = r.value_cents
    where id = v_to and best_pull_cents < r.value_cents;
    if r.tier in ('ultra', 'grail') then
      select username into v_name from game.players where id = v_to;
      perform private.emit(v_to, 'pulled_' || r.tier);
      perform private.feed_add('pull_' || r.tier, jsonb_build_object('name', v_name, 'card_id', r.card_id));
    end if;
  end loop;
  update game.breaks set state = 'done' where id = b.id;
  for v_to in select distinct coalesce(s.player_id, b.host_id) from generate_series(1, b.packs) g
              left join game.break_spots s on s.break_id = b.id and s.spot = g where coalesce(s.player_id, b.host_id) is not null loop
    perform private.notify(v_to, 'break_done', jsonb_build_object('break', b.id, 'product_id', b.product_id,
      'packs', (select count(*) from generate_series(1, b.packs) g left join game.break_spots s on s.break_id = b.id and s.spot = g
                where coalesce(s.player_id, b.host_id) = v_to),
      'cents', (select coalesce(sum(p.value_cents), 0) from game.break_pulls p left join game.break_spots s on s.break_id = b.id and s.spot = p.spot
                where p.break_id = b.id and coalesce(s.player_id, b.host_id) = v_to)));
  end loop;
end $$;

-- Battles and breaks share their tick.
create or replace function private.tick_battles() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.battles where state = 'running' and ends_at <= private.now() order by ends_at limit 100 loop
    begin
      perform private.battle_settle(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('battles', private.now(), 0, false, sqlerrm);
    end;
  end loop;
  for v_id in select id from game.battles where state = 'open' and created_at < private.now() - interval '1 day' loop
    begin
      perform private.battle_cancel(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('battles', private.now(), 0, false, sqlerrm);
    end;
  end loop;
  for v_id in select id from game.breaks where state = 'running' and ends_at <= private.now() order by ends_at limit 100 loop
    begin
      perform private.break_settle(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('breaks', private.now(), 0, false, sqlerrm);
    end;
  end loop;
  for v_id in select id from game.breaks where state = 'open' and created_at < private.now() - interval '1 day' loop
    begin
      perform private.break_cancel(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('breaks', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function public.breaks_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.breaks')::int,
    'displays', coalesce((select jsonb_agg(jsonb_build_object('product_id', s.product_id, 'qty', s.qty) || private.break_band(s.product_id)
                                           order by s.product_id)
                          from game.sealed s join game.product_defs d on d.id = s.product_id
                          where s.player_id = v_player and s.qty > 0 and d.kind = 'display'), '[]'::jsonb),
    'open', coalesce((select jsonb_agg(private.break_summary(b, v_player) order by b.created_at desc)
                      from game.breaks b where b.state = 'open'), '[]'::jsonb),
    'running', coalesce((select jsonb_agg(private.break_summary(b, v_player) order by b.started_at desc)
                         from game.breaks b where b.state = 'running'), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(x.s order by x.ends_at desc) from (
                        select private.break_summary(b, v_player) as s, b.ends_at from game.breaks b
                        where b.state = 'done' order by b.ends_at desc limit 5) x), '[]'::jsonb)
  );
end $$;
select private.expose('public.breaks_get()');

create function public.break_get(p_break bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  b game.breaks;
begin
  perform private.break_settle(p_break);
  select * into b from game.breaks where id = p_break;
  if not found then
    perform private.fail('not_found');
  end if;
  return private.break_doc(b, v_player);
end $$;
select private.expose('public.break_get(bigint)');

-- The display leaves the host's shelf at once; it comes back if the break is called off.
create function public.break_create(p_request_id uuid, p_product text, p_spot_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'break_create');
  v_contents jsonb;
  v_band jsonb;
  v_id bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'breaks');
  perform private.rate_limit(v_player, 'battle', private.cfg_num('rate.battle')::int, 60);
  select contents into v_contents from game.product_defs where id = p_product and kind = 'display';
  v_band := private.break_band(p_product);
  if v_contents is null or p_spot_cents is null
     or p_spot_cents not between (v_band ->> 'min_cents')::bigint and (v_band ->> 'max_cents')::bigint then
    perform private.fail('invalid_request');
  end if;
  update game.sealed set qty = qty - 1 where player_id = v_player and product_id = p_product and qty >= 1;
  if not found then
    perform private.fail('not_enough_sealed');
  end if;
  insert into game.breaks (host_id, product_id, booster_id, packs, spot_cents, created_at)
  values (v_player, p_product, v_contents ->> 'product', (v_contents ->> 'qty')::int, p_spot_cents, private.now())
  returning id into v_id;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'break', private.break_doc((select b from game.breaks b where b.id = v_id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.break_create(uuid, text, bigint)');

create function public.break_buy(p_request_id uuid, p_break bigint, p_spot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'break_buy');
  b game.breaks;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'breaks');
  select * into b from game.breaks where id = p_break for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if b.host_id = v_player or p_spot is null or p_spot not between 1 and b.packs then
    perform private.fail('invalid_request');
  end if;
  if exists (select 1 from game.break_spots where break_id = b.id and spot = p_spot) then
    perform private.fail('spot_taken');
  end if;
  perform private.money_add(v_player, -b.spot_cents, 'break_spot', b.id::text);
  insert into game.break_spots (break_id, spot, player_id, paid_cents) values (b.id, p_spot, v_player, b.spot_cents);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'break', private.break_doc((select x from game.breaks x where x.id = b.id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.break_buy(uuid, bigint, int)');

-- The host calls it off: money back, display back.
create function public.break_cancel(p_request_id uuid, p_break bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'break_cancel');
  b game.breaks;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into b from game.breaks where id = p_break for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if b.host_id <> v_player then
    perform private.fail('forbidden');
  end if;
  perform private.break_cancel(b.id);
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.break_cancel(uuid, bigint)');

-- The host starts: every pack is opened now and shown one by one; the host gets the money of the sold spots.
create function public.break_start(p_request_id uuid, p_break bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'break_start');
  b game.breaks;
  v_cards text[];
  v_card text;
  v_tier text;
  v_sold bigint;
  g int;
  i int;
  r record;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into b from game.breaks where id = p_break for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if b.host_id <> v_player then
    perform private.fail('forbidden');
  end if;
  for g in 1 .. b.packs loop
    v_cards := private.roll_pack(null, b.booster_id);
    i := 0;
    foreach v_card in array v_cards loop
      i := i + 1;
      select tier into v_tier from game.card_defs where id = v_card;
      insert into game.break_pulls (break_id, spot, idx, card_id, value_cents, q)
      values (b.id, g, i, v_card, private.card_value(v_card),
              case when v_tier in ('holo', 'alternative', 'ultra', 'grail')
                   then array[private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality()] end);
    end loop;
  end loop;
  v_sold := (select coalesce(sum(paid_cents), 0) from game.break_spots where break_id = b.id);
  if v_sold > 0 then
    perform private.money_add(v_player, v_sold, 'break_sales', b.id::text);
  end if;
  perform private.ep_grant(v_player, private.cfg_num('ep.pack') * (b.packs - (select count(*) from game.break_spots where break_id = b.id)));
  perform private.emit(v_player, 'break_hosted');
  perform private.emit(v_player, 'pack_opened', b.packs - (select count(*) from game.break_spots where break_id = b.id));
  for r in select player_id, count(*)::int as n from game.break_spots where break_id = b.id and player_id is not null group by player_id loop
    perform private.ep_grant(r.player_id, private.cfg_num('ep.pack') * r.n);
    perform private.emit(r.player_id, 'pack_opened', r.n);
  end loop;
  update game.breaks set
    state = 'running',
    started_at = private.now() + make_interval(secs => private.cfg_num('battle.lead_seconds')),
    round_seconds = private.cfg_num('break.round_seconds')::int,
    ends_at = private.now() + make_interval(secs => private.cfg_num('battle.lead_seconds') + b.packs * private.cfg_num('break.round_seconds'))
  where id = b.id;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'break', private.break_doc((select x from game.breaks x where x.id = b.id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.break_start(uuid, bigint)');

create function public.break_emote_send(p_request_id uuid, p_break bigint, p_emote text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'break_emote_send');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'emote', private.cfg_num('rate.emote')::int, 60);
  if not private.cfg('battle.emotes') ? p_emote or not exists (select 1 from game.breaks where id = p_break and state in ('open', 'running', 'done')) then
    perform private.fail('invalid_request');
  end if;
  insert into game.break_emotes (break_id, player_id, emote, at) values (p_break, v_player, p_emote, private.now());
  return private.request_done(v_player, p_request_id, jsonb_build_object('ok', true));
end $$;
select private.expose('public.break_emote_send(uuid, bigint, text)');
