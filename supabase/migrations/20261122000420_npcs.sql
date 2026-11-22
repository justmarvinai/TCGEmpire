-- alpha_04 (Flip), part 3: NPC traders v1 (docs/GAME_DESIGN.md §18). Coded archetypes act every 5 minutes
-- with seeded randomness and capped daily budgets: they buy cheap offers, keep buy orders open, run a shop
-- of singles and flip sealed product. Definitions come from content/npcs.ts.

create table game.npcs (
  id text primary key,
  name text not null,
  archetype text not null,
  ruf int not null,
  budget_base_cents bigint not null,
  activity int not null,
  params jsonb not null,
  budget_cents bigint not null default 0,
  budget_day date
);

create table game.npc_stock (
  npc_id text not null references game.npcs (id) on delete cascade,
  item_id text not null,
  qty int not null check (qty >= 0),
  primary key (npc_id, item_id)
);

alter table game.npcs enable row level security;
alter table game.npc_stock enable row level security;

alter table game.listings add constraint listings_npc foreign key (npc_id) references game.npcs (id) on delete cascade;
create index listings_npc on game.listings (npc_id);
alter table game.buy_orders add constraint buy_orders_npc foreign key (npc_id) references game.npcs (id) on delete cascade;
create index buy_orders_npc on game.buy_orders (npc_id);
alter table game.shipments add constraint shipments_npc_buyer foreign key (npc_buyer) references game.npcs (id) on delete set null;
create index shipments_npc_buyer on game.shipments (npc_buyer);
alter table game.shipments add constraint shipments_npc_seller foreign key (npc_seller) references game.npcs (id) on delete set null;
create index shipments_npc_seller on game.shipments (npc_seller);

-- NPCs show up with their name and Ruf.
create or replace function private.trader_doc(p_player uuid, p_npc text) returns jsonb
language sql stable set search_path = '' as $$
  select case when p_player is not null then
    (select jsonb_build_object('id', p.id::text, 'kind', 'player', 'name', p.username, 'ruf', p.ruf) from game.players p where p.id = p_player)
  else
    (select jsonb_build_object('id', n.id, 'kind', 'npc', 'name', n.name, 'ruf', n.ruf) from game.npcs n where n.id = p_npc)
  end
$$;

-- A fresh copy with rolled quality: hits that NPCs sell come into the world this way.
create function private.copy_create(p_player uuid, p_card text) returns uuid
language sql volatile set search_path = '' as $$
  insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
  values (p_player, p_card, private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality(), private.now())
  returning id
$$;

create or replace function private.item_give(p_player uuid, p_kind text, p_item text, p_copy uuid, p_qty int) returns void
language plpgsql set search_path = '' as $$
declare
  i int;
begin
  if p_kind = 'sealed' then
    perform private.sealed_add(p_player, p_item, p_qty);
    return;
  end if;
  if p_kind = 'card' and private.is_hit(p_item) then
    for i in 1 .. p_qty loop
      perform private.copy_create(p_player, p_item);
    end loop;
  elsif p_kind = 'card' then
    perform private.stack_add(p_player, p_item, p_qty);
  else
    update game.card_copies set owner_id = p_player, location = 'inventory' where id = p_copy;
  end if;
  insert into game.collection (player_id, card_id, first_at) values (p_player, p_item, private.now())
  on conflict do nothing;
end $$;

-- Parcels between players and NPCs: NPC sellers get the money into their budget, NPC buyers keep the goods.
create or replace function private.shipment_deliver(p_id bigint) returns void
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
  elsif s.npc_buyer is not null then
    insert into game.npc_stock (npc_id, item_id, qty) values (s.npc_buyer, s.item_id, s.qty)
    on conflict (npc_id, item_id) do update set qty = game.npc_stock.qty + excluded.qty;
  end if;
  if s.seller_id is not null then
    perform private.money_add(s.seller_id, s.total_cents - s.fee_cents, 'market_sale', s.item_id);
    perform private.ep_grant(s.seller_id, private.cfg_num('ep.sale'));
    if s.item_kind <> 'sealed' then
      perform private.emit(s.seller_id, 'cards_sold', s.qty);
    end if;
    perform private.notify(s.seller_id, 'sale_paid',
      jsonb_build_object('item_id', s.item_id, 'qty', s.qty, 'cents', s.total_cents - s.fee_cents));
  elsif s.npc_seller is not null then
    update game.npcs set budget_cents = budget_cents + s.total_cents - s.fee_cents where id = s.npc_seller;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- What an NPC can do
