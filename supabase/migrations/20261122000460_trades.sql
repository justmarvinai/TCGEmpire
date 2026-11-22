-- alpha_04 (Flip), part 7: Direkthandel and gifts (docs/GAME_DESIGN.md §7, §16.1; ECONOMY.md §12).
-- A trade offer names what each side gives; the other player accepts or declines, the offerer can take it
-- back. Nothing is reserved while an offer is open: on acceptance both sides must still own their part.
-- Value that moves one way without equal value back is a gift: free up to a daily allowance by level,
-- above it the giver pays Schenkungssteuer. Fresh and freshly reset accounts cannot trade or gift for an hour.
-- Goods: {"money_cents": n, "items": [{"kind": "card"|"copy"|"sealed", "item_id": "...", "copy_id": uuid?, "qty": n}]}

create table game.trades (
  id bigint generated always as identity primary key,
  from_id uuid not null references game.players (id) on delete cascade,
  to_id uuid not null references game.players (id) on delete cascade,
  give jsonb not null,
  take jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check (from_id <> to_id)
);
create index trades_from on game.trades (from_id);
create index trades_to on game.trades (to_id);

create table game.gift_days (
  player_id uuid not null references game.players (id) on delete cascade,
  day date not null,
  given_cents bigint not null default 0,
  primary key (player_id, day)
);

alter table game.trades enable row level security;
alter table game.gift_days enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Goods
-- ---------------------------------------------------------------------------------------------

-- Checks the shape and returns the goods in a clean form (unknown items, hits as stacks, bad
-- quantities, too many entries: invalid_request).
create function private.goods_clean(p_goods jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_money bigint;
  v_items jsonb := coalesce(p_goods -> 'items', '[]'::jsonb);
  i jsonb;
  v_out jsonb := '[]'::jsonb;
begin
  if p_goods is null or jsonb_typeof(p_goods) <> 'object' or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) > private.cfg_num('trade.max_items') then
    perform private.fail('invalid_request');
  end if;
  begin
    v_money := coalesce((p_goods ->> 'money_cents')::bigint, 0);
  exception when others then
    perform private.fail('invalid_request');
  end;
  if v_money < 0 then
    perform private.fail('invalid_request');
  end if;
  for i in select * from jsonb_array_elements(v_items) loop
    if i ->> 'kind' = 'card' and (i ->> 'qty') ~ '^[1-9][0-9]{0,5}$'
       and exists (select 1 from game.card_defs where id = i ->> 'item_id') and not private.is_hit(i ->> 'item_id') then
      v_out := v_out || jsonb_build_object('kind', 'card', 'item_id', i ->> 'item_id', 'qty', (i ->> 'qty')::int);
    elsif i ->> 'kind' = 'sealed' and (i ->> 'qty') ~ '^[1-9][0-9]{0,5}$'
       and exists (select 1 from game.product_defs where id = i ->> 'item_id') then
      v_out := v_out || jsonb_build_object('kind', 'sealed', 'item_id', i ->> 'item_id', 'qty', (i ->> 'qty')::int);
    elsif i ->> 'kind' = 'copy' and (i ->> 'copy_id') ~ '^[0-9a-f-]{36}$' then
      v_out := v_out || (
        select jsonb_build_object('kind', 'copy', 'item_id', c.card_id, 'copy_id', c.id, 'qty', 1)
        from game.card_copies c where c.id = (i ->> 'copy_id')::uuid
      );
      if v_out is null then
        perform private.fail('not_owned');
      end if;
    else
      perform private.fail('invalid_request');
    end if;
  end loop;
  return jsonb_build_object('money_cents', v_money, 'items', v_out);
end $$;

-- Marktwert of goods (hits at their ungraded value) plus the money.
create function private.goods_value(p_goods jsonb) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (p_goods ->> 'money_cents')::numeric + coalesce((
    select sum(private.card_or_product_value(i ->> 'item_id') * (i ->> 'qty')::int)
    from jsonb_array_elements(p_goods -> 'items') i
  ), 0))::bigint
$$;

