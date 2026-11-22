-- alpha_04 (Flip), part 2: Cardmarket (docs/GAME_DESIGN.md §7.3). Fixed-price listings and buy orders
-- ("Gesuche"). A sale ships for a short while; on arrival the buyer gets the item and the seller the money
-- minus the fee. NPC traders (part 3) use the same tables through npc_id.

-- Hits that are listed or travelling stay out of the binder and the Ankauf.
alter table game.card_copies add column location text not null default 'inventory'
  check (location in ('inventory', 'listed', 'shipping'));

create table game.listings (
  id bigint generated always as identity primary key,
  seller_id uuid references game.players (id) on delete cascade,
  npc_id text,
  item_kind text not null check (item_kind in ('card', 'copy', 'sealed')),
  item_id text not null,
  copy_id uuid references game.card_copies (id) on delete cascade,
  qty int not null check (qty > 0),
  price_cents bigint not null check (price_cents > 0),
  created_at timestamptz not null,
  check ((seller_id is null) <> (npc_id is null)),
  check ((item_kind = 'copy') = (copy_id is not null))
);
create index listings_item on game.listings (item_id, price_cents);
create index listings_seller on game.listings (seller_id);
create index listings_copy on game.listings (copy_id);

create table game.buy_orders (
  id bigint generated always as identity primary key,
  buyer_id uuid references game.players (id) on delete cascade,
  npc_id text,
  item_kind text not null check (item_kind in ('card', 'sealed')),
  item_id text not null,
  qty int not null check (qty > 0),
  price_cents bigint not null check (price_cents > 0),
  created_at timestamptz not null,
  check ((buyer_id is null) <> (npc_id is null))
);
create index buy_orders_item on game.buy_orders (item_id, price_cents desc);
create index buy_orders_buyer on game.buy_orders (buyer_id);

create table game.shipments (
  id bigint generated always as identity primary key,
  buyer_id uuid references game.players (id) on delete cascade,
  seller_id uuid references game.players (id) on delete set null,
  npc_buyer text,
  npc_seller text,
  item_kind text not null check (item_kind in ('card', 'copy', 'sealed')),
  item_id text not null,
  copy_id uuid references game.card_copies (id) on delete cascade,
  qty int not null check (qty > 0),
  total_cents bigint not null,
  fee_cents bigint not null,
  arrives_at timestamptz not null,
  created_at timestamptz not null
);
create index shipments_buyer on game.shipments (buyer_id);
create index shipments_seller on game.shipments (seller_id);
create index shipments_copy on game.shipments (copy_id);
create index shipments_arrives on game.shipments (arrives_at);

create table game.sales_log (
  id bigint generated always as identity primary key,
  item_id text not null,
  qty int not null,
  price_cents bigint not null,
  at timestamptz not null
);
create index sales_log_item on game.sales_log (item_id, at desc);

alter table game.listings enable row level security;
alter table game.buy_orders enable row level security;
alter table game.shipments enable row level security;
alter table game.sales_log enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Inventory helpers
-- ---------------------------------------------------------------------------------------------
create function private.stack_add(p_player uuid, p_card text, p_qty int) returns void
language sql set search_path = '' as $$
  insert into game.card_stacks (player_id, card_id, qty) values (p_player, p_card, p_qty)
  on conflict (player_id, card_id) do update set qty = game.card_stacks.qty + excluded.qty
$$;

create function private.is_hit(p_card text) returns boolean
language sql stable set search_path = '' as $$
  select tier in ('holo', 'alternative', 'ultra', 'grail') from game.card_defs where id = p_card
$$;

