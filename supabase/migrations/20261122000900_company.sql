-- alpha_09 (Firma), part 1: the grading company (docs/GAME_DESIGN.md §9, docs/ECONOMY.md §9).
-- Gewerbeanmeldung (fee and waiting time, then the Passierschein A38), founding with name, slogan and slab label.
-- The company has its own account. Customers arrive by stage, Ruf, price, hype and speed; four stations
-- (Annahme, Prüfung, Einschweißen, Versand) work them off, the slowest one limits everything. Staff come from a
-- daily applicant pool; equipment multiplies a station. Settled in cycles by the tick (and when the owner looks).

create table game.company_founding (
  player_id uuid primary key references game.players (id) on delete cascade,
  step int not null check (step in (1, 2)),
  ready_at timestamptz not null
);
alter table game.company_founding enable row level security;

create table game.companies (
  id bigint generated always as identity primary key,
  owner_id uuid not null references game.players (id) on delete cascade,
  name text not null,
  slogan text not null default '',
  label jsonb not null,
  stage int not null default 1,
  stage_pending int,
  stage_ready_at timestamptz,
  cash_cents bigint not null default 0 check (cash_cents >= 0),
  prices jsonb not null,
  equipment jsonb not null default '{"annahme": 0, "pruefung": 0, "slabbing": 0, "versand": 0}',
  backlog numeric not null default 0,
  ruf_frac numeric not null default 0,
  invested_cents bigint not null default 0,
  orders_total numeric not null default 0,
  staff_day date,
  last_cycle_at timestamptz not null,
  founded_at timestamptz not null,
  closed_at timestamptz
);
create unique index companies_owner_open on game.companies (owner_id) where closed_at is null;
create unique index companies_name_open on game.companies (lower(name)) where closed_at is null;
create index companies_owner on game.companies (owner_id);
alter table game.companies enable row level security;

create table game.company_staff (
  id bigint generated always as identity primary key,
  company_id bigint not null references game.companies (id) on delete cascade,
  archetype text not null,
  first_idx int not null,
  last_idx int not null,
  station text not null check (station in ('annahme', 'pruefung', 'slabbing', 'versand')),
  tempo int not null check (tempo between 1 and 100),
  accuracy int not null check (accuracy between 1 and 100),
  loyalty int not null check (loyalty between 0 and 100),
  wage_base_cents bigint not null,
  trainings int not null default 0,
  hired_at timestamptz not null
);
create index company_staff_company on game.company_staff (company_id);
alter table game.company_staff enable row level security;

create table game.company_applicants (
  id bigint generated always as identity primary key,
  company_id bigint not null references game.companies (id) on delete cascade,
  day date not null,
  archetype text not null,
  first_idx int not null,
  last_idx int not null,
  tempo int not null,
  accuracy int not null,
  loyalty int not null,
  wage_base_cents bigint not null
);
create index company_applicants_company on game.company_applicants (company_id, day);
alter table game.company_applicants enable row level security;

create table game.company_days (
  company_id bigint not null references game.companies (id) on delete cascade,
  day date not null,
  orders numeric not null default 0,
  revenue_cents bigint not null default 0,
  costs_cents bigint not null default 0,
  primary key (company_id, day)
);
alter table game.company_days enable row level security;

create table game.company_reviews (
  id bigint generated always as identity primary key,
  company_id bigint not null references game.companies (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  text_idx int not null,
  at timestamptz not null
);
create index company_reviews_company on game.company_reviews (company_id, id);
alter table game.company_reviews enable row level security;

-- A reset closes the company: its slabs stay in the world with the label of a bankrupt brand.
create function private.on_player_reset_company() returns trigger
language plpgsql set search_path = '' as $$
begin
  update game.companies set closed_at = private.now() where owner_id = new.id and closed_at is null;
  delete from game.company_founding where player_id = new.id;
  return null;
end $$;
create trigger players_reset_company after update of reset_at on game.players
  for each row when (new.reset_at is distinct from old.reset_at) execute function private.on_player_reset_company();

-- ---------------------------------------------------------------------------------------------
-- Model
-- ---------------------------------------------------------------------------------------------
create function private.company_stage_def(p_stage int) returns jsonb
language sql stable set search_path = '' as $$
  select private.cfg('company.stages') -> (p_stage - 1)
$$;

create function private.company_equipment_def(p_station text, p_level int) returns jsonb
language sql stable set search_path = '' as $$
  select private.cfg('company.equipment') -> p_station -> p_level
$$;

-- Brand of the company's slabs and of its fair price, in basis points of PSA.
create function private.company_brand_bps(p_company bigint) returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select (private.cfg_num('company.brand_base_bps') + private.cfg_num('company.brand_per_ruf_bps') * p.ruf)::int
    from game.companies c join game.players p on p.id = c.owner_id where c.id = p_company and c.closed_at is null
  ), private.cfg_num('company.brand_base_bps')::int)
$$;

-- Customer factor of the owner's Ruf: piecewise linear over company.ruf_points.
create function private.company_ruf_factor(p_ruf int) returns numeric
language sql stable set search_path = '' as $$
  with pts as (
    select (e ->> 0)::numeric as x, (e ->> 1)::numeric as y, i
    from jsonb_array_elements(private.cfg('company.ruf_points')) with ordinality as t(e, i)
  )
  select coalesce((
    select a.y + (b.y - a.y) * (p_ruf - a.x) / nullif(b.x - a.x, 0)
    from pts a join pts b on b.i = a.i + 1
    where p_ruf between a.x and b.x order by a.i limit 1
  ), (select y from pts order by i desc limit 1))
