-- alpha_04 (Flip), part 4: retail stores with shared stock (docs/GAME_DESIGN.md §7.5), displays and the
-- Lager. Müller and Smyths restock at fixed times with stock for everyone; the Würfelbude keeps a weekly
-- allocation per player that grows with Ruf; scalpers grab a share of every restock. Stores close on Sundays.

alter table game.product_defs add column contents jsonb;

create table game.store_defs (
  key text primary key,
  min_level int not null,
  markup_bps int not null,
  closed_sunday boolean not null,
  restocks jsonb not null,
  stock_per_player int not null,
  lim int not null,
  lim_per_ruf100 int not null,
  products jsonb not null
);

-- The current restock wave per store and product.
create table game.store_waves (
  store text not null references game.store_defs (key) on delete cascade,
  product_id text not null references game.product_defs (id),
  wave_at timestamptz not null,
  qty_total int not null,
  qty_left int not null check (qty_left >= 0),
  npc_taken int not null default 0,
  primary key (store, product_id)
);
create index store_waves_product on game.store_waves (product_id);

-- Purchases per player and wave (shared stores) or week (allocation stores).
create table game.store_buys (
  player_id uuid not null references game.players (id) on delete cascade,
  store text not null references game.store_defs (key) on delete cascade,
  product_id text not null references game.product_defs (id),
  period_at timestamptz not null,
  qty int not null,
  primary key (player_id, store, product_id, period_at)
);
create index store_buys_store on game.store_buys (store);
create index store_buys_product on game.store_buys (product_id);

alter table game.store_defs enable row level security;
alter table game.store_waves enable row level security;
alter table game.store_buys enable row level security;

