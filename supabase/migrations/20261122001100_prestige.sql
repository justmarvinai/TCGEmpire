-- alpha_11 (Mogul), part 1: Prestige, "Der Exit" (docs/GAME_DESIGN.md §20, docs/ECONOMY.md §11).
-- From level 100 the empire is sold: Empire-Sterne for every exit and for the value that is given up (cash, company,
-- bunker, home, not the collection), then level, money, upgrades, skills, bunker, shifts, company and home start over.
-- Cards and sealed product move to Omas Dachboden: they count in net worth and for goals, and come back only as
-- fast as a daily value limit (and the Lager) allow. Perks are bought with Sterne and survive every exit.

alter table game.card_copies drop constraint card_copies_location_check;
alter table game.card_copies add constraint card_copies_location_check
  check (location in ('inventory', 'listed', 'shipping', 'grading', 'vitrine', 'attic'));

-- Omas Dachboden: bulk cards and sealed product (hits keep their copy rows with location 'attic').
create table game.attic (
  player_id uuid not null references game.players (id) on delete cascade,
  kind text not null check (kind in ('card', 'sealed')),
  item_id text not null,
  qty int not null check (qty > 0),
  primary key (player_id, kind, item_id)
);
alter table game.attic enable row level security;

create table game.attic_days (
  player_id uuid not null references game.players (id) on delete cascade,
  day date not null,
  value_cents bigint not null,
  primary key (player_id, day)
);
alter table game.attic_days enable row level security;

create table game.perks_owned (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null,
  level int not null check (level > 0),
  primary key (player_id, key)
);
alter table game.perks_owned enable row level security;

create table game.prestiges (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  n int not null,
  stars int not null,
  value_cents bigint not null,
  started_at timestamptz not null,
  at timestamptz not null
);
create index prestiges_player on game.prestiges (player_id, n);
alter table game.prestiges enable row level security;

-- An account reset (Gefahrenzone) also clears perks, the attic and the exits.
create function private.on_player_reset_prestige() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.attic where player_id = new.id;
    delete from game.attic_days where player_id = new.id;
    delete from game.perks_owned where player_id = new.id;
    delete from game.prestiges where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_prestige after update of reset_at on game.players
  for each row execute function private.on_player_reset_prestige();

-- The attic counts in net worth.
create or replace function private.net_worth(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (
      (select cash_cents from game.players where id = p_player)
    + coalesce(private.eur(private.bunker_content_base(p_player)), 0)
    + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_player)
    + (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_player)
    + (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed where player_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.listings
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(price_cents * qty), 0) from game.buy_orders where buyer_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.shipments
       where buyer_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(total_cents - fee_cents), 0) from game.shipments where seller_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.ads
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(paid_cents), 0) from game.homes where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
    + (select coalesce(sum(paid_cents), 0) from game.furnishings where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
    + (select coalesce(sum(principal_cents), 0) from game.loans where lender_id = p_player and state = 'active')
    - (select coalesce(sum(principal_cents), 0) from game.loans where borrower_id = p_player and state = 'active')
    + private.company_value(p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.attic where player_id = p_player)
    - (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed_marks where player_id = p_player and by_id = p_player)
  )::numeric)::bigint
$$;

-- Attic cards are part of the collection, which attacks cannot touch.
create or replace function private.attack_cap_left(p_victim uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, (private.net_worth(p_victim)
      - (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_victim)
      - (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_victim)
      - (select coalesce(sum(private.card_value(item_id) * qty), 0) from game.attic where player_id = p_victim and kind = 'card')
    ) * private.cfg_num('darkside.loss_cap_bps') / 10000
    - (select coalesce(sum(loss_cents), 0) from game.attacks
       where victim_id = p_victim and success and at >= (private.today()::timestamp at time zone 'Europe/Berlin')))::bigint
$$;

-- ---------------------------------------------------------------------------------------------
-- The exit
-- ---------------------------------------------------------------------------------------------
-- What the exit gives up and turns into Sterne: everything but the collection (cards, sealed, attic).
create function private.prestige_value(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, private.net_worth(p_player)
    - (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_player)
    - (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_player)
    - (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed where player_id = p_player)
    - (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.attic where player_id = p_player))