$$;

-- Orders per hour each station manages: (owner + staff) × equipment. Unpaid staff do not work.
create function private.company_caps(c game.companies, p_paid boolean) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_object_agg(s.station, round(
    (private.cfg('company.per_worker') ->> s.station)::numeric
    * (private.cfg_num('company.owner_help')
       + case when p_paid then coalesce((select sum(tempo) / 50.0 from game.company_staff where company_id = c.id and station = s.station), 0) else 0 end)
    * (private.company_equipment_def(s.station, (c.equipment ->> s.station)::int) ->> 'mult')::numeric, 2))
  from unnest(array['annahme', 'pruefung', 'slabbing', 'versand']) as s(station)
$$;

create function private.company_capacity(c game.companies, p_paid boolean) returns numeric
language sql stable set search_path = '' as $$
  select min(value::numeric) * (private.company_stage_def(c.stage) ->> 'shiftMult')::numeric
  from jsonb_each_text(private.company_caps(c, p_paid))
$$;

-- Share of correct grades in percent: the people at the Prüfung (and the owner) plus the tools.
create function private.company_accuracy(c game.companies, p_paid boolean) returns numeric
language sql stable set search_path = '' as $$
  select least(private.cfg_num('company.accuracy_max'), round(
    private.cfg_num('company.accuracy_base')
    + private.cfg_num('company.accuracy_per_stat')
      * (private.cfg_num('company.owner_help') * 50 + case when p_paid then coalesce(sum(s.tempo / 50.0 * s.accuracy), 0) else 0 end)
      / (private.cfg_num('company.owner_help') + case when p_paid then coalesce(sum(s.tempo / 50.0), 0) else 0 end)
    + (private.company_equipment_def('pruefung', (c.equipment ->> 'pruefung')::int) ->> 'accuracy')::numeric, 1))
  from game.company_staff s where s.company_id = c.id and s.station = 'pruefung'
$$;

-- Running costs per hour (real cents): wages, rent and electricity.
create function private.company_costs(c game.companies) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'wages', private.eur(coalesce((select sum(wage_base_cents) from game.company_staff where company_id = c.id), 0)),
    'rent', private.eur((private.company_stage_def(c.stage) ->> 'rentBaseCents')::numeric),
    'power', private.eur((select sum((private.company_equipment_def(s, (c.equipment ->> s)::int) ->> 'powerBaseCents')::numeric)
                          from unnest(array['annahme', 'pruefung', 'slabbing', 'versand']) s)),
    'material', private.eur(private.cfg_num('company.material_base_cents')))
$$;

-- Extension points for the later parts of the company (player orders, VIP orders, decisions, shady business):
-- extra fields of the company document, extra work in every cycle.
create function private.company_extra(c game.companies) returns jsonb
language sql stable set search_path = '' as $$
  select '{}'::jsonb
$$;

create function private.company_cycle_extra(c game.companies, p_hours numeric, p_orders numeric) returns void
language sql set search_path = '' as $$
  select null::void
$$;

-- Marketing multiplier (campaigns come with the decisions; 1 until then).
create function private.company_marketing(c game.companies) returns numeric
language sql stable set search_path = '' as $$
  select 1::numeric
$$;

-- Customers per hour per service and the factors behind them.
create function private.company_demand(c game.companies, p_capacity numeric) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  st jsonb := private.company_stage_def(c.stage);
  v_ruf int := (select ruf from game.players where id = c.owner_id);
  v_ruf_f numeric := private.company_ruf_factor(v_ruf);
  v_hype numeric := coalesce((select avg(hype) from game.market), 1);
  v_brand numeric := private.company_brand_bps(c.id) / 10000.0;
  v_hours numeric := c.backlog / greatest(p_capacity, 0.01);
  v_speed numeric := case when v_hours <= private.cfg_num('company.speed_hours') then 1
                          else greatest(private.cfg_num('company.speed_min'), private.cfg_num('company.speed_hours') / v_hours) end;
  v_mkt numeric := private.company_marketing(c);
  v_services jsonb := '{}';
  v_total numeric := 0;
  v_money numeric := 0;
  s text;
  v_fair numeric;
  v_price numeric;
  v_pf numeric;
  v_d numeric;
begin
  for s in select jsonb_array_elements_text(st -> 'services') loop
    v_fair := private.eur((private.cfg('company.services') -> s ->> 'ref_fee_base_cents')::numeric) * v_brand;
    v_price := greatest(1, (c.prices ->> s)::numeric);
    v_pf := least(private.cfg_num('company.price_factor_max'), greatest(private.cfg_num('company.price_factor_min'),
              power(v_fair / v_price, private.cfg_num('company.price_elasticity'))));
    v_d := (st ->> 'baseDemand')::numeric * (private.cfg('company.services') -> s ->> 'share')::numeric
           * v_ruf_f * v_hype * v_pf * v_speed * v_mkt;
    v_services := v_services || jsonb_build_object(s, jsonb_build_object('demand', round(v_d, 2), 'price_factor', round(v_pf, 2),
      'fair_cents', round(v_fair)::bigint, 'price_cents', v_price::bigint));
    v_total := v_total + v_d;
    v_money := v_money + v_d * v_price;
  end loop;
  return jsonb_build_object('total', round(v_total, 2), 'avg_price_cents', case when v_total > 0 then round(v_money / v_total) else 0 end,
    'services', v_services, 'ruf_factor', round(v_ruf_f, 2), 'hype', round(v_hype, 2), 'speed', round(v_speed, 2),
    'marketing', round(v_mkt, 2), 'backlog_hours', round(v_hours, 1));