-- Displays count with their boosters when a set runs out of print.
create or replace function private.sealed_left(p_set text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(sum(s.qty * coalesce((pd.contents ->> 'qty')::int, 1)), 0)::bigint
  from game.sealed s
  join game.product_defs pd on pd.id = s.product_id
  where pd.set_id = p_set and pd.kind in ('booster', 'display')
$$;

-- Only boosters can be opened as packs; a display is unboxed into boosters first.
create or replace function private.roll_pack(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
begin
  if (select kind from game.product_defs where id = p_product) is distinct from 'booster' then
    perform private.fail('invalid_request');
  end if;
  update game.set_defs set packs_opened = packs_opened + 1
  where id = (select set_id from game.product_defs where id = p_product);
  return private.roll_pack_cards(p_player, p_product);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Lager: every booster or display counts one unit.
-- ---------------------------------------------------------------------------------------------
create function private.lager_cap(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('lager.base_units') + private.stat(p_player, 'lager_units', 0))::int
$$;

create function private.lager_used(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce(sum(qty), 0)::int from game.sealed where player_id = p_player
$$;

create function private.lager_check(p_player uuid, p_add int) returns void
language plpgsql stable set search_path = '' as $$
begin
  if private.lager_used(p_player) + p_add > private.lager_cap(p_player) then
    perform private.fail('lager_full');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Stores
-- ---------------------------------------------------------------------------------------------
create function private.store_open(p_store text) returns boolean
language sql stable set search_path = '' as $$
  select not (closed_sunday and extract(isodow from private.now() at time zone 'Europe/Berlin') = 7)
  from game.store_defs where key = p_store
$$;

-- The latest scheduled restock that is due (today, Europe/Berlin), or null.
create function private.store_due(p_store text) returns timestamptz
language sql stable set search_path = '' as $$
  select max((private.today() + t::time) at time zone 'Europe/Berlin')
  from game.store_defs s, jsonb_array_elements_text(s.restocks) t
  where s.key = p_store and (private.today() + t::time) at time zone 'Europe/Berlin' <= private.now()
$$;

-- The next scheduled restock (today or a following open day).
create function private.store_next(p_store text) returns timestamptz
language sql stable set search_path = '' as $$
  select min(at) from (
    select (private.today() + d + t::time) at time zone 'Europe/Berlin' as at
    from game.store_defs s, jsonb_array_elements_text(s.restocks) t, generate_series(0, 2) d
    where s.key = p_store
      and not (s.closed_sunday and extract(isodow from private.today() + d) = 7)
  ) x where at > private.now()
$$;

create function private.store_price(p_store text, p_product text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(pd.price_base_cents * s.markup_bps / 10000)
  from game.store_defs s, game.product_defs pd where s.key = p_store and pd.id = p_product
$$;

-- Restocks: a new wave per product, sized by active players; scalpers take their share right away.
create function private.tick_stores() returns void
language plpgsql set search_path = '' as $$
declare
  s game.store_defs;
  w game.store_waves;
  v_due timestamptz;
  v_active int := greatest(2, (select count(*) from game.players where last_seen_at > private.now() - interval '72 hours')::int);
  v_npc game.npcs;
  v_take int;
  v_price bigint;
begin
  for s in select * from game.store_defs where jsonb_array_length(restocks) > 0 loop
    v_due := private.store_due(s.key);
    if v_due is null or not private.store_open(s.key) then
      continue;
    end if;
    if exists (select 1 from game.store_waves where store = s.key and wave_at >= v_due) then
      continue;
    end if;
    insert into game.store_waves (store, product_id, wave_at, qty_total, qty_left, npc_taken)
    select s.key, p ->> 'id', v_due, s.stock_per_player * v_active, s.stock_per_player * v_active, 0
    from jsonb_array_elements(s.products) p
    join game.product_defs pd on pd.id = p ->> 'id'
    join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
    on conflict (store, product_id) do update
      set wave_at = excluded.wave_at, qty_total = excluded.qty_total, qty_left = excluded.qty_left, npc_taken = 0;
    perform private.feed_add('restock', jsonb_build_object('store', s.key));
  end loop;

  -- Scalpers: a share of every fresh wave, paid from their budget, then flipped on the Cardmarket.
  for w in
    select * from game.store_waves
    where npc_taken = 0 and qty_left > 0 and wave_at > private.now() - make_interval(mins => private.cfg_num('stores.scalper_window_minutes')::int)
    for update
  loop
    for v_npc in select * from game.npcs where archetype = 'scalper' loop
      v_price := private.store_price(w.store, w.product_id);
      v_take := least(w.qty_left, ceil(w.qty_total * private.cfg_num('stores.scalper_share_pct') / 100)::int,
                      (v_npc.budget_cents / greatest(1, v_price))::int);
      if v_take < 1 then
        continue;
      end if;
      update game.npcs set budget_cents = budget_cents - v_take * v_price where id = v_npc.id;
      insert into game.npc_stock (npc_id, item_id, qty) values (v_npc.id, w.product_id, v_take)
      on conflict (npc_id, item_id) do update set qty = game.npc_stock.qty + excluded.qty;
      update game.store_waves set qty_left = qty_left - v_take, npc_taken = npc_taken + v_take
      where store = w.store and product_id = w.product_id;
      w.qty_left := w.qty_left - v_take;
      perform private.feed_add('scalper_raid', jsonb_build_object('name', v_npc.name, 'store', w.store, 'qty', v_take));
    end loop;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('stores', 60);

-- Buy at Müller, Smyths or the Würfelbude.
create function public.retail_buy(p_request_id uuid, p_store text, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'retail_buy');
  s game.store_defs;
  w game.store_waves;
  v_level int;
  v_ruf int;
  v_period timestamptz;
  v_limit int;
  v_bought int;
  v_price bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'buy', private.cfg_num('rate.buy')::int, 60);
  select * into s from game.store_defs where key = p_store;
  if not found or coalesce(p_qty, 0) < 1 or p_qty > 50 then
    perform private.fail('invalid_request');
  end if;
  select level, ruf into v_level, v_ruf from game.players where id = v_player for update;
  if v_level < s.min_level or v_level < coalesce((
    select (p ->> 'minLevel')::int from jsonb_array_elements(s.products) p where p ->> 'id' = p_product), 0) then
    perform private.fail('locked');
  end if;
  if not exists (
    select 1 from jsonb_array_elements(s.products) p
    join game.product_defs pd on pd.id = p ->> 'id'
    join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
    where p ->> 'id' = p_product
  ) then
    perform private.fail('product_unavailable');
  end if;
  if not private.store_open(p_store) then
    perform private.fail('store_closed');
  end if;

  if jsonb_array_length(s.restocks) > 0 then
    select * into w from game.store_waves where store = p_store and product_id = p_product for update;
    if not found or w.qty_left < p_qty then
      perform private.fail('sold_out');
    end if;
    v_period := w.wave_at;
    v_limit := s.lim;
  else
    v_period := private.week_start()::timestamptz;
    v_limit := s.lim + s.lim_per_ruf100 * (v_ruf / 100);
  end if;
  select coalesce(sum(qty), 0) into v_bought from game.store_buys
  where player_id = v_player and store = p_store and product_id = p_product and period_at = v_period;
  if v_bought + p_qty > v_limit then
    perform private.fail('store_limit');
  end if;
  perform private.lager_check(v_player, p_qty);

  v_price := private.store_price(p_store, p_product);
  perform private.money_add(v_player, -v_price * p_qty, 'store_buy', p_product);
  if w.store is not null then
    update game.store_waves set qty_left = qty_left - p_qty where store = p_store and product_id = p_product;
  end if;
  insert into game.store_buys (player_id, store, product_id, period_at, qty) values (v_player, p_store, p_product, v_period, p_qty)
  on conflict (player_id, store, product_id, period_at) do update set qty = game.store_buys.qty + excluded.qty;
  perform private.sealed_add(v_player, p_product, p_qty);
  perform private.emit(v_player, 'packs_bought', p_qty * coalesce((select (contents ->> 'qty')::int from game.product_defs where id = p_product), 1));
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'bought', p_qty, 'paid_cents', v_price * p_qty, 'player', private.me(v_player)));
end $$;
select private.expose('public.retail_buy(uuid, text, text, int)');

-- A display becomes its boosters.
create function public.display_unbox(p_request_id uuid, p_product text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'display_unbox');
  v_contents jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select contents into v_contents from game.product_defs where id = p_product and kind = 'display';
  if v_contents is null then
    perform private.fail('invalid_request');
  end if;
  update game.sealed set qty = qty - 1 where player_id = v_player and product_id = p_product and qty >= 1;
  if not found then
    perform private.fail('not_enough_sealed');
  end if;
  perform private.lager_check(v_player, (v_contents ->> 'qty')::int);
  perform private.sealed_add(v_player, v_contents ->> 'product', (v_contents ->> 'qty')::int);
  perform private.emit(v_player, 'display_unboxed');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'boosters', (v_contents ->> 'qty')::int, 'player', private.me(v_player)));
