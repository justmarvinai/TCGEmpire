-- alpha_07 (Leben), part 1: Skillbaum (docs/GAME_DESIGN.md §12.2). Four branches from content/skills.ts; a node
-- costs Skillpunkte and books a modifier (source skill:<key>); a respec costs money and refunds every point.
-- The hooks below make the new skill stats count where they apply.

create table game.skill_defs (
  key text primary key,
  branch text not null,
  tier int not null,
  cost int not null,
  requires text[] not null,
  stat text not null,
  op text not null check (op in ('flat', 'pct')),
  value numeric not null
);

create table game.skills_owned (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null references game.skill_defs (key) on delete cascade,
  at timestamptz not null,
  primary key (player_id, key)
);
create index skills_owned_key on game.skills_owned (key);

alter table game.skill_defs enable row level security;
alter table game.skills_owned enable row level security;

-- A reset starts the tree over (points and modifiers go with the reset itself).
create function private.on_player_reset_skills() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.skills_owned where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_skills after update of reset_at on game.players
  for each row execute function private.on_player_reset_skills();

-- ---------------------------------------------------------------------------------------------
-- Documents and RPCs
-- ---------------------------------------------------------------------------------------------
-- Too Big To Fail: the rescue package and whether the state pays it right now.
create function private.bailout_amount(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select round(private.net_worth(p_player) * (private.cfg('skills.bailout') ->> 'share_bps')::numeric / 10000)::bigint
$$;

create function private.bailout_ready(p_player uuid) returns boolean
language sql stable set search_path = '' as $$
  select private.stat(p_player, 'bailout', 0) > 0
    and coalesce((select total from game.counters where player_id = p_player and event = 'bailout'), 0) = 0
    and (select cash_cents from game.players where id = p_player)
        < private.net_worth(p_player) * (private.cfg('skills.bailout') ->> 'below_bps')::numeric / 10000
$$;

create function private.skills_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.skills')::int,
    'points', p.skill_points,
    'spent', coalesce((select sum(d.cost) from game.skills_owned o join game.skill_defs d on d.key = o.key where o.player_id = p.id), 0)::int,
    'owned', coalesce((select jsonb_agg(o.key order by o.at) from game.skills_owned o where o.player_id = p.id), '[]'::jsonb),
    'respec_cents', private.eur(private.cfg_num('skills.respec_base_cents_per_level') * p.level),
    'bailout', jsonb_build_object(
      'owned', private.stat(p.id, 'bailout', 0) > 0,
      'used', coalesce((select total from game.counters where player_id = p.id and event = 'bailout'), 0) > 0,
      'ready', private.bailout_ready(p.id),
      'cents', private.bailout_amount(p.id)
    )
  )
  from game.players p where p.id = p_player
$$;

create function public.skills_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.skills_doc(v_player);
end $$;
select private.expose('public.skills_get()');