-- Does the player own all of it right now (cash, stacks, sealed, hits in the inventory)?
create function private.goods_owned(p_player uuid, p_goods jsonb) returns boolean
language sql stable set search_path = '' as $$
  select (select cash_cents from game.players where id = p_player) >= (p_goods ->> 'money_cents')::bigint
    and not exists (
      select 1 from (
        select i ->> 'kind' as kind, i ->> 'item_id' as item_id, sum((i ->> 'qty')::int) as qty
        from jsonb_array_elements(p_goods -> 'items') i
        where i ->> 'kind' in ('card', 'sealed')
        group by 1, 2
      ) w
      where w.qty > coalesce(case w.kind
        when 'card' then (select qty from game.card_stacks where player_id = p_player and card_id = w.item_id)
        else (select qty from game.sealed where player_id = p_player and product_id = w.item_id)
      end, 0)
    )
    and (
      select count(distinct i ->> 'copy_id') from jsonb_array_elements(p_goods -> 'items') i where i ->> 'kind' = 'copy'
    ) = (
      select count(*) from game.card_copies c
      where c.owner_id = p_player and c.location = 'inventory'
        and c.id in (select (i ->> 'copy_id')::uuid from jsonb_array_elements(p_goods -> 'items') i where i ->> 'kind' = 'copy')
    )
    and (
      select count(*) from jsonb_array_elements(p_goods -> 'items') i where i ->> 'kind' = 'copy'
    ) = (
      select count(distinct i ->> 'copy_id') from jsonb_array_elements(p_goods -> 'items') i where i ->> 'kind' = 'copy'
    )
$$;

create function private.goods_empty(p_goods jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select (p_goods ->> 'money_cents')::bigint = 0 and jsonb_array_length(p_goods -> 'items') = 0
$$;

-- Moves goods from one player to the other (ownership checked before).
create function private.goods_move(p_from uuid, p_to uuid, p_goods jsonb, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare
  v_money bigint := (p_goods ->> 'money_cents')::bigint;
  i jsonb;
begin
  if v_money > 0 then
    perform private.money_add(p_from, -v_money, p_reason, p_to::text);
    perform private.money_add(p_to, v_money, p_reason, p_from::text);
  end if;
  for i in select * from jsonb_array_elements(p_goods -> 'items') loop
    perform private.item_take(p_from, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int, 'inventory');
    perform private.item_give(p_to, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int);
  end loop;
end $$;

-- Goods for display: items with their value each.
create function private.goods_doc(p_goods jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'money_cents', (p_goods ->> 'money_cents')::bigint,
    'items', coalesce((
      select jsonb_agg(i || jsonb_build_object('value_cents', private.card_or_product_value(i ->> 'item_id')))
      from jsonb_array_elements(p_goods -> 'items') i
    ), '[]'::jsonb),
    'value_cents', private.goods_value(p_goods)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Gift allowance, Schenkungssteuer, trade lock
-- ---------------------------------------------------------------------------------------------
create function private.gift_allowance_left(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, private.eur(private.cfg_num('gift.allowance_base_cents_per_level') * p.level)
    - coalesce((select given_cents from game.gift_days where player_id = p.id and day = private.today()), 0))
  from game.players p where p.id = p_player
$$;

create function private.gift_tax(p_player uuid, p_gift bigint) returns bigint
language sql stable set search_path = '' as $$
  select round(greatest(0, p_gift - private.gift_allowance_left(p_player)) * private.cfg_num('gift.tax_bps') / 10000)::bigint
$$;

-- Books a gift against today's allowance; the giver pays the tax on what is above it. Returns the tax.
create function private.gift_book(p_player uuid, p_gift bigint) returns bigint
language plpgsql set search_path = '' as $$
declare
  v_tax bigint;
begin
  if p_gift <= 0 then
    return 0;
  end if;
  v_tax := private.gift_tax(p_player, p_gift);
  if v_tax > 0 then
    perform private.money_add(p_player, -v_tax, 'gift_tax');
  end if;
  insert into game.gift_days (player_id, day, given_cents) values (p_player, private.today(), p_gift)
  on conflict (player_id, day) do update set given_cents = game.gift_days.given_cents + excluded.given_cents;
  return v_tax;
end $$;

-- Until when a fresh or freshly reset account may not trade or gift.
create function private.trade_lock_until(r game.players) returns timestamptz
language sql stable set search_path = '' as $$
  select greatest(r.created_at, coalesce(r.reset_at, r.created_at)) + make_interval(mins => private.cfg_num('trade.lock_minutes')::int)
$$;

-- Both players exist, differ, and are past the lock; p_level: both need the Direkthandel level.
create function private.trade_check(p_me uuid, p_other uuid, p_level boolean) returns void
language plpgsql stable set search_path = '' as $$
declare
  me game.players;
  other game.players;
begin
  select * into me from game.players where id = p_me;
  select * into other from game.players where id = p_other;
  if other.id is null or other.id = me.id then
    perform private.fail('invalid_request');
  end if;
  perform private.require_level(p_me, 'trade');
  if private.trade_lock_until(me) > private.now() then
    perform private.fail('trade_locked');
  end if;
  if private.trade_lock_until(other) > private.now()
     or (p_level and other.level < private.cfg_num('unlock.trade')) then
    perform private.fail('partner_locked');
  end if;
end $$;

-- Locks two players in a fixed order (by id) before money and items move.
create function private.lock_pair(p_a uuid, p_b uuid) returns void
language sql set search_path = '' as $$
  select 1 from game.players where id in (p_a, p_b) order by id for update
$$;

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
create function private.trades_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'allowance_left_cents', private.gift_allowance_left(p_player),
    'allowance_cents', (select private.eur(private.cfg_num('gift.allowance_base_cents_per_level') * level) from game.players where id = p_player),
    'tax_bps', private.cfg_num('gift.tax_bps')::int,
    'locked_until', (select private.trade_lock_until(p) from game.players p where p.id = p_player),
    'unlock_level', private.cfg_num('unlock.trade')::int,
    'open', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'mine', t.from_id = p_player,
        'from', jsonb_build_object('id', f.id, 'name', f.username),
        'to', jsonb_build_object('id', o.id, 'name', o.username),
        'give', private.goods_doc(t.give),
        'take', private.goods_doc(t.take),
        -- the tax the caller would pay if it went through now (only the side that gives more pays)
        'my_tax_cents', private.gift_tax(p_player, greatest(0,
          case when t.from_id = p_player then private.goods_value(t.give) - private.goods_value(t.take)
               else private.goods_value(t.take) - private.goods_value(t.give) end)),
        'created_at', t.created_at,
        'expires_at', t.expires_at
      ) order by t.created_at desc), '[]'::jsonb)
      from game.trades t
      join game.players f on f.id = t.from_id
      join game.players o on o.id = t.to_id
      where (t.from_id = p_player or t.to_id = p_player) and t.expires_at > private.now()
    )
  )