-- ---------------------------------------------------------------------------------------------
-- Buys from a player's listing; pays from its budget now, the seller is paid on arrival.
create function private.npc_buy(p_npc text, p_listing bigint, p_qty int) returns boolean
language plpgsql set search_path = '' as $$
declare
  l game.listings;
  v_total bigint;
begin
  select * into l from game.listings where id = p_listing for update skip locked;
  if not found or l.npc_id is not null or p_qty > l.qty then
    return false;
  end if;
  v_total := l.price_cents * p_qty;
  update game.npcs set budget_cents = budget_cents - v_total where id = p_npc and budget_cents >= v_total;
  if not found then
    return false;
  end if;
  if l.qty = p_qty then
    delete from game.listings where id = l.id;
  else
    update game.listings set qty = qty - p_qty where id = l.id;
  end if;
  perform private.sale_ship(l.seller_id, null, null, p_npc, l.item_kind, l.item_id, l.copy_id, p_qty, v_total);
  return true;
end $$;

-- Puts up a listing. Hits are listed as cards: the buyer gets a fresh copy on arrival.
create function private.npc_list(p_npc text, p_item text, p_qty int, p_price bigint) returns void
language sql set search_path = '' as $$
  insert into game.listings (npc_id, item_kind, item_id, qty, price_cents, created_at)
  values (p_npc, case when exists (select 1 from game.product_defs where id = p_item) then 'sealed' else 'card' end,
          p_item, p_qty, greatest(1, p_price), private.now())
$$;

-- Places a buy order paid from its budget.
create function private.npc_order(p_npc text, p_item text, p_qty int, p_price bigint) returns boolean
language plpgsql set search_path = '' as $$
begin
  update game.npcs set budget_cents = budget_cents - p_qty * p_price where id = p_npc and budget_cents >= p_qty * p_price;
  if not found then
    return false;
  end if;
  insert into game.buy_orders (npc_id, item_kind, item_id, qty, price_cents, created_at)
  values (p_npc, case when exists (select 1 from game.product_defs where id = p_item) then 'sealed' else 'card' end,
          p_item, p_qty, greatest(1, p_price), private.now());
  return true;
end $$;

-- Old buy orders go back into the budget, so wishes follow the market.
create function private.npc_orders_expire(p_npc text, p_age interval) returns void
language plpgsql set search_path = '' as $$
declare
  v_back bigint;
begin
  with gone as (
    delete from game.buy_orders where npc_id = p_npc and created_at < private.now() - p_age returning qty * price_cents as c
  )
  select coalesce(sum(c), 0) into v_back from gone;
  update game.npcs set budget_cents = budget_cents + v_back where id = p_npc and v_back > 0;
end $$;

-- Lists its stock with a markup (scalper, investor).
create function private.npc_sell_stock(p_npc text, p_min_pct numeric, p_max_pct numeric) returns void
language plpgsql set search_path = '' as $$
declare
  s game.npc_stock;
begin
  for s in select * from game.npc_stock where npc_id = p_npc and qty > 0 for update loop
    perform private.npc_list(p_npc, s.item_id, s.qty,
      round(private.card_or_product_value(s.item_id) * (p_min_pct + private.rand() * (p_max_pct - p_min_pct)) / 100)::bigint);
    update game.npc_stock set qty = 0 where npc_id = p_npc and item_id = s.item_id;
  end loop;
end $$;

-- Buys listings that are cheap compared to the Marktwert (cards or sealed).
create function private.npc_buy_cheap(p_npc text, p_kinds text[], p_below_pct numeric, p_max int) returns void
language plpgsql set search_path = '' as $$
declare
  r record;