create function public.skill_learn(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'skill_learn');
  d game.skill_defs;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'skills');
  select * into d from game.skill_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if exists (select 1 from game.skills_owned where player_id = v_player and key = p_key) then
    perform private.fail('already_owned');
  end if;
  if exists (select 1 from unnest(d.requires) r where r not in (select key from game.skills_owned where player_id = v_player)) then
    perform private.fail('skill_locked');
  end if;
  update game.players set skill_points = skill_points - d.cost where id = v_player and skill_points >= d.cost;
  if not found then
    perform private.fail('no_points');
  end if;
  insert into game.skills_owned (player_id, key, at) values (v_player, p_key, private.now());
  insert into game.modifiers (player_id, source, stat, op, value)
  values (v_player, 'skill:' || p_key, d.stat, d.op, d.value);
  perform private.emit(v_player, 'skill_learned');
  return private.request_done(v_player, p_request_id, private.skills_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.skill_learn(uuid, text)');

-- Forget everything for money; every point comes back.
create function public.skills_respec(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'skills_respec');
  v_spent int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'skills');
  perform 1 from game.players where id = v_player for update;
  select coalesce(sum(d.cost), 0)::int into v_spent
  from game.skills_owned o join game.skill_defs d on d.key = o.key where o.player_id = v_player;
  if v_spent = 0 then
    perform private.fail('invalid_request');
  end if;
  perform private.money_add(v_player,
    -private.eur(private.cfg_num('skills.respec_base_cents_per_level') * (select level from game.players where id = v_player)), 'respec');
  delete from game.skills_owned where player_id = v_player;
  delete from game.modifiers where player_id = v_player and source like 'skill:%';
  update game.players set skill_points = skill_points + v_spent where id = v_player;
  perform private.emit(v_player, 'skills_respec');
  return private.request_done(v_player, p_request_id, private.skills_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.skills_respec(uuid)');

-- Too Big To Fail: once per run, when the cash is nearly gone, the state pays a share of the net worth.
create function public.bailout_claim(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'bailout_claim');
  v_cents bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform 1 from game.players where id = v_player for update;
  if not private.bailout_ready(v_player) then
    perform private.fail('not_ready');
  end if;
  v_cents := private.bailout_amount(v_player);
  perform private.money_add(v_player, v_cents, 'bailout');
  perform private.emit(v_player, 'bailout');
  perform private.feed_add('bailout', jsonb_build_object('name', (select username from game.players where id = v_player), 'cents', v_cents));
  return private.request_done(v_player, p_request_id, private.skills_doc(v_player)
    || jsonb_build_object('paid_cents', v_cents, 'player', private.me(v_player)));
end $$;
select private.expose('public.bailout_claim(uuid)');

-- ---------------------------------------------------------------------------------------------
-- Hooks: where the skill stats count
-- ---------------------------------------------------------------------------------------------
-- God-Pack-Magnet: god_pack_mult raises the god pack chance (×3 with the keystone).
create or replace function private.roll_pack_cards(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
declare
  v_set text;
  v_slots jsonb;
  g jsonb;
  v_pool text;
  v_n int;
  v_ids text[] := '{}';
  v_pick text[];
  v_god boolean := private.rand() * 1000000
    < private.cfg_num('pack.god_pack_ppm') * (1 + private.stat(p_player, 'god_pack_mult', 0));
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

-- Ankauf-Profi, Feilschkönig: the Kartenladen's rate, at most 80 %.
create function private.ankauf_rate(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select least(8000, private.cfg_num('ankauf.rate_bps') + private.stat(p_player, 'ankauf_bps', 0))
$$;

create or replace function public.ankauf_sell(p_request_id uuid, p_stacks jsonb, p_copies uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ankauf_sell');
  v_rate numeric := private.ankauf_rate(v_player);
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

  -- Raw hits only: the Kartenladen does not buy slabs.
  if coalesce(array_length(p_copies, 1), 0) > 0 then
    with gone as (
      delete from game.card_copies
      where owner_id = v_player and id = any (p_copies) and location = 'inventory' and grader is null
      returning card_id
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

create or replace function public.binder_get(p_set text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_rate numeric := private.ankauf_rate(v_player);
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
        'copies', coalesce(cp.raw, '[]'::jsonb),
        'slabs', coalesce(cp.slabs, '[]'::jsonb)
      ) order by c.no), '[]'::jsonb)
      from game.card_defs c
      left join game.card_stacks s on s.player_id = v_player and s.card_id = c.id
      left join (
        select x.card_id, count(*)::int as n,
          jsonb_agg(x.id order by x.pulled_at) filter (where x.grader is null and x.location = 'inventory') as raw,
          jsonb_agg(jsonb_build_object('copy_id', x.id, 'location', x.location, 'slab', private.slab_doc(x),
            'value_cents', private.slab_value(x.card_id, x.grader, x.grade, x.black_label)) order by x.grade desc, x.graded_at)
            filter (where x.grader is not null) as slabs
        from game.card_copies x where x.owner_id = v_player and x.location in ('inventory', 'vitrine') group by x.card_id
      ) cp on cp.card_id = c.id
      left join game.collection col on col.player_id = v_player and col.card_id = c.id
      where c.set_id = p_set
    )
  );
end $$;

-- Gebührenfuchs: a player seller's Cardmarket fee shrinks by fee_cut_bps.
create or replace function private.sale_ship(
  p_seller uuid, p_npc_seller text, p_buyer uuid, p_npc_buyer text,
  p_kind text, p_item text, p_copy uuid, p_qty int, p_total bigint
) returns void
language plpgsql set search_path = '' as $$
declare
  v_copy uuid := p_copy;
  v_minutes numeric := private.cfg_num('market.ship_min_minutes')
    + private.rand() * (private.cfg_num('market.ship_max_minutes') - private.cfg_num('market.ship_min_minutes'));
  v_slab text;
  v_fee_bps numeric := greatest(0, private.cfg_num('market.fee_bps')
    - case when p_seller is not null then private.stat(p_seller, 'fee_cut_bps', 0) else 0 end);
begin
  if p_kind = 'copy' then
    select upper(grader) || ' ' || case when black_label then 'BL ' else '' end || trim(to_char(grade, 'FM99.9'), '.')
    into v_slab from game.card_copies where id = p_copy and grader is not null;
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
          p_total, round(p_total * v_fee_bps / 10000), private.now() + make_interval(secs => v_minutes * 60), private.now());
  insert into game.sales_log (item_id, qty, price_cents, at, slab) values (p_item, p_qty, p_total / p_qty, private.now(), v_slab);
  if v_slab is null then
    perform private.price_push(p_item, p_total / p_qty);
  end if;