-- Takes items out of a player's inventory (into a listing or a parcel). Fails with not_owned.
create function private.item_take(p_player uuid, p_kind text, p_item text, p_copy uuid, p_qty int, p_location text) returns void
language plpgsql set search_path = '' as $$
begin
  if p_kind = 'card' then
    update game.card_stacks set qty = qty - p_qty where player_id = p_player and card_id = p_item and qty >= p_qty;
    if not found then
      perform private.fail('not_owned');
    end if;
    delete from game.card_stacks where player_id = p_player and card_id = p_item and qty = 0;
  elsif p_kind = 'sealed' then
    update game.sealed set qty = qty - p_qty where player_id = p_player and product_id = p_item and qty >= p_qty;
    if not found then
      perform private.fail('not_owned');
    end if;
  elsif p_kind = 'copy' then
    update game.card_copies set location = p_location
    where id = p_copy and owner_id = p_player and card_id = p_item and location = 'inventory';
    if not found then
      perform private.fail('not_owned');
    end if;
  else
    perform private.fail('invalid_request');
  end if;
end $$;

-- Puts items into a player's inventory; bought cards count for the binder like pulled ones.
create function private.item_give(p_player uuid, p_kind text, p_item text, p_copy uuid, p_qty int) returns void
language plpgsql set search_path = '' as $$
begin
  if p_kind = 'sealed' then
    perform private.sealed_add(p_player, p_item, p_qty);
    return;
  end if;
  if p_kind = 'card' then
    perform private.stack_add(p_player, p_item, p_qty);
  else
    update game.card_copies set owner_id = p_player, location = 'inventory' where id = p_copy;
  end if;
  insert into game.collection (player_id, card_id, first_at) values (p_player, p_item, private.now())
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Sales and parcels
-- ---------------------------------------------------------------------------------------------
-- A sale is decided: the item travels to the buyer, the money waits for the arrival.
create function private.sale_ship(
  p_seller uuid, p_npc_seller text, p_buyer uuid, p_npc_buyer text,
  p_kind text, p_item text, p_copy uuid, p_qty int, p_total bigint
) returns void
language plpgsql set search_path = '' as $$
declare
  v_copy uuid := p_copy;
  v_minutes numeric := private.cfg_num('market.ship_min_minutes')
    + private.rand() * (private.cfg_num('market.ship_max_minutes') - private.cfg_num('market.ship_min_minutes'));
begin
  if p_kind = 'copy' then
    if p_buyer is not null then
      update game.card_copies set owner_id = p_buyer, location = 'shipping' where id = p_copy;
    else
      delete from game.card_copies where id = p_copy;  -- NPCs keep what they buy; it leaves the world
      v_copy := null;
    end if;
  end if;
  insert into game.shipments (buyer_id, seller_id, npc_buyer, npc_seller, item_kind, item_id, copy_id, qty,
                              total_cents, fee_cents, arrives_at, created_at)
  values (p_buyer, p_seller, p_npc_buyer, p_npc_seller, p_kind, p_item, v_copy, p_qty,
          p_total, round(p_total * private.cfg_num('market.fee_bps') / 10000), private.now() + make_interval(secs => v_minutes * 60), private.now());
  insert into game.sales_log (item_id, qty, price_cents, at) values (p_item, p_qty, p_total / p_qty, private.now());
  perform private.price_push(p_item, p_total / p_qty);
end $$;

-- A parcel arrives: the buyer gets the item, the seller the money minus the fee (the fee is gone).
create function private.shipment_deliver(p_id bigint) returns void
language plpgsql set search_path = '' as $$
declare
  s game.shipments;
begin
  delete from game.shipments where id = p_id returning * into s;
  if not found then
    return;
  end if;
  if s.buyer_id is not null then
    if s.item_kind = 'copy' then
      perform private.item_give(s.buyer_id, 'copy', s.item_id, s.copy_id, 1);
    else
      perform private.item_give(s.buyer_id, s.item_kind, s.item_id, null, s.qty);
    end if;
    perform private.notify(s.buyer_id, 'parcel_arrived', jsonb_build_object('item_id', s.item_id, 'qty', s.qty));
  end if;
  if s.seller_id is not null then
    perform private.money_add(s.seller_id, s.total_cents - s.fee_cents, 'market_sale', s.item_id);
    perform private.ep_grant(s.seller_id, private.cfg_num('ep.sale'));
    if s.item_kind <> 'sealed' then
      perform private.emit(s.seller_id, 'cards_sold', s.qty);
    end if;
    perform private.notify(s.seller_id, 'sale_paid',
      jsonb_build_object('item_id', s.item_id, 'qty', s.qty, 'cents', s.total_cents - s.fee_cents));
  end if;