end $$;

-- Today's applicants (a fresh pool every German day).
create function private.company_applicants_ensure(c game.companies) returns void
language plpgsql set search_path = '' as $$
declare
  st jsonb := private.company_stage_def(c.stage);
  a jsonb;
  v_total numeric;
  v_pick numeric;
  i int;
  r numeric;
begin
  if exists (select 1 from game.company_applicants where company_id = c.id and day = private.today()) then
    return;
  end if;
  delete from game.company_applicants where company_id = c.id;
  v_total := (select sum((e ->> 'weight')::numeric) from jsonb_array_elements(private.cfg('company.applicants')) e);
  for i in 1 .. private.cfg_num('company.applicants_per_day')::int loop
    v_pick := private.rand() * v_total;
    for a in select e from jsonb_array_elements(private.cfg('company.applicants')) e loop
      v_pick := v_pick - (a ->> 'weight')::numeric;
      exit when v_pick < 0;
    end loop;
    r := private.rand();
    insert into game.company_applicants (company_id, day, archetype, first_idx, last_idx, tempo, accuracy, loyalty, wage_base_cents)
    values (c.id, private.today(), a ->> 'key',
      floor(private.rand() * private.cfg_num('company.first_names'))::int, floor(private.rand() * private.cfg_num('company.last_names'))::int,
      least(100, round((a -> 'tempo' ->> 0)::numeric + private.rand() * ((a -> 'tempo' ->> 1)::numeric - (a -> 'tempo' ->> 0)::numeric)) + (st ->> 'statBonus')::int),
      least(100, round((a -> 'accuracy' ->> 0)::numeric + private.rand() * ((a -> 'accuracy' ->> 1)::numeric - (a -> 'accuracy' ->> 0)::numeric)) + (st ->> 'statBonus')::int),
      round((a -> 'loyalty' ->> 0)::numeric + private.rand() * ((a -> 'loyalty' ->> 1)::numeric - (a -> 'loyalty' ->> 0)::numeric)),
      round((st ->> 'wageBaseCents')::numeric * ((a -> 'wage' ->> 0)::numeric + r * ((a -> 'wage' ->> 1)::numeric - (a -> 'wage' ->> 0)::numeric))));
  end loop;
end $$;

create function private.company_book(p_company bigint, p_orders numeric, p_revenue bigint, p_costs bigint) returns void
language sql set search_path = '' as $$
  insert into game.company_days (company_id, day, orders, revenue_cents, costs_cents)
  values (p_company, private.today(), p_orders, p_revenue, p_costs)
  on conflict (company_id, day) do update set orders = game.company_days.orders + excluded.orders,
    revenue_cents = game.company_days.revenue_cents + excluded.revenue_cents,
    costs_cents = game.company_days.costs_cents + excluded.costs_cents
$$;

-- Spending from the company account (equipment, stages, training, severance).
create function private.company_spend(p_company bigint, p_cents bigint) returns void
language plpgsql set search_path = '' as $$
begin
  update game.companies set cash_cents = cash_cents - p_cents where id = p_company and cash_cents >= p_cents;
  if not found then
    perform private.fail('company_broke');
  end if;
end $$;

-- One cycle: everything since the last one (at most company.catchup_hours).
create function private.company_cycle(p_company bigint) returns void
language plpgsql set search_path = '' as $$
declare
  c game.companies;
  v_now timestamptz := private.now();
  v_dt numeric;
  v_costs jsonb;
  v_fixed numeric;
  v_paid boolean;
  v_cap numeric;
  v_dem jsonb;
  v_demand numeric;
  v_backlog numeric;
  v_proc numeric;
  v_rev bigint;
  v_cost bigint;
  v_acc numeric;
  v_drift numeric;
  v_step int;
  v_reviews int;
  v_stars int;
  s record;
  i int;