begin
  for r in
    select l.id, l.qty from game.listings l join game.prices pr on pr.item_id = l.item_id
    where l.seller_id is not null and l.item_kind = any (p_kinds) and l.price_cents <= pr.value_cents * p_below_pct / 100
    order by l.price_cents::numeric / pr.value_cents
    limit p_max
  loop
    perform private.npc_buy(p_npc, r.id, r.qty);
  end loop;
end $$;

create function private.npc_act(n game.npcs) returns void
language plpgsql set search_path = '' as $$
declare
  p jsonb := n.params;
  r record;
  i int;
  v_hit boolean;
  v_hype numeric;
begin
  if private.rand() * 100 >= n.activity then
    return;
  end if;

  if n.archetype = 'collector' then
    perform private.npc_buy_cheap(n.id, array['card', 'copy'], (p ->> 'buyBelowPct')::numeric, (p ->> 'buysPerTick')::int);
    perform private.npc_orders_expire(n.id, interval '24 hours');
    for i in 1 .. greatest(0, (p ->> 'orders')::int - (select count(*) from game.buy_orders where npc_id = n.id)::int) loop
      select item_id, value_cents into r from game.prices where kind = 'card' order by private.rand() limit 1;
      perform private.npc_order(n.id, r.item_id, 1, round(r.value_cents * (p ->> 'orderPct')::numeric / 100)::bigint);
    end loop;

  elsif n.archetype = 'dealer' then
    delete from game.listings where npc_id = n.id and created_at < private.now() - make_interval(hours => (p ->> 'maxAgeH')::int);
    for i in 1 .. greatest(0, (p ->> 'stock')::int - (select count(*) from game.listings where npc_id = n.id)::int) loop
      v_hit := private.rand() * 100 < (p ->> 'hitChancePct')::numeric;
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id
      where (v_hit and c.tier in ('holo', 'alternative', 'ultra', 'grail')) or (not v_hit and c.tier in ('common', 'uncommon', 'rare'))
      order by private.rand() limit 1;
      perform private.npc_list(n.id, r.item_id, case when v_hit then 1 else 1 + floor(private.rand() * 3)::int end,
        round(r.value_cents * ((p ->> 'markupMinPct')::numeric + private.rand() * ((p ->> 'markupMaxPct')::numeric - (p ->> 'markupMinPct')::numeric)) / 100)::bigint);
    end loop;

  elsif n.archetype = 'bulk' then
    perform private.npc_orders_expire(n.id, interval '24 hours');
    for i in 1 .. greatest(0, (p ->> 'orders')::int - (select count(*) from game.buy_orders where npc_id = n.id)::int) loop
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id
      where c.tier in ('common', 'uncommon') order by private.rand() limit 1;
      perform private.npc_order(n.id, r.item_id, (p ->> 'qty')::int, round(r.value_cents * (p ->> 'orderPct')::numeric / 100)::bigint);
    end loop;

  elsif n.archetype = 'scalper' then
    perform private.npc_buy_cheap(n.id, array['sealed'], (p ->> 'buyBelowPct')::numeric, 3);
    perform private.npc_sell_stock(n.id, (p ->> 'markupMinPct')::numeric, (p ->> 'markupMaxPct')::numeric);

  elsif n.archetype = 'investor' then
    select avg(hype) into v_hype from game.market;
    if v_hype * 100 < (p ->> 'buyHypeBelowPct')::numeric then
      perform private.npc_buy_cheap(n.id, array['sealed'], (p ->> 'buyBelowPct')::numeric, 3);
    elsif v_hype * 100 > (p ->> 'sellHypeAbovePct')::numeric then
      perform private.npc_sell_stock(n.id, (p ->> 'sellMarkupPct')::numeric, (p ->> 'sellMarkupPct')::numeric);
    end if;
  end if;
end $$;

create function private.tick_npcs() returns void
language plpgsql set search_path = '' as $$
declare
  n game.npcs;
  v_today date := private.today();
begin
  -- Budgets refill once a day, never above two days' worth.
  update game.npcs
  set budget_cents = least(2 * private.eur(budget_base_cents), budget_cents + private.eur(budget_base_cents)), budget_day = v_today
  where budget_day is distinct from v_today;
  for n in select * from game.npcs order by id loop
    begin
      perform private.npc_act(n);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('npc:' || n.id, private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('npcs', 300);