end $$;

create function private.tick_shipments() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.shipments where arrives_at <= private.now() order by arrives_at limit 500 loop
    begin
      perform private.shipment_deliver(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('shipments', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('shipments', 60);

create function private.market_slots(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('market.slots') + private.stat(p_player, 'listing_slots', 0))::int
$$;

create function private.card_or_product_value(p_item text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce((select value_cents from game.prices where item_id = p_item),
                  private.card_value(p_item), private.product_value(p_item))
$$;

-- Who is behind a listing or an order (players by name, NPCs by id until part 3 names them).
create function private.trader_doc(p_player uuid, p_npc text) returns jsonb
language sql stable set search_path = '' as $$
  select case when p_player is not null then
    (select jsonb_build_object('id', p.id::text, 'kind', 'player', 'name', p.username, 'ruf', p.ruf) from game.players p where p.id = p_player)
  else jsonb_build_object('id', p_npc, 'kind', 'npc', 'name', p_npc, 'ruf', 500) end
$$;

create function private.market_check_price(p_qty int, p_price bigint) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(p_qty, 0) < 1 or p_qty > 999 or coalesce(p_price, 0) < 1 or p_price > 100000000000 then
    perform private.fail('invalid_request');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
create function private.my_market_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_kind', item_kind, 'item_id', item_id,
      'qty', qty, 'price_cents', price_cents, 'value_cents', private.card_or_product_value(item_id)) order by created_at desc)
      from game.listings where seller_id = p_player), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_kind', item_kind, 'item_id', item_id,
      'qty', qty, 'price_cents', price_cents, 'value_cents', private.card_or_product_value(item_id)) order by created_at desc)
      from game.buy_orders where buyer_id = p_player), '[]'::jsonb),
    'parcels', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_id', item_id, 'qty', qty,
      'total_cents', total_cents, 'payout_cents', total_cents - fee_cents, 'arrives_at', arrives_at,
      'incoming', buyer_id is not distinct from p_player) order by arrives_at)
      from game.shipments where buyer_id = p_player or seller_id = p_player), '[]'::jsonb),
    'slots', private.market_slots(p_player),
    'used', (select count(*) from game.listings where seller_id = p_player) + (select count(*) from game.buy_orders where buyer_id = p_player)
  )
$$;

create function private.cardmarket_item_doc(p_player uuid, p_item text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'item_id', p_item,
    'kind', case when exists (select 1 from game.product_defs where id = p_item) then 'sealed' else 'card' end,
    'value_cents', private.card_or_product_value(p_item),
    'listings', coalesce((select jsonb_agg(x order by (x ->> 'price_cents')::bigint, (x ->> 'id')::bigint) from (
      select jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'qty', l.qty, 'price_cents', l.price_cents,
        'seller', private.trader_doc(l.seller_id, l.npc_id), 'mine', l.seller_id is not distinct from p_player) as x
      from game.listings l where l.item_id = p_item order by l.price_cents, l.id limit 30) q), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(x order by (x ->> 'price_cents')::bigint desc, (x ->> 'id')::bigint) from (
      select jsonb_build_object('id', o.id, 'qty', o.qty, 'price_cents', o.price_cents,
        'buyer', private.trader_doc(o.buyer_id, o.npc_id), 'mine', o.buyer_id is not distinct from p_player) as x
      from game.buy_orders o where o.item_id = p_item order by o.price_cents desc, o.id limit 30) q), '[]'::jsonb),
    'sales', coalesce((select jsonb_agg(jsonb_build_object('qty', qty, 'price_cents', price_cents, 'at', at) order by at desc)
      from (select * from game.sales_log where item_id = p_item order by at desc limit 10) s), '[]'::jsonb),
    'owned', jsonb_build_object(
      'qty', coalesce((select qty from game.card_stacks where player_id = p_player and card_id = p_item), 0)
           + coalesce((select qty from game.sealed where player_id = p_player and product_id = p_item), 0),
      'copies', coalesce((select jsonb_agg(id order by pulled_at) from game.card_copies
                          where owner_id = p_player and card_id = p_item and location = 'inventory'), '[]'::jsonb)
    )
  )