end $$;

-- Silberzunge: NPC buyers offer ad_bonus_pct more for the player's ads (Kevin pays what he wants anyway).
create or replace function private.ad_npc_offer(a game.ads) returns void
language plpgsql set search_path = '' as $$
declare
  v_value bigint := case when a.item_kind = 'copy' then private.copy_value(a.copy_id)
                         else private.card_or_product_value(a.item_id) * a.qty end;
  v_bonus numeric := 1 + private.stat(a.seller_id, 'ad_bonus_pct', 0) / 100;
  v_r numeric := private.rand();
  v_npc game.npcs;
  v_kind text;
  v_price bigint;
begin
  if v_r < 0.5 then
    select * into v_npc from game.npcs where archetype = 'lowballer' order by private.rand() limit 1;
    v_kind := 'lowball';
    v_price := round(v_value * private.rand_between(0.4, 0.6) * v_bonus);
  elsif v_r < 0.85 then
    select * into v_npc from game.npcs where archetype = 'collector' order by private.rand() limit 1;
    v_kind := 'fair';
    v_price := round(v_value * private.rand_between(0.8, 1) * v_bonus);
  else
    select * into v_npc from game.npcs where archetype = 'kid' order by private.rand() limit 1;
    v_kind := 'kid';
    v_price := round(a.ask_cents * private.rand_between(1.1, 1.6));
  end if;
  if v_npc.id is null or v_npc.budget_cents < v_price or v_price < 1 then
    return;
  end if;
  insert into game.ad_offers (ad_id, npc_id, price_cents, state, reply_kind, reply_idx, created_at)
  values (a.id, v_npc.id, v_price, 'open', v_kind, floor(private.rand() * 1000)::int, private.now());
  perform private.notify(a.seller_id, 'ad_offer', jsonb_build_object('item_id', a.item_id, 'name', v_npc.name, 'cents', v_price));
end $$;

-- Stammkunden: NPC collectors buy a trusted player's listings up to the full value.
create or replace function private.npc_buy_cheap(p_npc text, p_kinds text[], p_below_pct numeric, p_max int) returns void
language plpgsql set search_path = '' as $$
declare
  r record;
begin
  for r in
    select id, qty from (
      select l.id, l.qty, l.price_cents,
        case when l.item_kind = 'copy' then private.copy_value(l.copy_id) else pr.value_cents end as worth,
        case when private.stat(l.seller_id, 'npc_trust', 0) > 0 then 100 else p_below_pct end as below
      from game.listings l left join game.prices pr on pr.item_id = l.item_id
      where l.seller_id is not null and l.item_kind = any (p_kinds)
    ) x
    where x.worth > 0 and x.price_cents <= x.worth * x.below / 100
    order by x.price_cents::numeric / x.worth
    limit p_max
  loop
    perform private.npc_buy(p_npc, r.id, r.qty);
  end loop;
end $$;

