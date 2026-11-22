-- alpha_02: card catalog, inventory, Kiosk, pack opening, Kartenladen-Ankauf.

-- Randomness goes through one function so tests can make it deterministic (setseed).
create function private.rand() returns double precision
language sql volatile set search_path = '' as $$
  select random()
$$;

-- ---------------------------------------------------------------------------------------------
-- Catalog (seeded from content/ by scripts/gen-seed.ts)
-- ---------------------------------------------------------------------------------------------
create table game.set_defs (
  id text primary key,
  game text not null,
  name text not null,
  size int not null,
  -- lifecycle, switched by the admin only (docs/GAME_DESIGN.md §4.5)
  phase text not null default 'print'
    check (phase in ('announced', 'preorder', 'print', 'last_wave', 'oop', 'vintage'))
);

create table game.card_defs (
  id text primary key,
  set_id text not null references game.set_defs (id),
  no int not null,
  name text not null,
  tier text not null check (tier in ('common', 'uncommon', 'rare', 'holo', 'alternative', 'ultra', 'grail')),
  kind text not null,
  element text,
  value_base_cents bigint not null check (value_base_cents > 0)
);
create index card_defs_set_tier on game.card_defs (set_id, tier);

create table game.product_defs (
  id text primary key,
  set_id text not null references game.set_defs (id),
  kind text not null,
  name text not null,
  price_base_cents bigint not null check (price_base_cents > 0),
  slots jsonb not null
);
create index product_defs_set on game.product_defs (set_id);

alter table game.set_defs enable row level security;
alter table game.card_defs enable row level security;
alter table game.product_defs enable row level security;