$$;

create function public.cardmarket_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'unlocked', (select level from game.players where id = v_player) >= private.cfg_num('unlock.cardmarket'),
    'unlock_level', private.cfg_num('unlock.cardmarket'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', p.item_id, 'kind', p.kind, 'value_cents', p.value_cents,
        'change_pct', case when coalesce(p.day_open_cents, 0) > 0 then round(100.0 * (p.value_cents - p.day_open_cents) / p.day_open_cents, 1) else 0 end,
        'offers', coalesce(l.n, 0), 'from_cents', l.lo, 'best_order_cents', o.hi
      ) order by p.item_id)
      from game.prices p
      left join (select item_id, sum(qty)::int as n, min(price_cents) as lo from game.listings group by item_id) l on l.item_id = p.item_id
      left join (select item_id, max(price_cents) as hi from game.buy_orders group by item_id) o on o.item_id = p.item_id
    ), '[]'::jsonb),
    'mine', private.my_market_doc(v_player)
  );
end $$;
select private.expose('public.cardmarket_get()');

create function public.cardmarket_item(p_item text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  if not exists (select 1 from game.card_defs where id = p_item) and not exists (select 1 from game.product_defs where id = p_item) then
    perform private.fail('not_found');
  end if;
  return private.cardmarket_item_doc(v_player, p_item);
end $$;
select private.expose('public.cardmarket_item(text)');

-- A seller's shop window: name, Ruf and everything they offer.
create function public.seller_get(p_seller text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_id uuid;
begin
  if p_seller ~ '^[0-9a-f-]{36}$' then
    v_id := p_seller::uuid;
    if not exists (select 1 from game.players where id = v_id) then
      perform private.fail('not_found');
    end if;
  end if;
  return jsonb_build_object(
    'seller', private.trader_doc(v_id, case when v_id is null then p_seller end),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'item_id', l.item_id,
      'qty', l.qty, 'price_cents', l.price_cents, 'value_cents', private.card_or_product_value(l.item_id)) order by l.created_at desc)
      from game.listings l
      where (v_id is not null and l.seller_id = v_id) or (v_id is null and l.npc_id = p_seller)), '[]'::jsonb)
  );
end $$;
select private.expose('public.seller_get(text)');

-- ---------------------------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------------------------
create function public.listing_create(p_request_id uuid, p_kind text, p_item text, p_copy uuid, p_qty int, p_price bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'listing_create');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'cardmarket');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  perform private.market_check_price(p_qty, p_price);
  if p_kind = 'copy' and p_qty <> 1 or p_kind = 'card' and private.is_hit(p_item) then
    perform private.fail('invalid_request');
  end if;
  if (select count(*) from game.listings where seller_id = v_player)
     + (select count(*) from game.buy_orders where buyer_id = v_player) >= private.market_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  perform private.item_take(v_player, p_kind, p_item, p_copy, p_qty, 'listed');
  insert into game.listings (seller_id, item_kind, item_id, copy_id, qty, price_cents, created_at)
  values (v_player, p_kind, p_item, case when p_kind = 'copy' then p_copy end, p_qty, p_price, private.now());
  perform private.emit(v_player, 'listing_created');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, p_item), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.listing_create(uuid, text, text, uuid, int, bigint)');

create function public.listing_cancel(p_request_id uuid, p_listing bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'listing_cancel');
  l game.listings;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  delete from game.listings where id = p_listing and seller_id = v_player returning * into l;
  if not found then
    perform private.fail('not_found');
  end if;
  if l.item_kind = 'copy' then
    update game.card_copies set location = 'inventory' where id = l.copy_id;
  else
    perform private.item_give(v_player, l.item_kind, l.item_id, null, l.qty);
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, l.item_id), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.listing_cancel(uuid, bigint)');