-- Zinseszins: more bunker yield.
create or replace function private.bunker_rate_base(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('bunker.base_rate_base_cents')
    * power(private.cfg_num('bunker.rate_growth'), private.upgrade_level(p_player, 'bunker_ertrag'))
    * (1 + private.stat(p_player, 'bunker_rate_pct', 0) / 100)
$$;

-- Kevin-Radar: no chargebacks for players with the skill.
create function private.on_chargeback_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.stat(new.player_id, 'no_chargeback', 0) > 0 then
    return null;
  end if;
  return new;
end $$;
create trigger chargebacks_skill before insert on game.chargebacks
  for each row execute function private.on_chargeback_insert();

-- Steuertrick, Zweitkonto, Familienkasse: less gift tax, a bigger daily allowance.
create or replace function private.gift_allowance_left(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, round(private.eur(private.cfg_num('gift.allowance_base_cents_per_level') * p.level)
                           * (1 + private.stat(p.id, 'gift_allowance_pct', 0) / 100))::bigint
    - coalesce((select given_cents from game.gift_days where player_id = p.id and day = private.today()), 0))
  from game.players p where p.id = p_player
$$;

create or replace function private.gift_tax(p_player uuid, p_gift bigint) returns bigint
language sql stable set search_path = '' as $$
  select round(greatest(0, p_gift - private.gift_allowance_left(p_player)) * private.cfg_num('gift.tax_bps') / 10000
               * greatest(0, 1 - private.stat(p_player, 'gift_tax_cut_pct', 0) / 100))::bigint
$$;

-- Menschenkenner (knick, ghost) and Der Pate (the seller's pain threshold) on the Kleinanzeigen board.
create or replace function private.ads_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlocked', (select level from game.players where id = p_player) >= private.cfg_num('unlock.kleinanzeigen'),
    'unlock_level', private.cfg_num('unlock.kleinanzeigen'),
    'slots', private.cfg_num('ads.player_slots')::int,
    'board', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'seller', (select n.name from game.npcs n where n.id = a.npc_id), 'seller_idx', a.seller_idx,
      'npc', a.npc_id is not null, 'style', a.style, 'title_idx', a.title_idx,
      'item_kind', a.item_kind, 'item_id', a.item_id, 'qty', a.qty, 'ask_cents', a.ask_cents,
      'value_cents', private.card_or_product_value(a.item_id) * a.qty,
      'created_at', a.created_at, 'expires_at', a.expires_at,
      'suspicious', (a.risk = 'fake' and private.stat(p_player, 'fake_sense', 0) > 0)
                    or (a.risk in ('knick', 'ghost') and private.stat(p_player, 'risk_sense', 0) > 0),
      'min_cents', case when private.stat(p_player, 'pate', 0) > 0 then a.min_cents end,
      'mine', (select jsonb_build_object('price_cents', o.price_cents, 'state', o.state, 'counter_cents', o.counter_cents,
                 'reply_kind', o.reply_kind, 'reply_idx', o.reply_idx)
               from game.ad_offers o where o.ad_id = a.id and o.player_id = p_player order by o.id desc limit 1)
    ) order by a.created_at desc) from game.ads a where a.seller_id is null), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'item_kind', a.item_kind, 'item_id', a.item_id, 'qty', a.qty, 'ask_cents', a.ask_cents,
      'value_cents', case when a.item_kind = 'copy' then private.copy_value(a.copy_id)
                          else private.card_or_product_value(a.item_id) * a.qty end,
      'slab', private.slab_of(a.copy_id), 'expires_at', a.expires_at,
      'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', n.name, 'archetype', n.archetype,
                  'price_cents', o.price_cents, 'reply_kind', o.reply_kind, 'reply_idx', o.reply_idx) order by o.id)
                from game.ad_offers o join game.npcs n on n.id = o.npc_id where o.ad_id = a.id and o.state = 'open'), '[]'::jsonb)
    ) order by a.created_at desc) from game.ads a where a.seller_id = p_player), '[]'::jsonb),
    'owned', jsonb_build_object(
      'stacks', coalesce((select jsonb_agg(jsonb_build_object('item_id', card_id, 'qty', qty) order by card_id)
                          from game.card_stacks where player_id = p_player and qty > 0), '[]'::jsonb),
      'copies', coalesce((select jsonb_agg(jsonb_build_object('copy_id', c.id, 'item_id', c.card_id, 'slab', private.slab_doc(c),
                            'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label)) order by c.card_id, c.pulled_at)
                          from game.card_copies c where c.owner_id = p_player and c.location = 'inventory'), '[]'::jsonb),
      'sealed', coalesce((select jsonb_agg(jsonb_build_object('item_id', product_id, 'qty', qty) order by product_id)
                          from game.sealed where player_id = p_player and qty > 0), '[]'::jsonb)
    )
  )
$$;