begin
  select * into c from game.companies where id = p_company and closed_at is null for update skip locked;
  if not found then
    return;
  end if;
  if c.stage_pending is not null and c.stage_ready_at <= v_now then
    update game.companies set stage = stage_pending, stage_pending = null, stage_ready_at = null where id = c.id returning * into c;
    perform private.notify(c.owner_id, 'company_stage', jsonb_build_object('stage', c.stage));
  end if;
  -- a new German day: loyalty, resignations, applicants
  if c.staff_day is distinct from private.today() then
    update game.company_staff set loyalty = least(100, loyalty + private.cfg_num('company.loyalty_daily')::int) where company_id = c.id;
    for s in select * from game.company_staff where company_id = c.id and loyalty < private.cfg_num('company.quit_below') loop
      if private.rand() * 100 < private.cfg_num('company.quit_pct') then
        delete from game.company_staff where id = s.id;
        perform private.notify(c.owner_id, 'staff_quit', jsonb_build_object('archetype', s.archetype, 'first', s.first_idx, 'last', s.last_idx));
      end if;
    end loop;
    update game.companies set staff_day = private.today() where id = c.id returning * into c;
    perform private.company_applicants_ensure(c);
  end if;

  v_dt := least(private.cfg_num('company.catchup_hours'), extract(epoch from v_now - c.last_cycle_at) / 3600);
  if v_dt < 1.0 / 60 then
    return;
  end if;
  v_costs := private.company_costs(c);
  v_fixed := ((v_costs ->> 'wages')::numeric + (v_costs ->> 'rent')::numeric + (v_costs ->> 'power')::numeric) * v_dt;
  v_paid := c.cash_cents >= v_fixed;
  v_cap := private.company_capacity(c, v_paid)
    * case when (select last_seen_at from game.players where id = c.owner_id) < v_now - make_interval(hours => private.cfg_num('company.offline_hours')::int)
           then private.cfg_num('company.offline_factor') else 1 end;
  v_dem := private.company_demand(c, v_cap);
  v_demand := (v_dem ->> 'total')::numeric;
  v_backlog := least(c.backlog + v_demand * v_dt, v_demand * private.cfg_num('company.backlog_max_hours'));
  v_proc := least(v_backlog, v_cap * v_dt);
  v_backlog := v_backlog - v_proc;
  v_rev := round(v_proc * (v_dem ->> 'avg_price_cents')::numeric);
  -- unpaid staff stay at home; rent and power are paid as far as the money goes
  v_cost := round(v_proc * (v_costs ->> 'material')::numeric
    + case when v_paid then v_fixed else ((v_costs ->> 'rent')::numeric + (v_costs ->> 'power')::numeric) * v_dt end);
  v_cost := least(v_cost, c.cash_cents + v_rev);
  -- unpaid staff lose loyalty once a day (with the owner's notice)
  if not v_paid and exists (select 1 from game.company_staff where company_id = c.id)
     and not exists (select 1 from game.notifications where player_id = c.owner_id and kind = 'company_broke'
                     and at > v_now - interval '1 day') then
    update game.company_staff set loyalty = greatest(0, loyalty - private.cfg_num('company.loyalty_unpaid')::int) where company_id = c.id;
    perform private.notify(c.owner_id, 'company_broke', '{}');
  end if;

  -- Ruf: accurate grades and short queues raise it, the opposite lowers it
  if v_proc > 0 then
    v_acc := private.company_accuracy(c, v_paid);
    v_drift := ((v_acc - private.cfg_num('company.ruf_neutral_accuracy')) * private.cfg_num('company.ruf_per_accuracy')
      + case when v_backlog / greatest(v_cap, 0.01) <= private.cfg_num('company.speed_hours') then private.cfg_num('company.ruf_fast')
             else -private.cfg_num('company.ruf_slow') end) * v_dt;
    v_step := trunc(c.ruf_frac + v_drift)::int;
    update game.players set ruf = least(1000, greatest(0, ruf + v_step)) where id = c.owner_id;
    c.ruf_frac := c.ruf_frac + v_drift - v_step;
    -- customers write reviews
    v_reviews := least(5, floor(v_proc / private.cfg_num('company.review_per_orders'))::int
      + case when private.rand() < mod(v_proc / private.cfg_num('company.review_per_orders'), 1) then 1 else 0 end);
    for i in 1 .. v_reviews loop
      v_stars := least(5, greatest(1, round(3 + (v_acc - private.cfg_num('company.ruf_neutral_accuracy')) / 4
        + case when v_backlog / greatest(v_cap, 0.01) <= private.cfg_num('company.speed_hours') then 0.5 else -1 end
        + (private.rand() * 3 - 1.5))::int));
      insert into game.company_reviews (company_id, stars, text_idx, at)
      values (c.id, v_stars, floor(private.rand() * (private.cfg('company.review_counts') ->> (v_stars - 1))::int)::int, v_now);
    end loop;
  end if;

  update game.companies set
    cash_cents = cash_cents + v_rev - v_cost,
    backlog = v_backlog,
    ruf_frac = c.ruf_frac,
    orders_total = orders_total + v_proc,
    last_cycle_at = v_now
  where id = c.id;
  perform private.company_book(c.id, v_proc, v_rev, v_cost);
  perform private.company_cycle_extra((select x from game.companies x where x.id = c.id), v_dt, v_proc);
  delete from game.company_days where company_id = c.id and day < private.today() - 14;
  delete from game.company_reviews where company_id = c.id and id < (select min(id) from (
    select id from game.company_reviews where company_id = c.id order by id desc limit 50) x);
end $$;

create function private.tick_company() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.companies where closed_at is null order by last_cycle_at loop
    begin
      perform private.company_cycle(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('company', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('company', 600);

-- Worth of the company: its cash, half of what went into stages and equipment, and 30 days of the average profit of
-- the last week.
create function private.company_value(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select coalesce((
    select (c.cash_cents + c.invested_cents * private.cfg_num('company.invest_bps') / 10000
      + greatest(0, (select coalesce(sum(revenue_cents - costs_cents), 0) from game.company_days
                     where company_id = c.id and day > private.today() - 7) / 7 * private.cfg_num('company.value_profit_days')))::bigint
    from game.companies c where c.owner_id = p_player and c.closed_at is null
  ), 0)
$$;

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
  )::numeric)::bigint
$$;

-- ---------------------------------------------------------------------------------------------
-- The page: everything about the company, with "Wo es hakt" (what costs money right now and how to fix it)
-- ---------------------------------------------------------------------------------------------
create function private.company_hakt(c game.companies, p_caps jsonb, p_cap numeric, p_dem jsonb, p_acc numeric, p_costs jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_out jsonb := '[]';
  v_demand numeric := (p_dem ->> 'total')::numeric;
  v_margin numeric := (p_dem ->> 'avg_price_cents')::numeric - (p_costs ->> 'material')::numeric;
  v_fixed numeric := (p_costs ->> 'wages')::numeric + (p_costs ->> 'rent')::numeric + (p_costs ->> 'power')::numeric;
  v_shift numeric := (private.company_stage_def(c.stage) ->> 'shiftMult')::numeric;
  v_neck text;
  v_lvl int;
  v_next jsonb;
  v_new numeric;
  v_drift numeric;
  s text;
  v_pf numeric;
  v_fair numeric;
  v_price numeric;
  v_d numeric;
begin
  -- Kasse: the staff stop when the wages cannot be paid
  if c.cash_cents < v_fixed * 6 then
    v_out := v_out || jsonb_build_object('key', 'kasse', 'cents_h', round(least(p_cap, v_demand) * greatest(v_margin, 0)), 'action', 'deposit',
      'need_cents', round(v_fixed * 24));
  end if;
  -- Tempo: customers wait because a station is too slow
  if p_cap < v_demand then
    select key into v_neck from jsonb_each_text(p_caps) order by value::numeric, key limit 1;
    v_lvl := (c.equipment ->> v_neck)::int;
    v_next := case when v_lvl < (private.company_stage_def(c.stage) ->> 'equipmentMax')::int
                   then private.company_equipment_def(v_neck, v_lvl + 1) end;
    if v_next is not null then
      v_new := (select min(case when key = v_neck then value::numeric * (v_next ->> 'mult')::numeric
                                 / (private.company_equipment_def(v_neck, v_lvl) ->> 'mult')::numeric else value::numeric end)
                from jsonb_each_text(p_caps)) * v_shift;
    end if;
    v_out := v_out || jsonb_build_object('key', 'tempo', 'station', v_neck, 'cents_h', round((v_demand - p_cap) * greatest(v_margin, 0)),
      'action', case when v_next is not null then 'equipment' else 'hire' end, 'level', v_lvl + 1,
      'cost_cents', case when v_next is not null then private.eur((v_next ->> 'costBaseCents')::numeric) end,
      'gain_cents_h', case when v_next is not null then round((least(v_new, v_demand) - p_cap) * greatest(v_margin, 0)) end);
  end if;
  -- Bekanntheit: the stations could do more than customers come
  if v_demand < p_cap * 0.8 then
    v_out := v_out || jsonb_build_object('key', 'bekanntheit', 'cents_h', round((p_cap - v_demand) * greatest(v_margin, 0)), 'action', 'marketing');
  end if;
  -- Genauigkeit: wrong grades cost Ruf, Ruf costs customers
  v_drift := (p_acc - private.cfg_num('company.ruf_neutral_accuracy')) * private.cfg_num('company.ruf_per_accuracy');
  if v_drift < 0 then
    v_lvl := (c.equipment ->> 'pruefung')::int;
    v_next := case when v_lvl < (private.company_stage_def(c.stage) ->> 'equipmentMax')::int
                   then private.company_equipment_def('pruefung', v_lvl + 1) end;
    v_out := v_out || jsonb_build_object('key', 'genauigkeit', 'cents_h', round(least(p_cap, v_demand) * greatest(v_margin, 0) * -v_drift * 24 / 1000),
      'action', case when v_next is not null then 'equipment' else 'hire' end, 'station', 'pruefung', 'ruf_h', round(v_drift, 1),
      'level', v_lvl + 1, 'cost_cents', case when v_next is not null then private.eur((v_next ->> 'costBaseCents')::numeric) end);
  end if;
  -- Preis: far from the fair price in either direction
  for s in select jsonb_object_keys(p_dem -> 'services') loop
    v_pf := (p_dem -> 'services' -> s ->> 'price_factor')::numeric;
    v_fair := (p_dem -> 'services' -> s ->> 'fair_cents')::numeric;
    v_price := (p_dem -> 'services' -> s ->> 'price_cents')::numeric;
    v_d := (p_dem -> 'services' -> s ->> 'demand')::numeric;
    if v_pf < 0.6 or (v_pf >= private.cfg_num('company.price_factor_max') and p_cap <= v_demand) then
      v_out := v_out || jsonb_build_object('key', 'preis', 'service', s, 'action', 'price', 'fair_cents', round(v_fair),
        'cents_h', round(abs(least(v_d / v_pf, p_cap) * v_fair - least(v_d, p_cap) * v_price)));
    end if;
  end loop;
  -- Team: someone is about to quit
  for s in select id::text from game.company_staff where company_id = c.id and loyalty < private.cfg_num('company.quit_below') + 10 order by loyalty limit 1 loop
    v_out := v_out || jsonb_build_object('key', 'team', 'staff', s::bigint, 'action', 'raise',
      'cents_h', round(least(p_cap, v_demand) * greatest(v_margin, 0) * private.cfg_num('company.quit_pct') / 100
        / greatest(1, (select count(*) from game.company_staff where company_id = c.id))));
  end loop;
  return (select coalesce(jsonb_agg(x order by (x ->> 'cents_h')::numeric desc), '[]'::jsonb) from jsonb_array_elements(v_out) x);
end $$;

create function private.company_doc(p_player uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  c game.companies;
  f game.company_founding;
  st jsonb;
  v_paid boolean;
  v_caps jsonb;
  v_cap numeric;
  v_dem jsonb;
  v_acc numeric;
  v_costs jsonb;
  v_next jsonb;
begin
  select * into c from game.companies where owner_id = p_player and closed_at is null;
  if not found then
    select * into f from game.company_founding where player_id = p_player;
    return jsonb_build_object(
      'unlock_level', private.cfg_num('unlock.company')::int,
      'found_fee_cents', private.eur(private.cfg_num('company.found_fee_base_cents')),
      'found_cost_cents', private.eur((private.company_stage_def(1) ->> 'costBaseCents')::numeric),
      'founding', case when f.player_id is not null then jsonb_build_object('step', f.step, 'ready_at', f.ready_at) end,
      'company', null);
  end if;
  st := private.company_stage_def(c.stage);
  v_costs := private.company_costs(c);
  v_paid := c.cash_cents >= ((v_costs ->> 'wages')::numeric + (v_costs ->> 'rent')::numeric + (v_costs ->> 'power')::numeric) / 6;
  v_caps := private.company_caps(c, v_paid);
  v_cap := private.company_capacity(c, v_paid);
  v_dem := private.company_demand(c, v_cap);
  v_acc := private.company_accuracy(c, v_paid);
  v_next := private.company_stage_def(c.stage + 1);
  return jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.company')::int,
    'found_fee_cents', private.eur(private.cfg_num('company.found_fee_base_cents')),
    'found_cost_cents', private.eur((private.company_stage_def(1) ->> 'costBaseCents')::numeric),
    'founding', null,
    'company', jsonb_build_object(
      'id', c.id, 'name', c.name, 'slogan', c.slogan, 'label', c.label, 'stage', c.stage,
      'stage_pending', c.stage_pending, 'stage_ready_at', c.stage_ready_at,
      'cash_cents', c.cash_cents, 'prices', c.prices, 'equipment', c.equipment,
      'backlog', round(c.backlog, 1), 'orders_total', floor(c.orders_total), 'founded_at', c.founded_at,
      'staff_cap', (st ->> 'staffCap')::int, 'services', st -> 'services', 'equipment_max', (st ->> 'equipmentMax')::int,
      'caps', v_caps, 'capacity', round(v_cap, 1), 'demand', v_dem, 'accuracy', v_acc, 'paid', v_paid,
      'ruf', (select ruf from game.players where id = p_player), 'brand_bps', private.company_brand_bps(c.id),
      'costs', v_costs,
      'profit_h', round(least(v_cap, (v_dem ->> 'total')::numeric) * ((v_dem ->> 'avg_price_cents')::numeric - (v_costs ->> 'material')::numeric)
                  - (v_costs ->> 'wages')::numeric - (v_costs ->> 'rent')::numeric - (v_costs ->> 'power')::numeric),
      'equipment_next', (select jsonb_object_agg(s, case when (c.equipment ->> s)::int < (st ->> 'equipmentMax')::int then jsonb_build_object(
                            'level', (c.equipment ->> s)::int + 1,
                            'cost_cents', private.eur((private.company_equipment_def(s, (c.equipment ->> s)::int + 1) ->> 'costBaseCents')::numeric)) end)
                         from unnest(array['annahme', 'pruefung', 'slabbing', 'versand']) s),
      'next_stage', case when v_next is not null then jsonb_build_object('stage', c.stage + 1,
                       'cost_cents', private.eur((v_next ->> 'costBaseCents')::numeric), 'wait_minutes', (v_next ->> 'waitMinutes')::int) end,
      'staff', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'archetype', archetype, 'first', first_idx, 'last', last_idx,
                  'station', station, 'tempo', tempo, 'accuracy', accuracy, 'loyalty', loyalty,
                  'wage_cents', private.eur(wage_base_cents), 'trainings', trainings) order by id)
                 from game.company_staff where company_id = c.id), '[]'::jsonb),
      'applicants', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'archetype', archetype, 'first', first_idx, 'last', last_idx,
                  'tempo', tempo, 'accuracy', accuracy, 'loyalty', loyalty, 'wage_cents', private.eur(wage_base_cents)) order by id)
                 from game.company_applicants where company_id = c.id and day = private.today()), '[]'::jsonb),
      'train_cost_hours', private.cfg_num('company.train_wage_hours')::int, 'train_max', private.cfg_num('company.train_max')::int,
      'fire_cost_hours', private.cfg_num('company.fire_wage_hours')::int,
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'orders', floor(orders), 'revenue_cents', revenue_cents,
                  'costs_cents', costs_cents) order by day) from game.company_days where company_id = c.id and day > private.today() - 7), '[]'::jsonb),
      'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'stars', stars, 'text', text_idx, 'at', at) order by id desc)
                 from (select * from game.company_reviews where company_id = c.id order by id desc limit 12) r), '[]'::jsonb),
      'stars_avg', (select round(avg(stars), 1) from game.company_reviews where company_id = c.id),
      'hakt', private.company_hakt(c, v_caps, v_cap, v_dem, v_acc, v_costs),
      'payout_tax_pct', private.cfg_num('company.payout_tax_pct')::int,
      'value_cents', private.company_value(p_player)
    ) || private.company_extra(c)
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
-- Settles the company on the way, so the page is always current.
create function public.company_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  perform private.company_cycle((select id from game.companies where owner_id = v_player and closed_at is null));
  return private.company_doc(v_player);