create function public.listing_buy(p_request_id uuid, p_listing bigint, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'listing_buy');
  l game.listings;
  v_total bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'cardmarket');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  select * into l from game.listings where id = p_listing for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if l.seller_id = v_player then
    perform private.fail('own_listing');
  end if;
  if coalesce(p_qty, 0) < 1 or p_qty > l.qty then
    perform private.fail('invalid_request');
  end if;
  v_total := l.price_cents * p_qty;
  perform private.money_add(v_player, -v_total, 'market_buy', l.item_id);
  if l.qty = p_qty then
    delete from game.listings where id = l.id;
  else
    update game.listings set qty = qty - p_qty where id = l.id;
  end if;
  perform private.sale_ship(l.seller_id, l.npc_id, v_player, null, l.item_kind, l.item_id, l.copy_id, p_qty, v_total);
  perform private.emit(v_player, 'market_bought', p_qty);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, l.item_id), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.listing_buy(uuid, bigint, int)');

-- ---------------------------------------------------------------------------------------------
-- Buy orders: the money waits in the order until a seller fills it or the buyer cancels.
-- ---------------------------------------------------------------------------------------------
create function public.order_create(p_request_id uuid, p_item text, p_qty int, p_price bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'order_create');
  v_kind text;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'cardmarket');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  perform private.market_check_price(p_qty, p_price);
  v_kind := case when exists (select 1 from game.card_defs where id = p_item) then 'card'
                 when exists (select 1 from game.product_defs where id = p_item) then 'sealed' end;
  if v_kind is null then
    perform private.fail('not_found');
  end if;
  if (select count(*) from game.listings where seller_id = v_player)
     + (select count(*) from game.buy_orders where buyer_id = v_player) >= private.market_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  perform private.money_add(v_player, -(p_qty * p_price), 'market_order', p_item);
  insert into game.buy_orders (buyer_id, item_kind, item_id, qty, price_cents, created_at)
  values (v_player, v_kind, p_item, p_qty, p_price, private.now());
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, p_item), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.order_create(uuid, text, int, bigint)');

create function public.order_cancel(p_request_id uuid, p_order bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'order_cancel');
  o game.buy_orders;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  delete from game.buy_orders where id = p_order and buyer_id = v_player returning * into o;
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.money_add(v_player, o.qty * o.price_cents, 'market_order', o.item_id);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, o.item_id), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.order_cancel(uuid, bigint)');

-- Sell into a buy order. Hits are delivered as the seller's copies with the lowest quality first.
create function public.order_fill(p_request_id uuid, p_order bigint, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'order_fill');
  o game.buy_orders;
  v_copy uuid;
  v_n int := 0;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'cardmarket');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  select * into o from game.buy_orders where id = p_order for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if o.buyer_id = v_player then
    perform private.fail('own_listing');
  end if;
  if coalesce(p_qty, 0) < 1 or p_qty > o.qty then
    perform private.fail('invalid_request');
  end if;
  if o.item_kind = 'card' and private.is_hit(o.item_id) then
    for v_copy in
      select id from game.card_copies
      where owner_id = v_player and card_id = o.item_id and location = 'inventory'
      order by q_centering + q_corners + q_edges + q_surface, pulled_at
      limit p_qty
      for update
    loop
      perform private.item_take(v_player, 'copy', o.item_id, v_copy, 1, 'shipping');
      perform private.sale_ship(v_player, null, o.buyer_id, o.npc_id, 'copy', o.item_id, v_copy, 1, o.price_cents);
      v_n := v_n + 1;
    end loop;
    if v_n < p_qty then
      perform private.fail('not_owned');
    end if;
  else
    perform private.item_take(v_player, o.item_kind, o.item_id, null, p_qty, 'shipping');
    perform private.sale_ship(v_player, null, o.buyer_id, o.npc_id, o.item_kind, o.item_id, null, p_qty, o.price_cents * p_qty);
  end if;
  if o.qty = p_qty then
    delete from game.buy_orders where id = o.id;
  else
    update game.buy_orders set qty = qty - p_qty where id = o.id;
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'item', private.cardmarket_item_doc(v_player, o.item_id), 'mine', private.my_market_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.order_fill(uuid, bigint, int)');