-- Current value of a card. alpha_02: seeded base value x Preisniveau. Market factors join in alpha_04.
create function private.card_value(p_card text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(value_base_cents) from game.card_defs where id = p_card
$$;

create function private.kiosk_price(p_product text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(price_base_cents * private.cfg_num('kiosk.markup_bps') / 10000)
  from game.product_defs where id = p_product
$$;

-- ---------------------------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------------------------
create table game.sealed (
  player_id uuid not null references game.players (id) on delete cascade,
  product_id text not null references game.product_defs (id),
  qty int not null check (qty >= 0),
  primary key (player_id, product_id)
);
create index sealed_product on game.sealed (product_id);

-- Common to Rare: stacked.
create table game.card_stacks (
  player_id uuid not null references game.players (id) on delete cascade,
  card_id text not null references game.card_defs (id),
  qty int not null check (qty >= 0),
  primary key (player_id, card_id)
);
create index card_stacks_card on game.card_stacks (card_id);

-- Holo and better: individual copies with hidden quality values (they decide grades later).
create table game.card_copies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references game.players (id) on delete cascade,
  card_id text not null references game.card_defs (id),
  q_centering smallint not null check (q_centering between 1 and 10),
  q_corners smallint not null check (q_corners between 1 and 10),
  q_edges smallint not null check (q_edges between 1 and 10),
  q_surface smallint not null check (q_surface between 1 and 10),
  pulled_at timestamptz not null
);
create index card_copies_owner on game.card_copies (owner_id, card_id);
create index card_copies_card on game.card_copies (card_id);

-- Cards a player has ever pulled (the "NEU!" badge and discovery EP).
create table game.collection (
  player_id uuid not null references game.players (id) on delete cascade,
  card_id text not null references game.card_defs (id),
  first_at timestamptz not null,
  primary key (player_id, card_id)
);
create index collection_card on game.collection (card_id);

-- Pech-Schutz: packs in a row without Holo or better, per set.
create table game.pity (
  player_id uuid not null references game.players (id) on delete cascade,
  set_id text not null references game.set_defs (id),
  dry int not null default 0,
  primary key (player_id, set_id)
);
create index pity_set on game.pity (set_id);

create table game.store_purchases (
  player_id uuid not null references game.players (id) on delete cascade,
  store text not null,
  product_id text not null references game.product_defs (id),
  day date not null,
  qty int not null,
  primary key (player_id, store, product_id, day)
);
create index store_purchases_product on game.store_purchases (product_id);

alter table game.sealed enable row level security;
alter table game.card_stacks enable row level security;
alter table game.card_copies enable row level security;
alter table game.collection enable row level security;
alter table game.pity enable row level security;
alter table game.store_purchases enable row level security;

create function private.sealed_add(p_player uuid, p_product text, p_qty int) returns void
language sql set search_path = '' as $$
  insert into game.sealed (player_id, product_id, qty) values (p_player, p_product, p_qty)
  on conflict (player_id, product_id) do update set qty = game.sealed.qty + excluded.qty
$$;

-- ---------------------------------------------------------------------------------------------
-- Rolls
-- ---------------------------------------------------------------------------------------------

-- One hidden quality value 1..10; config weights are for 10, 9, 8, ...
create function private.roll_quality() returns smallint
language plpgsql volatile set search_path = '' as $$
declare
  w jsonb := private.cfg('quality.weights');
  r numeric;
  i int;
begin
  r := private.rand() * (select sum(value::numeric) from jsonb_array_elements_text(w));
  for i in 0 .. jsonb_array_length(w) - 1 loop
    r := r - (w ->> i)::numeric;
    if r < 0 then
      return (10 - i)::smallint;
    end if;
  end loop;
  return (11 - jsonb_array_length(w))::smallint;
end $$;

-- Tier of a hit slot: Rare or better. Pech-Schutz raises the Holo chance after a dry streak;
-- the `pack_luck` stat (percent, capped at +50 %) raises Alternative, Ultra and Grail.
create function private.roll_hit_tier(p_player uuid, p_set text, p_min_holo boolean) returns text
language plpgsql volatile set search_path = '' as $$
declare
  o jsonb := private.cfg('pack.hit_odds_ppm');
  v_luck numeric := least(1.5, 1 + private.stat(p_player, 'pack_luck', 0) / 100);
  v_dry int := coalesce((select dry from game.pity where player_id = p_player and set_id = p_set), 0);
  v_grail numeric := (o ->> 'grail')::numeric * v_luck;
  v_ultra numeric := (o ->> 'ultra')::numeric * v_luck;
  v_alt numeric := (o ->> 'alternative')::numeric * v_luck;
  v_holo numeric := (o ->> 'holo')::numeric
    + greatest(0, v_dry - private.cfg_num('pack.pity_after') + 1) * private.cfg_num('pack.pity_step_ppm');
  r numeric;
begin
  r := private.rand() * case when p_min_holo then v_grail + v_ultra + v_alt + v_holo else 1000000 end;
  if r < v_grail then return 'grail'; end if;
  r := r - v_grail;
  if r < v_ultra then return 'ultra'; end if;
  r := r - v_ultra;
  if r < v_alt then return 'alternative'; end if;
  r := r - v_alt;
  if r < v_holo then return 'holo'; end if;
  return 'rare';
end $$;

-- A random card of a tier, preferring one that is not in the pack yet.
create function private.pick_card(p_set text, p_tier text, p_not text[]) returns text
language sql volatile set search_path = '' as $$
  select coalesce(
    (select id from game.card_defs where set_id = p_set and tier = p_tier and id <> all (p_not) order by private.rand() limit 1),
    (select id from game.card_defs where set_id = p_set and tier = p_tier order by private.rand() limit 1),
    (select id from game.card_defs where set_id = p_set and tier = 'rare' order by private.rand() limit 1)
  )
$$;

-- The card ids of one booster in reveal order. Slot groups come from the product (content/catalog.ts).
-- God Pack: every card Holo or better. Doppel-Hit: one Uncommon becomes a Holo.
create function private.roll_pack(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
declare
  v_set text;
  v_slots jsonb;
  g jsonb;
  v_pool text;
  v_n int;
  v_ids text[] := '{}';
  v_pick text[];
  v_god boolean := private.rand() * 1000000 < private.cfg_num('pack.god_pack_ppm');
  v_double boolean := private.rand() * 1000000 < private.cfg_num('pack.double_hit_ppm');
  i int;
begin
  select set_id, slots into v_set, v_slots from game.product_defs where id = p_product;
  for g in select * from jsonb_array_elements(v_slots) loop
    v_pool := g ->> 'pool';
    v_n := (g ->> 'n')::int;
    if v_god or v_pool = 'hit' then
      for i in 1 .. v_n loop
        v_ids := v_ids || private.pick_card(v_set, private.roll_hit_tier(p_player, v_set, v_god), v_ids);
      end loop;
    else
      if v_double and v_pool = 'uncommon' then
        v_n := v_n - 1;
      end if;
      select array_agg(id) into v_pick from (
        select id from game.card_defs
        where set_id = v_set
          and id <> all (v_ids)
          and case v_pool
                when 'energy' then tier = 'common' and kind = 'energy'
                when 'common' then tier = 'common' and kind <> 'energy'
                else tier = v_pool
              end
        order by private.rand()
        limit v_n
      ) s;
      v_ids := v_ids || coalesce(v_pick, '{}');
      if v_double and v_pool = 'uncommon' then
        v_ids := v_ids || private.pick_card(v_set, 'holo', v_ids);
      end if;
    end if;
  end loop;
  return v_ids;
end $$;

-- Puts one card into the player's inventory. Returns what the client needs for the reveal.
create function private.give_card(p_player uuid, p_card text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  c game.card_defs;
  v_copy uuid;
  v_new boolean;
begin
  select * into c from game.card_defs where id = p_card;
  if c.tier in ('holo', 'alternative', 'ultra', 'grail') then
    insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
    values (p_player, p_card, private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality(), private.now())
    returning id into v_copy;
  else
    insert into game.card_stacks (player_id, card_id, qty) values (p_player, p_card, 1)
    on conflict (player_id, card_id) do update set qty = game.card_stacks.qty + 1;
  end if;
  insert into game.collection (player_id, card_id, first_at) values (p_player, p_card, private.now())
  on conflict do nothing;
  v_new := found;
  return jsonb_build_object(
    'card_id', p_card, 'tier', c.tier, 'kind', c.kind,
    'value_cents', private.card_value(p_card), 'new', v_new, 'copy_id', v_copy
  );
end $$;

-- The player document every write returns, so the HUD updates without a second call.
create function private.me(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select private.player_doc(p) from game.players p where p.id = p_player
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------

-- Kiosk offers and the player's sealed products.
create function public.shop_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
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
      where s.phase in ('print', 'last_wave')
    ),
    'sealed', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) order by product_id), '[]'::jsonb)
      from game.sealed where player_id = v_player and qty > 0
    )
  );