$$;

create function private.prestige_stars(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('prestige.stars_base')
    + floor(sqrt(private.prestige_value(p_player)::numeric / private.eur(private.cfg_num('prestige.value_unit_base_cents')))))::int
$$;

-- What still runs and has to be finished before the exit (kind → count).
create function private.prestige_blockers(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, n) filter (where n > 0), '{}'::jsonb) from (values
    ('listings', (select count(*) from game.listings where seller_id = p_player)),
    ('buy_orders', (select count(*) from game.buy_orders where buyer_id = p_player)),
    ('shipments', (select count(*) from game.shipments where buyer_id = p_player or seller_id = p_player)),
    ('ads', (select count(*) from game.ads where seller_id = p_player)),
    ('grading', (select count(*) from game.grading_orders where player_id = p_player)),
    ('company_orders', (select count(*) from game.grading_orders o join game.companies c on o.grader = 'co:' || c.id
                        where c.owner_id = p_player)),
    ('loans', (select count(*) from game.loans where (lender_id = p_player or borrower_id = p_player) and state = 'active')),
    ('battles', (select count(*) from game.battle_seats s join game.battles b on b.id = s.battle_id
                 where s.player_id = p_player and b.state in ('open', 'running'))),
    ('breaks', (select count(*) from game.breaks b where b.state in ('open', 'running') and (b.host_id = p_player
                 or exists (select 1 from game.break_spots s where s.break_id = b.id and s.player_id = p_player)))),
    ('group_orders', (select count(*) from game.group_order_shares s join game.group_orders g on g.id = s.order_id
                      where s.player_id = p_player and g.state = 'open'))
  ) b(k, n)
$$;