$$;

-- Everybody on the server with presence and whether trading with them works right now.
create function public.players_get() returns jsonb
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
      'is_admin', p.is_admin
    ) order by p.last_seen_at desc), '[]'::jsonb)
    from game.players p
  ), 'trades', private.trades_doc(v_player));
end $$;
select private.expose('public.players_get()');

-- What a player could hand over: stacks, hits in the inventory, sealed.
create function public.trade_inventory(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := private.require_player();
begin
  if not exists (select 1 from game.players where id = p_player) then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(x order by x ->> 'item_id', x ->> 'copy_id'), '[]'::jsonb) from (
      select jsonb_build_object('kind', 'card', 'item_id', card_id, 'copy_id', null, 'qty', qty, 'value_cents', private.card_value(card_id)) as x
      from game.card_stacks where player_id = p_player and qty > 0
      union all
      select jsonb_build_object('kind', 'copy', 'item_id', card_id, 'copy_id', id, 'qty', 1, 'value_cents', private.card_value(card_id))
      from game.card_copies where owner_id = p_player and location = 'inventory'
      union all
      select jsonb_build_object('kind', 'sealed', 'item_id', product_id, 'copy_id', null, 'qty', qty, 'value_cents', private.product_value(product_id))
      from game.sealed where player_id = p_player and qty > 0
    ) s
  ), 'cash_cents', case when p_player = v_me then (select cash_cents from game.players where id = v_me) end);
end $$;
select private.expose('public.trade_inventory(uuid)');