end $$;
select private.expose('public.company_get()');

-- Gewerbeanmeldung: 'antrag' pays the fee and starts the Bearbeitungszeit; 'a38' is the Passierschein afterwards.
create function public.company_found_step(p_request_id uuid, p_step text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_found_step');
  f game.company_founding;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'company');
  if exists (select 1 from game.companies where owner_id = v_player and closed_at is null) then
    perform private.fail('already_owned');
  end if;
  select * into f from game.company_founding where player_id = v_player for update;
  if p_step = 'antrag' and f.player_id is null then
    perform private.money_add(v_player, -private.eur(private.cfg_num('company.found_fee_base_cents')), 'company_fee', 'gewerbe');
    insert into game.company_founding (player_id, step, ready_at)
    values (v_player, 1, private.now() + make_interval(mins => private.cfg_num('company.found_wait_minutes')::int));
  elsif p_step = 'a38' and f.step = 1 then
    if f.ready_at > private.now() then
      perform private.fail('not_ready');
    end if;
    update game.company_founding set step = 2 where player_id = v_player;
  else
    perform private.fail('invalid_request');
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.company_found_step(uuid, text)');

create function private.company_label_check(p_label jsonb) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_label is null or jsonb_typeof(p_label) <> 'object'
     or not private.cfg('company.label_colors') ? (p_label ->> 'bg')
     or not private.cfg('company.label_colors') ? (p_label ->> 'fg')
     or coalesce(p_label ->> 'emblem', '') !~ '^[0-9a-f]{16}$'
     or (select count(*) from jsonb_object_keys(p_label)) <> 3 then
    perform private.fail('invalid_request');
  end if;