-- ---------------------------------------------------------------------------------------------
-- Binder and Ankauf only see hits in the inventory (not listed, not travelling).
-- ---------------------------------------------------------------------------------------------
create or replace function public.binder_get(p_set text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_rate numeric := private.cfg_num('ankauf.rate_bps');
begin
  return jsonb_build_object(
    'set_id', p_set,
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'card_id', c.id,
        'qty', coalesce(s.qty, 0) + coalesce(cp.n, 0),
        'value_cents', private.card_value(c.id),
        'ankauf_cents', round(private.card_value(c.id) * v_rate / 10000),
        'discovered', col.card_id is not null,
        'copies', coalesce(cp.ids, '[]'::jsonb)
      ) order by c.no), '[]'::jsonb)
      from game.card_defs c
      left join game.card_stacks s on s.player_id = v_player and s.card_id = c.id
      left join (
        select card_id, count(*)::int as n, jsonb_agg(id order by pulled_at) as ids
        from game.card_copies where owner_id = v_player and location = 'inventory' group by card_id
      ) cp on cp.card_id = c.id
      left join game.collection col on col.player_id = v_player and col.card_id = c.id
      where c.set_id = p_set
    )
  );
end $$;

create or replace function public.ankauf_sell(p_request_id uuid, p_stacks jsonb, p_copies uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ankauf_sell');
  v_rate numeric := private.cfg_num('ankauf.rate_bps');
  e jsonb;
  v_n int;
  v_count int := 0;
  v_value numeric := 0;
  v_payout bigint;
  v_deleted int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'sell', private.cfg_num('rate.sell')::int, 60);
  if jsonb_typeof(coalesce(p_stacks, '[]')) <> 'array' or jsonb_array_length(coalesce(p_stacks, '[]')) > 200
     or coalesce(array_length(p_copies, 1), 0) > 200 then
    perform private.fail('invalid_request');
  end if;

  for e in select * from jsonb_array_elements(coalesce(p_stacks, '[]')) loop
    v_n := (e ->> 'qty')::int;
    if v_n is null or v_n < 1 then
      perform private.fail('invalid_request');
    end if;
    update game.card_stacks set qty = qty - v_n
    where player_id = v_player and card_id = e ->> 'card_id' and qty >= v_n;
    if not found then
      perform private.fail('not_owned');
    end if;
    v_value := v_value + private.card_value(e ->> 'card_id') * v_n;
    v_count := v_count + v_n;
  end loop;
  delete from game.card_stacks where player_id = v_player and qty = 0;

  if coalesce(array_length(p_copies, 1), 0) > 0 then
    with gone as (
      delete from game.card_copies where owner_id = v_player and id = any (p_copies) and location = 'inventory' returning card_id
    )
    select count(*), coalesce(sum(private.card_value(card_id)), 0) into v_deleted, v_payout from gone;
    if v_deleted <> (select count(distinct x) from unnest(p_copies) x) then
      perform private.fail('not_owned');
    end if;
    v_value := v_value + v_payout;
    v_count := v_count + v_deleted;
  end if;

  if v_count = 0 then
    perform private.fail('invalid_request');
  end if;
  v_payout := round(v_value * v_rate / 10000);
  perform private.money_add(v_player, v_payout, 'ankauf');
  perform private.ep_grant(v_player, private.cfg_num('ep.sale'));
  perform private.emit(v_player, 'cards_sold', v_count);

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'sold', v_count, 'payout_cents', v_payout, 'player', private.me(v_player)));
end $$;

-- A reset also ends market business: listings and orders vanish without refund, incoming parcels are
-- lost, outgoing parcels still reach their buyers but pay nobody (no laundering into the fresh account).
create function private.on_player_reset() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.listings where seller_id = new.id;
    delete from game.buy_orders where buyer_id = new.id;
    delete from game.shipments where buyer_id = new.id;
    update game.shipments set seller_id = null where seller_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset after update of reset_at on game.players
  for each row execute function private.on_player_reset();