-- Value of both sides and the Schenkungssteuer each side would pay now (gifts: p_take empty).
create function public.trade_quote(p_to uuid, p_give jsonb, p_take jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_give jsonb := private.goods_clean(p_give);
  v_take jsonb := private.goods_clean(coalesce(p_take, '{}'::jsonb));
  v_give_cents bigint := private.goods_value(v_give);
  v_take_cents bigint := private.goods_value(v_take);
begin
  if not exists (select 1 from game.players where id = p_to and id <> v_player) then
    perform private.fail('invalid_request');
  end if;
  return jsonb_build_object(
    'give_cents', v_give_cents,
    'take_cents', v_take_cents,
    'my_tax_cents', private.gift_tax(v_player, greatest(0, v_give_cents - v_take_cents)),
    'their_tax_cents', private.gift_tax(p_to, greatest(0, v_take_cents - v_give_cents)),
    'allowance_left_cents', private.gift_allowance_left(v_player)
  );
end $$;
select private.expose('public.trade_quote(uuid, jsonb, jsonb)');

-- ---------------------------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------------------------
create function public.gift_send(p_request_id uuid, p_to uuid, p_goods jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'gift_send');
  v_goods jsonb;
  v_value bigint;
  v_tax bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  perform private.trade_check(v_player, p_to, false);
  v_goods := private.goods_clean(p_goods);
  if private.goods_empty(v_goods) then
    perform private.fail('invalid_request');
  end if;
  perform private.lock_pair(v_player, p_to);
  if not private.goods_owned(v_player, v_goods) then
    perform private.fail('not_owned');
  end if;
  v_value := private.goods_value(v_goods);
  v_tax := private.gift_book(v_player, v_value);
  perform private.goods_move(v_player, p_to, v_goods, 'gift');
  perform private.notify(p_to, 'gift_received', jsonb_build_object(
    'name', (select username from game.players where id = v_player), 'cents', v_value));
  perform private.emit(v_player, 'gift_sent');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'value_cents', v_value, 'tax_cents', v_tax, 'trades', private.trades_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.gift_send(uuid, uuid, jsonb)');

create function public.trade_offer(p_request_id uuid, p_to uuid, p_give jsonb, p_take jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'trade_offer');
  v_give jsonb;
  v_take jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  perform private.trade_check(v_player, p_to, true);
  v_give := private.goods_clean(p_give);
  v_take := private.goods_clean(p_take);
  if private.goods_empty(v_give) and private.goods_empty(v_take) then
    perform private.fail('invalid_request');
  end if;
  if not private.goods_owned(v_player, v_give) then
    perform private.fail('not_owned');
  end if;
  if not private.goods_owned(p_to, v_take) then
    perform private.fail('trade_invalid');
  end if;
  delete from game.trades where from_id = v_player and expires_at <= private.now();
  if (select count(*) from game.trades where from_id = v_player) >= private.cfg_num('trade.max_open') then
    perform private.fail('no_slots');
  end if;
  insert into game.trades (from_id, to_id, give, take, created_at, expires_at)
  values (v_player, p_to, v_give, v_take, private.now(), private.now() + make_interval(hours => private.cfg_num('trade.expiry_hours')::int));
  perform private.notify(p_to, 'trade_offer', jsonb_build_object('name', (select username from game.players where id = v_player)));
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'trades', private.trades_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.trade_offer(uuid, uuid, jsonb, jsonb)');

-- The receiver accepts or declines; the offerer can only take the offer back (p_accept = false).
create function public.trade_answer(p_request_id uuid, p_trade bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'trade_answer');
  t game.trades;
  v_give bigint;
  v_take bigint;
  v_tax bigint := 0;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  select * into t from game.trades
  where id = p_trade and (from_id = v_player or to_id = v_player) and expires_at > private.now()
  for update;
  if not found or (t.from_id = v_player and p_accept) then
    perform private.fail('not_found');
  end if;

  if p_accept then
    perform private.trade_check(v_player, t.from_id, true);
    perform private.lock_pair(t.from_id, t.to_id);
    if not private.goods_owned(t.from_id, t.give) then
      perform private.fail('trade_invalid');
    end if;
    if not private.goods_owned(t.to_id, t.take) then
      perform private.fail('not_owned');
    end if;
    v_give := private.goods_value(t.give);
    v_take := private.goods_value(t.take);
    -- the side that hands over more value gifts the difference; the offerer must still afford money and tax
    if (select cash_cents from game.players where id = t.from_id)
       < (t.give ->> 'money_cents')::bigint + private.gift_tax(t.from_id, greatest(0, v_give - v_take)) then
      perform private.fail('trade_invalid');
    end if;
    perform private.gift_book(t.from_id, v_give - v_take);
    v_tax := private.gift_book(t.to_id, v_take - v_give);
    perform private.goods_move(t.from_id, t.to_id, t.give, 'trade');
    perform private.goods_move(t.to_id, t.from_id, t.take, 'trade');
    perform private.emit(t.from_id, 'trade_done');
    perform private.emit(t.to_id, 'trade_done');
  end if;
  delete from game.trades where id = t.id;
  if t.to_id = v_player then
    perform private.notify(t.from_id, case when p_accept then 'trade_accepted' else 'trade_declined' end,
      jsonb_build_object('name', (select username from game.players where id = v_player)));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'tax_cents', v_tax, 'trades', private.trades_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.trade_answer(uuid, bigint, boolean)');

-- A reset ends open offers in both directions and the day's gift record.
create function private.on_player_reset_trades() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.trades where from_id = new.id or to_id = new.id;
    delete from game.gift_days where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_trades after update of reset_at on game.players
  for each row execute function private.on_player_reset_trades();