-- Value Oma gives back per day: minutes of reference income, more with the perk.
create function private.attic_limit(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select round(private.eur(private.ref_income_base((select level from game.players where id = p_player))
    * private.cfg_num('attic.daily_minutes') / 60) * (1 + private.stat(p_player, 'attic_pct', 0) / 100))::bigint
$$;

create function private.prestige_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.prestige')::int,
    'prestige', p.prestige,
    'stars', p.stars,
    'preview', jsonb_build_object('stars', private.prestige_stars(p.id), 'base', private.cfg_num('prestige.stars_base')::int,
      'value_cents', private.prestige_value(p.id), 'unit_cents', private.eur(private.cfg_num('prestige.value_unit_base_cents')),
      'start_cents', private.eur(private.cfg_num('start.cash_base_cents') + private.stat(p.id, 'start_cash_base', 0)),
      'ruf_after', round(500 + (p.ruf - 500) * private.cfg_num('prestige.ruf_keep_pct') / 100)::int),
    'blockers', private.prestige_blockers(p.id),
    'perks', (select jsonb_object_agg(d.key, jsonb_build_object('level', coalesce(o.level, 0),
                'cost', case when coalesce(o.level, 0) < (d.value ->> 'max')::int
                             then round((d.value ->> 'costBase')::numeric * power((d.value ->> 'growth')::numeric, coalesce(o.level, 0)))::int end))
              from jsonb_each(private.cfg('prestige.perks')) d
              left join game.perks_owned o on o.player_id = p.id and o.key = d.key),
    'attic', jsonb_build_object(
      'limit_cents', private.attic_limit(p.id),
      'used_cents', coalesce((select value_cents from game.attic_days where player_id = p.id and day = private.today()), 0),
      'items', coalesce((select jsonb_agg(jsonb_build_object('kind', a.kind, 'item_id', a.item_id, 'qty', a.qty,
                  'value_cents', private.card_or_product_value(a.item_id)) order by a.kind, a.item_id)
                from game.attic a where a.player_id = p.id), '[]'::jsonb),
      'copies', coalesce((select jsonb_agg(jsonb_build_object('copy_id', c.id, 'card_id', c.card_id, 'grader', c.grader, 'grade', c.grade,
                  'black_label', c.black_label, 'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label))
                  order by private.slab_value(c.card_id, c.grader, c.grade, c.black_label) desc, c.id)
                from game.card_copies c where c.owner_id = p.id and c.location = 'attic'), '[]'::jsonb)),
    'history', coalesce((select jsonb_agg(jsonb_build_object('n', x.n, 'stars', x.stars, 'value_cents', x.value_cents,
                  'started_at', x.started_at, 'at', x.at) order by x.n)
                from game.prestiges x where x.player_id = p.id), '[]'::jsonb)
  )
  from game.players p where p.id = p_player
$$;

create function public.prestige_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.prestige_doc(v_player);
end $$;
select private.expose('public.prestige_get()');

-- Der Exit (typed confirmation = username, like the Gefahrenzone).
create function public.prestige_exit(p_request_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'prestige_exit');
  r game.players;
  v_stars int;
  v_value bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into r from game.players where id = v_player for update;
  if r.level < private.cfg_num('unlock.prestige') then
    perform private.fail('locked');
  end if;
  if lower(btrim(coalesce(p_confirm, ''))) <> r.username_key then
    perform private.fail('confirm_wrong');
  end if;
  if private.prestige_blockers(v_player) <> '{}'::jsonb then
    perform private.fail('prestige_busy');
  end if;
  v_value := private.prestige_value(v_player);
  v_stars := private.prestige_stars(v_player);

  -- what was still pending goes away
  delete from game.trades where from_id = v_player or to_id = v_player;
  update game.loans set state = 'cancelled', closed_at = private.now()
  where (lender_id = v_player or borrower_id = v_player) and state = 'offered';

  -- the collection moves up to Oma's attic (prepared boosters lose their marks: Oma does not care)
  insert into game.attic (player_id, kind, item_id, qty)
  select v_player, 'card', card_id, qty from game.card_stacks where player_id = v_player and qty > 0
  on conflict (player_id, kind, item_id) do update set qty = game.attic.qty + excluded.qty;
  delete from game.card_stacks where player_id = v_player;
  update game.card_copies set location = 'attic' where owner_id = v_player and location in ('inventory', 'vitrine');
  delete from game.sealed_marks where player_id = v_player;
  insert into game.attic (player_id, kind, item_id, qty)
  select v_player, 'sealed', product_id, qty from game.sealed where player_id = v_player and qty > 0
  on conflict (player_id, kind, item_id) do update set qty = game.attic.qty + excluded.qty;
  delete from game.sealed where player_id = v_player;

  -- the empire is sold
  delete from game.companies where owner_id = v_player;
  delete from game.company_founding where player_id = v_player;
  delete from game.upgrades_owned where player_id = v_player;
  delete from game.skills_owned where player_id = v_player;
  delete from game.modifiers where player_id = v_player
    and (source like 'upgrade:%' or source like 'skill:%' or source = 'home' or source like 'furniture:%');
  delete from game.furnishings where player_id = v_player;
  delete from game.homes where player_id = v_player;
  delete from game.insurance where player_id = v_player and kind = 'hausrat';
  delete from game.bunker where player_id = v_player;
  delete from game.shifts where player_id = v_player;
  delete from game.job_hours where player_id = v_player;
  delete from game.quests where player_id = v_player;

  insert into game.prestiges (player_id, n, stars, value_cents, started_at, at)
  values (v_player, r.prestige + 1, v_stars, v_value,
          coalesce((select max(at) from game.prestiges where player_id = v_player), r.reset_at, r.created_at), private.now());
  if r.cash_cents > 0 then
    perform private.money_add(v_player, -r.cash_cents, 'prestige');
  end if;
  update game.players
  set level = 1, ep = 0, skill_points = 0, energy = private.cfg_num('energy.max')::int, energy_at = private.now(),
      ruf = round(500 + (ruf - 500) * private.cfg_num('prestige.ruf_keep_pct') / 100)::int,
      prestige = prestige + 1, stars = stars + v_stars
  where id = v_player;
  perform private.money_add(v_player, private.eur(private.cfg_num('start.cash_base_cents') + private.stat(v_player, 'start_cash_base', 0)),
    'start_capital');
  perform private.quests_fill(v_player);
  perform private.emit(v_player, 'prestige_done');
  perform private.feed_add('prestige', jsonb_build_object('name', r.username, 'n', r.prestige + 1, 'stars', v_stars));
  return private.request_done(v_player, p_request_id, private.prestige_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.prestige_exit(uuid, text)');

-- A perk level for Sterne; it stays for good.
create function public.perk_buy(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'perk_buy');
  d jsonb := private.cfg('prestige.perks') -> p_key;
  v_level int;
  v_cost int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if d is null then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  v_level := coalesce((select level from game.perks_owned where player_id = v_player and key = p_key), 0);
  if v_level >= (d ->> 'max')::int then
    perform private.fail('upgrade_max');
  end if;
  v_cost := round((d ->> 'costBase')::numeric * power((d ->> 'growth')::numeric, v_level))::int;
  update game.players set stars = stars - v_cost where id = v_player and stars >= v_cost;
  if not found then
    perform private.fail('not_enough_stars');
  end if;
  insert into game.perks_owned (player_id, key, level) values (v_player, p_key, 1)
  on conflict (player_id, key) do update set level = game.perks_owned.level + 1;
  insert into game.modifiers (player_id, source, stat, op, value)
  values (v_player, 'perk:' || p_key, d ->> 'stat', d ->> 'op', (d ->> 'per')::numeric * (v_level + 1))
  on conflict (player_id, source, stat) do update set op = excluded.op, value = excluded.value;
  perform private.emit(v_player, 'perk_bought');
  return private.request_done(v_player, p_request_id, private.prestige_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.perk_buy(uuid, text)');

-- Bring something down from the attic: bulk cards or sealed (p_item, p_qty) or one hit (p_copy). The day's value
-- limit holds, except that the first thing of a day may be worth more on its own.
create function public.attic_retrieve(p_request_id uuid, p_kind text, p_item text, p_copy uuid, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'attic_retrieve');
  c game.card_copies;
  v_value bigint;
  v_used bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform 1 from game.players where id = v_player for update;
  if p_kind = 'copy' then
    select * into c from game.card_copies where id = p_copy and owner_id = v_player and location = 'attic';
    if not found then
      perform private.fail('not_owned');
    end if;
    v_value := private.slab_value(c.card_id, c.grader, c.grade, c.black_label);
  elsif p_kind in ('card', 'sealed') and p_qty > 0 then
    if coalesce((select qty from game.attic where player_id = v_player and kind = p_kind and item_id = p_item), 0) < p_qty then
      perform private.fail('not_owned');
    end if;
    v_value := private.card_or_product_value(p_item) * p_qty;
  else
    perform private.fail('invalid_request');
  end if;
  v_used := coalesce((select value_cents from game.attic_days where player_id = v_player and day = private.today()), 0);
  if v_used > 0 and v_used + v_value > private.attic_limit(v_player) then
    perform private.fail('attic_limit');
  end if;
  if p_kind = 'copy' then
    update game.card_copies set location = 'inventory' where id = c.id;
  else
    if p_kind = 'sealed' then
      perform private.lager_check(v_player, p_qty);
    end if;
    update game.attic set qty = qty - p_qty where player_id = v_player and kind = p_kind and item_id = p_item;
    delete from game.attic where player_id = v_player and kind = p_kind and item_id = p_item and qty = 0;
    if p_kind = 'card' then
      insert into game.card_stacks (player_id, card_id, qty) values (v_player, p_item, p_qty)
      on conflict (player_id, card_id) do update set qty = game.card_stacks.qty + excluded.qty;
    else
      perform private.sealed_add(v_player, p_item, p_qty);
    end if;
  end if;
  insert into game.attic_days (player_id, day, value_cents) values (v_player, private.today(), v_value)
  on conflict (player_id, day) do update set value_cents = game.attic_days.value_cents + excluded.value_cents;
  return private.request_done(v_player, p_request_id, private.prestige_doc(v_player));
end $$;
select private.expose('public.attic_retrieve(uuid, text, text, uuid, int)');