end $$;
select private.expose('public.shop_get()');

create function public.store_buy(p_request_id uuid, p_product text, p_qty int) returns jsonb
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
    where pd.id = p_product and s.phase in ('print', 'last_wave')
  ) then
    perform private.fail('product_unavailable');
  end if;

  perform 1 from game.players where id = v_player for update;
  select coalesce(sum(qty), 0) into v_bought from game.store_purchases
  where player_id = v_player and store = 'kiosk' and product_id = p_product and day = private.today();
  if v_bought + p_qty > private.cfg_num('kiosk.daily_limit') then
    perform private.fail('store_limit');
  end if;

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
select private.expose('public.store_buy(uuid, text, int)');

-- Opens 1..pack.max_open sealed boosters. The server decides and books everything at once; the client
-- only replays the reveal, so closing the tab loses nothing.
create function public.pack_open(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'pack_open');
  v_set text;
  v_name text;
  v_ids text[];
  v_id text;
  v_card jsonb;
  v_cards jsonb;
  v_packs jsonb := '[]';
  v_pack_value bigint;
  v_pack_hit boolean;
  v_total bigint := 0;
  v_new int := 0;
  v_hits int := 0;
  v_energy int := 0;
  i int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'open', private.cfg_num('rate.open')::int, 60);
  if p_qty is null or p_qty < 1 or p_qty > private.cfg_num('pack.max_open') then
    perform private.fail('invalid_request');
  end if;
  select set_id into v_set from game.product_defs where id = p_product;
  if not found then
    perform private.fail('invalid_request');
  end if;
  update game.sealed set qty = qty - p_qty where player_id = v_player and product_id = p_product and qty >= p_qty;
  if not found then
    perform private.fail('not_enough_sealed');
  end if;
  select username into v_name from game.players where id = v_player;

  for i in 1 .. p_qty loop
    v_ids := private.roll_pack(v_player, p_product);
    v_cards := '[]';
    v_pack_value := 0;
    v_pack_hit := false;
    foreach v_id in array v_ids loop
      v_card := private.give_card(v_player, v_id);
      v_cards := v_cards || v_card;
      v_pack_value := v_pack_value + (v_card ->> 'value_cents')::bigint;
      if (v_card ->> 'new')::boolean then v_new := v_new + 1; end if;
      if v_card ->> 'kind' = 'energy' then v_energy := v_energy + 1; end if;
      if v_card ->> 'tier' in ('holo', 'alternative', 'ultra', 'grail') then
        v_hits := v_hits + 1;
        v_pack_hit := true;
      end if;
      if v_card ->> 'tier' in ('ultra', 'grail') then
        perform private.feed_add('pull_' || (v_card ->> 'tier'), jsonb_build_object('name', v_name, 'card_id', v_id));
      end if;
    end loop;
    insert into game.pity (player_id, set_id, dry) values (v_player, v_set, case when v_pack_hit then 0 else 1 end)
    on conflict (player_id, set_id) do update set dry = case when v_pack_hit then 0 else game.pity.dry + 1 end;
    v_packs := v_packs || jsonb_build_object('cards', v_cards, 'value_cents', v_pack_value);
    v_total := v_total + v_pack_value;
  end loop;

  perform private.ep_grant(v_player, p_qty * private.cfg_num('ep.pack') + v_new * private.cfg_num('ep.new_card'));
  perform private.emit(v_player, 'pack_opened', p_qty);
  if v_new > 0 then perform private.emit(v_player, 'card_new', v_new); end if;
  if v_hits > 0 then perform private.emit(v_player, 'hit_pulled', v_hits); end if;
  if v_energy > 0 then perform private.emit(v_player, 'energy_pulled', v_energy); end if;

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'packs', v_packs, 'total_value_cents', v_total, 'price_cents', private.kiosk_price(p_product),
    'player', private.me(v_player)));
end $$;
select private.expose('public.pack_open(uuid, text, int)');

-- All cards of a set with the player's holdings and current values.
create function public.binder_get(p_set text) returns jsonb
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
        from game.card_copies where owner_id = v_player group by card_id
      ) cp on cp.card_id = c.id
      left join game.collection col on col.player_id = v_player and col.card_id = c.id
      where c.set_id = p_set
    )
  );
end $$;
select private.expose('public.binder_get(text)');

-- Kartenladen-Ankauf: instant sale to the NPC shop at a fixed share of the value.
-- p_stacks: [{"card_id": "...", "qty": n}], p_copies: copy ids.
create function public.ankauf_sell(p_request_id uuid, p_stacks jsonb, p_copies uuid[]) returns jsonb
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
      delete from game.card_copies where owner_id = v_player and id = any (p_copies) returning card_id
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
select private.expose('public.ankauf_sell(uuid, jsonb, uuid[])');