end $$;
select private.expose('public.display_unbox(uuid, text)');

-- The Kiosk sells boosters only and respects the Lager.
create or replace function public.store_buy(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'store_buy');
  v_price bigint;
  v_bought int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'buy', private.cfg_num('rate.buy')::int, 60);
  if p_qty is null or p_qty not in (1, 5, 10) then
    perform private.fail('invalid_request');
  end if;
  if not exists (
    select 1 from game.product_defs pd join game.set_defs s on s.id = pd.set_id
    where pd.id = p_product and pd.kind = 'booster' and s.phase in ('print', 'last_wave')
  ) then
    perform private.fail('product_unavailable');
  end if;

  perform 1 from game.players where id = v_player for update;
  select coalesce(sum(qty), 0) into v_bought from game.store_purchases
  where player_id = v_player and store = 'kiosk' and product_id = p_product and day = private.today();
  if v_bought + p_qty > private.cfg_num('kiosk.daily_limit') then
    perform private.fail('store_limit');
  end if;
  perform private.lager_check(v_player, p_qty);

  v_price := private.kiosk_price(p_product);
  perform private.money_add(v_player, -v_price * p_qty, 'store_buy', p_product);
  insert into game.store_purchases (player_id, store, product_id, day, qty)
  values (v_player, 'kiosk', p_product, private.today(), p_qty)
  on conflict (player_id, store, product_id, day) do update set qty = game.store_purchases.qty + excluded.qty;
  perform private.sealed_add(v_player, p_product, p_qty);
  perform private.emit(v_player, 'packs_bought', p_qty);

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'bought', p_qty, 'paid_cents', v_price * p_qty, 'player', private.me(v_player)));
end $$;

create or replace function public.shop_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_level int;
  v_ruf int;
begin
  select level, ruf into v_level, v_ruf from game.players where id = v_player;
  return jsonb_build_object(
    'kiosk', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', pd.id,
        'price_cents', private.kiosk_price(pd.id),
        'bought_today', coalesce((select sum(sp.qty) from game.store_purchases sp
          where sp.player_id = v_player and sp.store = 'kiosk' and sp.product_id = pd.id and sp.day = private.today()), 0),
        'daily_limit', private.cfg_num('kiosk.daily_limit')
      ) order by pd.id), '[]'::jsonb)
      from game.product_defs pd join game.set_defs s on s.id = pd.set_id
      where pd.kind = 'booster' and s.phase in ('print', 'last_wave')
    ),
    'stores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', s.key,
        'min_level', s.min_level,
        'open', private.store_open(s.key),
        'shared', jsonb_array_length(s.restocks) > 0,
        'next_restock_at', private.store_next(s.key),
        'offers', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'product_id', pd.id,
            'min_level', coalesce((p ->> 'minLevel')::int, s.min_level),
            'price_cents', private.store_price(s.key, pd.id),
            'left', w.qty_left,
            'total', w.qty_total,
            'restocked_at', w.wave_at,
            'limit', case when jsonb_array_length(s.restocks) > 0 then s.lim else s.lim + s.lim_per_ruf100 * (v_ruf / 100) end,
            'bought', coalesce((select sum(b.qty) from game.store_buys b
              where b.player_id = v_player and b.store = s.key and b.product_id = pd.id
                and b.period_at = case when jsonb_array_length(s.restocks) > 0 then w.wave_at else private.week_start()::timestamptz end), 0)
          ) order by pd.price_base_cents), '[]'::jsonb)
          from jsonb_array_elements(s.products) p
          join game.product_defs pd on pd.id = p ->> 'id'
          join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
          left join game.store_waves w on w.store = s.key and w.product_id = pd.id
        )
      ) order by s.min_level), '[]'::jsonb)
      from game.store_defs s
    ),
    'lager', jsonb_build_object('used', private.lager_used(v_player), 'cap', private.lager_cap(v_player),
                                'unlock_level', private.cfg_num('unlock.lager')),
    'sealed', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) order by product_id), '[]'::jsonb)
      from game.sealed where player_id = v_player and qty > 0
    ),
    'snacks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', key,
        'price_cents', case when price_base_cents is not null then private.eur(price_base_cents) end,
        'pfandbons', pfandbons
      ) order by key), '[]'::jsonb)
      from game.consumable_defs
    )
  );
end $$;