end $$;

create function public.company_found(p_request_id uuid, p_name text, p_slogan text, p_label jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_found');
  v_name text := btrim(coalesce(p_name, ''));
  v_slogan text := btrim(coalesce(p_slogan, ''));
  v_cost bigint := private.eur((private.company_stage_def(1) ->> 'costBaseCents')::numeric);
  v_brand numeric := (private.cfg_num('company.brand_base_bps') + private.cfg_num('company.brand_per_ruf_bps')
                      * (select ruf from game.players where id = v_player)) / 10000.0;
  v_id bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if not exists (select 1 from game.company_founding where player_id = v_player and step = 2) then
    perform private.fail('not_ready');
  end if;
  if length(v_name) not between 3 and 24 or length(v_slogan) > 60 or v_name ~ '[<>]' or v_slogan ~ '[<>]' then
    perform private.fail('invalid_request');
  end if;
  perform private.company_label_check(p_label);
  if exists (select 1 from game.companies where lower(name) = lower(v_name) and closed_at is null) then
    perform private.fail('name_taken');
  end if;
  perform private.money_add(v_player, -v_cost, 'company_found', v_name);
  delete from game.company_founding where player_id = v_player;
  -- prices start at the fair price of every service
  insert into game.companies (owner_id, name, slogan, label, prices, invested_cents, last_cycle_at, founded_at, staff_day)
  values (v_player, v_name, v_slogan, p_label,
    (select jsonb_object_agg(key, round(private.eur((value ->> 'ref_fee_base_cents')::numeric) * v_brand)) from jsonb_each(private.cfg('company.services'))),
    v_cost, private.now(), private.now(), private.today())
  returning id into v_id;
  perform private.company_applicants_ensure((select c from game.companies c where c.id = v_id));
  perform private.feed_add('company_founded', jsonb_build_object('name', (select username from game.players where id = v_player), 'company', v_name));
  perform private.emit(v_player, 'company_founded');
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.company_found(uuid, text, text, jsonb)');

-- Name stays, slogan and label can change.
create function public.company_label_set(p_request_id uuid, p_slogan text, p_label jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_label_set');
  v_slogan text := btrim(coalesce(p_slogan, ''));
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if length(v_slogan) > 60 or v_slogan ~ '[<>]' then
    perform private.fail('invalid_request');
  end if;
  perform private.company_label_check(p_label);
  update game.companies set slogan = v_slogan, label = p_label where owner_id = v_player and closed_at is null;
  if not found then
    perform private.fail('not_found');
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_label_set(uuid, text, jsonb)');

-- Money between the owner and the company: in for free, out with Kapitalertragsteuer.
create function public.company_money(p_request_id uuid, p_cents bigint, p_payout boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_money');
  c game.companies;
  v_net bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_cents is null or p_cents < 1 then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if coalesce(p_payout, false) then
    perform private.company_spend(c.id, p_cents);
    v_net := p_cents - p_cents * private.cfg_num('company.payout_tax_pct')::bigint / 100;
    perform private.money_add(v_player, v_net, 'company_payout', c.id::text);
  else
    perform private.money_add(v_player, -p_cents, 'company_deposit', c.id::text);
    update game.companies set cash_cents = cash_cents + p_cents where id = c.id;
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.company_money(uuid, bigint, boolean)');

create function public.company_prices_set(p_request_id uuid, p_prices jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_prices_set');
  k text;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_prices is null or jsonb_typeof(p_prices) <> 'object' then
    perform private.fail('invalid_request');
  end if;
  for k in select jsonb_object_keys(p_prices) loop
    if not private.cfg('company.services') ? k or jsonb_typeof(p_prices -> k) <> 'number'
       or (p_prices ->> k)::numeric not between 100 and 1000000000 then
      perform private.fail('invalid_request');
    end if;
  end loop;
  update game.companies set prices = prices || (select jsonb_object_agg(key, round(value::numeric)) from jsonb_each_text(p_prices))
  where owner_id = v_player and closed_at is null;
  if not found then
    perform private.fail('not_found');
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_prices_set(uuid, jsonb)');

create function public.company_hire(p_request_id uuid, p_applicant bigint, p_station text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_hire');
  c game.companies;
  a game.company_applicants;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_station is null or p_station not in ('annahme', 'pruefung', 'slabbing', 'versand') then
    perform private.fail('invalid_request');
  end if;
  if (select count(*) from game.company_staff where company_id = c.id) >= (private.company_stage_def(c.stage) ->> 'staffCap')::int then
    perform private.fail('no_slots');
  end if;
  delete from game.company_applicants where id = p_applicant and company_id = c.id and day = private.today() returning * into a;
  if not found then
    perform private.fail('not_found');
  end if;
  insert into game.company_staff (company_id, archetype, first_idx, last_idx, station, tempo, accuracy, loyalty, wage_base_cents, hired_at)
  values (c.id, a.archetype, a.first_idx, a.last_idx, p_station, a.tempo, a.accuracy, a.loyalty, a.wage_base_cents, private.now());
  perform private.emit(v_player, 'staff_hired');
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_hire(uuid, bigint, text)');

-- Staff: move to another station, train tempo or accuracy, give a raise, or fire.
create function public.company_staff_act(p_request_id uuid, p_staff bigint, p_action text, p_arg text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_staff_act');
  c game.companies;
  s game.company_staff;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  select * into s from game.company_staff where id = p_staff and company_id = c.id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_action = 'move' and p_arg in ('annahme', 'pruefung', 'slabbing', 'versand') then
    update game.company_staff set station = p_arg where id = s.id;
  elsif p_action = 'train' and p_arg in ('tempo', 'accuracy') then
    if s.trainings >= private.cfg_num('company.train_max') then
      perform private.fail('upgrade_max');
    end if;
    perform private.company_spend(c.id, private.eur(s.wage_base_cents * private.cfg_num('company.train_wage_hours')));
    update game.company_staff set trainings = trainings + 1,
      tempo = case when p_arg = 'tempo' then least(100, tempo + private.cfg_num('company.train_gain')::int) else tempo end,
      accuracy = case when p_arg = 'accuracy' then least(100, accuracy + private.cfg_num('company.train_gain')::int) else accuracy end
    where id = s.id;
  elsif p_action = 'raise' then
    update game.company_staff set wage_base_cents = round(wage_base_cents * (1 + private.cfg_num('company.raise_pct') / 100)),
      loyalty = least(100, loyalty + private.cfg_num('company.raise_loyalty')::int)
    where id = s.id;
  elsif p_action = 'fire' then
    perform private.company_spend(c.id, private.eur(s.wage_base_cents * private.cfg_num('company.fire_wage_hours')));
    delete from game.company_staff where id = s.id;
    update game.company_staff set loyalty = greatest(0, loyalty - private.cfg_num('company.fire_loyalty')::int) where company_id = c.id;
  else
    perform private.fail('invalid_request');
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_staff_act(uuid, bigint, text, text)');

create function public.company_equipment_buy(p_request_id uuid, p_station text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_equipment_buy');
  c game.companies;
  v_lvl int;
  v_cost bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_station is null or p_station not in ('annahme', 'pruefung', 'slabbing', 'versand') then
    perform private.fail('invalid_request');
  end if;
  v_lvl := (c.equipment ->> p_station)::int;
  if v_lvl >= (private.company_stage_def(c.stage) ->> 'equipmentMax')::int then
    perform private.fail('upgrade_max');
  end if;
  v_cost := private.eur((private.company_equipment_def(p_station, v_lvl + 1) ->> 'costBaseCents')::numeric);
  perform private.company_spend(c.id, v_cost);
  update game.companies set equipment = jsonb_set(equipment, array[p_station], to_jsonb(v_lvl + 1)),
    invested_cents = invested_cents + v_cost where id = c.id;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_equipment_buy(uuid, text)');

-- The next legal form: paid from the company account, active after the bureaucracy.
create function public.company_stage_up(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_stage_up');
  c game.companies;
  v_next jsonb;
  v_cost bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  v_next := private.company_stage_def(c.stage + 1);
  if v_next is null or c.stage_pending is not null then
    perform private.fail('upgrade_max');
  end if;
  v_cost := private.eur((v_next ->> 'costBaseCents')::numeric);
  perform private.company_spend(c.id, v_cost);
  update game.companies set stage_pending = c.stage + 1,
    stage_ready_at = private.now() + make_interval(mins => (v_next ->> 'waitMinutes')::int),
    invested_cents = invested_cents + v_cost where id = c.id;
  perform private.company_cycle(c.id);
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_stage_up(uuid)');
