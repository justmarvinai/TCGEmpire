-- alpha_09 (Firma), part 3 (docs/GAME_DESIGN.md §9.3–9.6): decision cards, marketing campaigns, the weekly
-- Umsatzsteuer-Voranmeldung, shady options (Gefälligkeitsgutachten, Schwarzarbeit, Steuern "optimieren",
-- Mystery-Boxen) with their scandals, and awards for honest companies. A repaid loan now also earns Ruf.

alter table game.companies
  add column marketing_key text,
  add column marketing_boost numeric not null default 0,
  add column marketing_until timestamptz,
  add column tax_due_at timestamptz,
  add column tax_advisor boolean not null default false,
  add column schwarzarbeit boolean not null default false,
  add column tax_evaded_cents bigint not null default 0,
  add column bumped int not null default 0,
  add column scandal_until timestamptz,
  add column mystery_sour numeric not null default 0;
-- a slab one grade too good (from a Gefälligkeitsgutachten)
alter table game.card_copies add column bumped boolean not null default false;

create table game.company_decisions (
  id bigint generated always as identity primary key,
  company_id bigint not null references game.companies (id) on delete cascade,
  key text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create index company_decisions_company on game.company_decisions (company_id, expires_at);
alter table game.company_decisions enable row level security;

create table game.company_awards (
  company_id bigint not null references game.companies (id) on delete cascade,
  key text not null,
  at timestamptz not null,
  primary key (company_id, key)
);
alter table game.company_awards enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Model changes
-- ---------------------------------------------------------------------------------------------
-- Bigger companies pay more for everything: the stage's wage level relative to the garage.
create function private.company_scale(p_stage int) returns numeric
language sql stable set search_path = '' as $$
  select (private.company_stage_def(p_stage) ->> 'wageBaseCents')::numeric / (private.company_stage_def(1) ->> 'wageBaseCents')::numeric
$$;

create or replace function private.company_marketing(c game.companies) returns numeric
language sql stable set search_path = '' as $$
  select 1 + case when c.marketing_until > private.now() then c.marketing_boost else 0 end
$$;

-- Schwarzarbeit: lower wages, off the books.
create or replace function private.company_costs(c game.companies) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'wages', round(private.eur(coalesce((select sum(wage_base_cents) from game.company_staff where company_id = c.id), 0))
                   * case when c.schwarzarbeit then private.cfg_num('company.schwarz_wage_pct') / 100 else 1 end),
    'rent', private.eur((private.company_stage_def(c.stage) ->> 'rentBaseCents')::numeric),
    'power', private.eur((select sum((private.company_equipment_def(s, (c.equipment ->> s)::int) ->> 'powerBaseCents')::numeric)
                          from unnest(array['annahme', 'pruefung', 'slabbing', 'versand']) s)),
    'material', private.eur(private.cfg_num('company.material_base_cents')))
$$;

-- A scandal makes every slab of the company worth less for a while.
create or replace function private.company_brand_bps(p_company bigint) returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select ((private.cfg_num('company.brand_base_bps') + private.cfg_num('company.brand_per_ruf_bps') * p.ruf)
            * case when c.scandal_until > private.now() then private.cfg_num('company.scandal_brand_pct') / 100 else 1 end)::int
    from game.companies c join game.players p on p.id = c.owner_id where c.id = p_company and c.closed_at is null
  ), private.cfg_num('company.brand_base_bps')::int)
$$;

create function private.company_ruf(p_company bigint, p_delta int) returns void
language sql set search_path = '' as $$
  update game.players set ruf = least(1000, greatest(0, ruf + p_delta))
  where id = (select owner_id from game.companies where id = p_company)
$$;

-- Exposed: Ruf, the brand of every slab, the headlines.
create function private.company_scandal(p_company bigint, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare
  c game.companies;
begin
  update game.companies set scandal_until = private.now() + make_interval(days => private.cfg_num('company.scandal_days')::int),
    bumped = greatest(0, bumped - case when p_reason in ('bump', 'crack') then 1 else 0 end)
  where id = p_company and closed_at is null returning * into c;
  if not found then
    return;
  end if;
  perform private.company_ruf(c.id, private.cfg_num('company.scandal_ruf')::int);
  perform private.notify(c.owner_id, 'company_scandal', jsonb_build_object('reason', p_reason));
  perform private.feed_add('scandal', jsonb_build_object('name', (select username from game.players where id = c.owner_id),
    'company', c.name, 'reason', p_reason));
end $$;

-- The favour sticks to the slab ...
create function private.on_bumped_order_done() returns trigger
language plpgsql set search_path = '' as $$
begin
  update game.card_copies set bumped = true where id = old.copy_id and grader = old.grader;
  return null;
end $$;
create trigger grading_orders_bumped after delete on game.grading_orders
  for each row when (old.bumped) execute function private.on_bumped_order_done();

-- ... and whoever cracks it open finds out.
create function private.on_bumped_slab_cracked() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.company_scandal(private.company_id_of(old.grader), 'crack');
  new.bumped := false;
  return new;
end $$;
create trigger card_copies_bumped_cracked before update of grader on game.card_copies
  for each row when (old.bumped and old.grader like 'co:%' and new.grader is null) execute function private.on_bumped_slab_cracked();

-- Revenue of the last seven complete days (the number on the tax form).
create function private.company_week_revenue(p_company bigint) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(sum(revenue_cents), 0)::bigint from game.company_days
  where company_id = p_company and day >= private.today() - 7 and day < private.today()
$$;

create function private.company_tax_due(c game.companies) returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(c.tax_due_at, c.founded_at + make_interval(days => private.cfg_num('company.tax_days')::int))
$$;

create function private.company_decision_def(p_key text) returns jsonb
language sql stable set search_path = '' as $$
  select e from jsonb_array_elements(private.cfg('company.decisions')) e where e ->> 'key' = p_key
$$;

-- Applies the effect of a decision choice.
create function private.company_apply(c game.companies, e jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_cash bigint;
begin
  if e ? 'cash' then
    v_cash := round(private.eur((e ->> 'cash')::numeric) * private.company_scale(c.stage));
    -- a company never goes below zero: it pays what is there
    update game.companies set cash_cents = greatest(0, cash_cents + v_cash) where id = c.id;
    perform private.company_book(c.id, 0, greatest(v_cash, 0), greatest(-v_cash, 0));
  end if;
  if e ? 'ruf' then
    perform private.company_ruf(c.id, (e ->> 'ruf')::int);
  end if;
  if e ? 'rufAccuracy' then
    perform private.company_ruf(c.id, case when private.company_accuracy(c, true) >= 90 then 1 else -1 end * (e ->> 'rufAccuracy')::int);
  end if;
  if e ? 'loyalty' then
    update game.company_staff set loyalty = least(100, greatest(0, loyalty + (e ->> 'loyalty')::int)) where company_id = c.id;
  end if;
  if e ? 'wagePct' then
    update game.company_staff set wage_base_cents = round(wage_base_cents * (1 + (e ->> 'wagePct')::numeric / 100)) where company_id = c.id;
  end if;
  if e ? 'bump' then
    update game.companies set bumped = bumped + (e ->> 'bump')::int where id = c.id;
  end if;
  if e ? 'downgrade' then
    update game.companies set equipment = jsonb_set(equipment, array[e ->> 'downgrade'],
      to_jsonb(greatest(0, (equipment ->> (e ->> 'downgrade'))::int - 1))) where id = c.id;
  end if;
  if e ? 'boost' then
    update game.companies set marketing_key = 'decision', marketing_boost = (e ->> 'boost')::numeric,
      marketing_until = private.now() + make_interval(hours => (e ->> 'hours')::int) where id = c.id;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Every cycle: VIP customers, decisions, the tax office, the Zoll, scandals, Mystery-Box reviews, awards
-- ---------------------------------------------------------------------------------------------
create or replace function private.company_cycle_extra(c game.companies, p_hours numeric, p_orders numeric) returns void
language plpgsql set search_path = '' as $$
declare
  v_card text;
  d record;
  v_total numeric;
  v_pick numeric;
  v_rev bigint;
  v_fee bigint;
  v_honest boolean;
  v_boxes numeric;
begin
  -- VIP customers
  delete from game.company_vip where company_id = c.id and expires_at <= private.now();
  if not exists (select 1 from game.company_vip where company_id = c.id)
     and private.rand() < private.cfg_num('company.vip_per_hour') * p_hours then
    select id into v_card from game.card_defs where tier in ('holo', 'alternative', 'ultra') order by private.rand() limit 1;
    insert into game.company_vip (company_id, card_id, q, width, fee_cents, created_at, expires_at)
    values (c.id, v_card, array[private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality()],
      (private.cfg('company.vip_widths') ->> least((c.equipment ->> 'pruefung')::int,
        jsonb_array_length(private.cfg('company.vip_widths')) - 1))::int,
      round(private.eur((private.cfg('company.services') -> 'express' ->> 'ref_fee_base_cents')::numeric)
            * private.company_brand_bps(c.id) / 10000 * private.cfg_num('company.vip_fee_mult')),
      private.now(), private.now() + make_interval(mins => private.cfg_num('company.vip_minutes')::int));
  end if;

  -- decisions nobody took: the ignore choice happens
  for d in select * from game.company_decisions where company_id = c.id and expires_at <= private.now() loop
    delete from game.company_decisions where id = d.id;
    perform private.company_apply(c, private.company_decision_def(d.key) -> 'choices' -> ((private.company_decision_def(d.key) ->> 'ignore')::int));
    perform private.notify(c.owner_id, 'company_decision_ignored', jsonb_build_object('key', d.key));
  end loop;
  if not exists (select 1 from game.company_decisions where company_id = c.id)
     and private.rand() < private.cfg_num('company.decision_per_hour') * p_hours then
    v_total := (select sum((e ->> 'weight')::numeric) from jsonb_array_elements(private.cfg('company.decisions')) e
                where (e ->> 'minStage')::int <= c.stage);
    v_pick := private.rand() * v_total;
    for d in select e from jsonb_array_elements(private.cfg('company.decisions')) e where (e ->> 'minStage')::int <= c.stage loop
      v_pick := v_pick - (d.e ->> 'weight')::numeric;
      if v_pick < 0 then
        insert into game.company_decisions (company_id, key, created_at, expires_at)
        values (c.id, d.e ->> 'key', private.now(), private.now() + make_interval(hours => private.cfg_num('company.decision_hours')::int));
        perform private.notify(c.owner_id, 'company_decision', jsonb_build_object('key', d.e ->> 'key'));
        exit;
      end if;
    end loop;
  end if;

  -- Umsatzsteuer-Voranmeldung: the Steuerberater files it, otherwise a late fee
  if private.company_tax_due(c) <= private.now() then
    v_rev := private.company_week_revenue(c.id);
    v_fee := v_rev * private.cfg_num(case when c.tax_advisor then 'company.tax_advisor_pct' else 'company.tax_late_pct' end)::bigint / 100;
    v_fee := least(v_fee, (select cash_cents from game.companies where id = c.id));
    update game.companies set cash_cents = cash_cents - v_fee,
      tax_due_at = private.now() + make_interval(days => private.cfg_num('company.tax_days')::int) where id = c.id;
    perform private.company_book(c.id, 0, 0, v_fee);
    perform private.notify(c.owner_id, case when c.tax_advisor then 'company_tax_advisor' else 'company_tax_late' end, jsonb_build_object('cents', v_fee));
  end if;

  -- the Zoll checks for Schwarzarbeit
  if c.schwarzarbeit and private.rand() < private.cfg_num('company.schwarz_check_per_hour') * p_hours then
    v_fee := round((private.company_costs(c) ->> 'wages')::numeric / private.cfg_num('company.schwarz_wage_pct') * 100
                   * private.cfg_num('company.schwarz_fine_hours'));
    v_fee := least(v_fee, (select cash_cents from game.companies where id = c.id));
    update game.companies set cash_cents = cash_cents - v_fee, schwarzarbeit = false where id = c.id;
    perform private.company_book(c.id, 0, 0, v_fee);
    perform private.company_ruf(c.id, private.cfg_num('company.schwarz_ruf')::int);
    perform private.notify(c.owner_id, 'company_zoll', jsonb_build_object('cents', v_fee));
    perform private.feed_add('zoll', jsonb_build_object('name', (select username from game.players where id = c.owner_id), 'company', c.name));
  end if;

  -- the Finanzamt finds the untaxed payouts
  if c.tax_evaded_cents > 0 and private.rand() < private.cfg_num('company.audit_per_hour') * p_hours then
    v_fee := c.tax_evaded_cents * (100 + private.cfg_num('company.audit_penalty_pct'))::bigint / 100;
    v_fee := least(v_fee, (select cash_cents from game.companies where id = c.id));
    update game.companies set cash_cents = cash_cents - v_fee, tax_evaded_cents = 0 where id = c.id;
    perform private.company_book(c.id, 0, 0, v_fee);
    perform private.company_ruf(c.id, private.cfg_num('company.audit_ruf')::int);
    perform private.notify(c.owner_id, 'company_audit', jsonb_build_object('cents', v_fee));
    perform private.feed_add('audit', jsonb_build_object('name', (select username from game.players where id = c.owner_id), 'company', c.name));
  end if;

  -- a Gefälligkeitsgutachten comes out
  if c.bumped > 0 and private.rand() < 1 - power(1 - private.cfg_num('company.bump_check_per_hour') * p_hours, c.bumped) then
    perform private.company_scandal(c.id, 'bump');
  end if;

  -- Mystery-Box buyers open their boxes and write reviews
  if c.mystery_sour > 0 then
    v_boxes := least(c.mystery_sour, private.cfg_num('company.mystery_per_hour') * p_hours);
    update game.companies set mystery_sour = mystery_sour - v_boxes,
      ruf_frac = ruf_frac - v_boxes * private.cfg_num('company.mystery_ruf_per_box') where id = c.id;
    if v_boxes >= 1 then
      insert into game.company_reviews (company_id, stars, text_idx, at)
      values (c.id, 1, floor(private.rand() * (private.cfg('company.review_counts') ->> 0)::int)::int, private.now());
    end if;
  end if;

  -- awards, honest companies only
  select * into c from game.companies where id = c.id;
  v_honest := c.bumped = 0 and not c.schwarzarbeit and c.tax_evaded_cents = 0 and (c.scandal_until is null or c.scandal_until < private.now());
  if v_honest then
    insert into game.company_awards (company_id, key, at)
    select c.id, k, private.now() from (values
      ('tuev', c.orders_total >= 500 and private.company_accuracy(c, true) >= 90),
      ('warentest', (select count(*) >= 20 and avg(stars) >= 4.3 from game.company_reviews where company_id = c.id)),
      ('din', c.orders_total >= 5000 and (select ruf from game.players where id = c.owner_id) >= 800)
    ) a(k, ok)
    where a.ok
    on conflict do nothing;
    for d in select * from game.company_awards where company_id = c.id and at = private.now() loop
      perform private.company_ruf(c.id, private.cfg_num('company.award_ruf')::int);
      perform private.notify(c.owner_id, 'company_award', jsonb_build_object('key', d.key));
      perform private.feed_add('award', jsonb_build_object('name', (select username from game.players where id = c.owner_id),
        'company', c.name, 'key', d.key));
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- The page
-- ---------------------------------------------------------------------------------------------
-- The tax form: the honest number and two wrong ones, in an order fixed for the due date.
create function private.company_tax_options(c game.companies) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_agg(v order by md5(c.id || ':' || private.company_tax_due(c) || ':' || v))
  from (select private.company_week_revenue(c.id) as r) x,
       lateral (values (x.r), (round(x.r * 0.8)::bigint), (round(x.r * 1.25)::bigint + 100)) o(v)
$$;

create or replace function private.company_extra(c game.companies) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'player_orders', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'card_id', cp.card_id, 'customer', p.username, 'service', o.service,
        'fee_cents', o.fee_cents, 'due_at', o.due_at, 'bumped', o.bumped) order by o.due_at, o.id)
      from game.grading_orders o join game.card_copies cp on cp.id = o.copy_id join game.players p on p.id = o.player_id
      where o.grader = 'co:' || c.id
    ), '[]'::jsonb),
    'vip', (select jsonb_build_object('id', v.id, 'card_id', v.card_id, 'fee_cents', v.fee_cents, 'expires_at', v.expires_at,
              'width', v.width,
              'ranges', jsonb_build_object(
                'centering', private.q_range(v.id, 1, v.q[1], v.width), 'corners', private.q_range(v.id, 2, v.q[2], v.width),
                'edges', private.q_range(v.id, 3, v.q[3], v.width), 'surface', private.q_range(v.id, 4, v.q[4], v.width)))
            from game.company_vip v where v.company_id = c.id and v.expires_at > private.now() order by v.created_at limit 1),
    'decision', (select jsonb_build_object('id', d.id, 'key', d.key, 'expires_at', d.expires_at)
                 from game.company_decisions d where d.company_id = c.id order by d.id limit 1),
    'marketing', case when c.marketing_until > private.now()
                      then jsonb_build_object('key', c.marketing_key, 'boost', c.marketing_boost, 'until', c.marketing_until) end,
    'campaigns', (select jsonb_object_agg(key, jsonb_build_object(
                    'cost_cents', round(private.eur((value ->> 'costBaseCents')::numeric) * private.company_scale(c.stage)),
                    'open', (value ->> 'minStage')::int <= c.stage))
                  from jsonb_each(private.cfg('company.campaigns'))),
    'tax', jsonb_build_object('due_at', private.company_tax_due(c), 'advisor', c.tax_advisor,
      'advisor_cost_cents', round(private.eur(private.cfg_num('company.tax_advisor_base_cents')) * private.company_scale(c.stage)),
      'late_pct', private.cfg_num('company.tax_late_pct')::int, 'advisor_pct', private.cfg_num('company.tax_advisor_pct')::int,
      'options', private.company_tax_options(c)),
    'shady', jsonb_build_object('schwarzarbeit', c.schwarzarbeit, 'evaded_cents', c.tax_evaded_cents, 'bumped', c.bumped,
      'scandal_until', case when c.scandal_until > private.now() then c.scandal_until end, 'mystery_sour', floor(c.mystery_sour),
      'schwarz_wage_pct', private.cfg_num('company.schwarz_wage_pct')::int, 'mystery_markup', private.cfg_num('company.mystery_markup'),
      'mystery_max', private.cfg_num('company.mystery_max')::int),
    'awards', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'at', at) order by at) from game.company_awards where company_id = c.id), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function private.my_company(p_player uuid) returns game.companies
language plpgsql set search_path = '' as $$
declare
  c game.companies;
begin
  select * into c from game.companies where owner_id = p_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  return c;
end $$;

create function public.company_decide(p_request_id uuid, p_decision bigint, p_choice int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_decide');
  c game.companies := private.my_company(v_player);
  d game.company_decisions;
  v_effect jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  delete from game.company_decisions where id = p_decision and company_id = c.id returning * into d;
  if not found then
    perform private.fail('not_found');
  end if;
  v_effect := private.company_decision_def(d.key) -> 'choices' -> p_choice;
  if v_effect is null or p_choice < 0 then
    perform private.fail('invalid_request');
  end if;
  perform private.company_apply(c, v_effect);
  return private.request_done(v_player, p_request_id, private.company_doc(v_player)
    || jsonb_build_object('decided', jsonb_build_object('key', d.key, 'choice', p_choice)));
end $$;
select private.expose('public.company_decide(uuid, bigint, int)');

create function public.company_marketing(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_marketing');
  c game.companies := private.my_company(v_player);
  k jsonb := private.cfg('company.campaigns') -> p_key;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if k is null or (k ->> 'minStage')::int > c.stage then
    perform private.fail('invalid_request');
  end if;
  if c.marketing_until > private.now() then
    perform private.fail('already_owned');
  end if;
  perform private.company_spend(c.id, round(private.eur((k ->> 'costBaseCents')::numeric) * private.company_scale(c.stage))::bigint);
  perform private.company_book(c.id, 0, 0, round(private.eur((k ->> 'costBaseCents')::numeric) * private.company_scale(c.stage))::bigint);
  update game.companies set marketing_key = p_key, marketing_boost = (k ->> 'boost')::numeric,
    marketing_until = private.now() + make_interval(hours => (k ->> 'hours')::int) where id = c.id;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_marketing(uuid, text)');

-- The 20-second form: pick the honest revenue.
create function public.company_tax_file(p_request_id uuid, p_amount bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_tax_file');
  c game.companies := private.my_company(v_player);
  v_ok boolean;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  v_ok := p_amount = private.company_week_revenue(c.id);
  if v_ok then
    update game.companies set tax_due_at = private.company_tax_due(c) + make_interval(days => private.cfg_num('company.tax_days')::int)
    where id = c.id;
    perform private.ep_grant(v_player, private.cfg_num('ep.grading'));
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('filed', v_ok));
end $$;
select private.expose('public.company_tax_file(uuid, bigint)');

create function public.company_tax_advisor(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_tax_advisor');
  c game.companies := private.my_company(v_player);
  v_cost bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if c.tax_advisor then
    perform private.fail('already_owned');
  end if;
  v_cost := round(private.eur(private.cfg_num('company.tax_advisor_base_cents')) * private.company_scale(c.stage));
  perform private.company_spend(c.id, v_cost);
  perform private.company_book(c.id, 0, 0, v_cost);
  update game.companies set tax_advisor = true where id = c.id;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_tax_advisor(uuid)');

-- Shady business: Schwarzarbeit on/off, a friend's order one grade better, a payout past the Finanzamt, Mystery-Boxen.
create function public.company_shady(p_request_id uuid, p_action text, p_arg text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_shady');
  c game.companies := private.my_company(v_player);
  v_n bigint;
  v_value bigint;
  s record;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_action = 'schwarzarbeit' and p_arg in ('on', 'off') then
    update game.companies set schwarzarbeit = (p_arg = 'on') where id = c.id;
  elsif p_action = 'bump' and p_arg ~ '^[0-9]{1,18}$' then
    update game.grading_orders set bumped = true where id = p_arg::bigint and grader = 'co:' || c.id and not bumped;
    if not found then
      perform private.fail('not_found');
    end if;
    update game.companies set bumped = bumped + 1 where id = c.id;
  elsif p_action = 'payout' and p_arg ~ '^[0-9]{1,15}$' and p_arg::bigint > 0 then
    v_n := p_arg::bigint;
    perform 1 from game.players where id = v_player for update;
    perform private.company_spend(c.id, v_n);
    perform private.money_add(v_player, v_n, 'company_payout', c.id::text);
    update game.companies set tax_evaded_cents = tax_evaded_cents + v_n * private.cfg_num('company.payout_tax_pct')::bigint / 100 where id = c.id;
  elsif p_action = 'mystery' and p_arg ~ '^[0-9]{1,4}$' and p_arg::int between 1 and private.cfg_num('company.mystery_max') then
    -- the cheapest bulk of the owner goes into boxes
    v_n := p_arg::int;
    v_value := 0;
    for s in select st.card_id, st.qty from game.card_stacks st join game.card_defs d on d.id = st.card_id
             where st.player_id = v_player and st.qty > 0 and d.tier in ('common', 'uncommon')
             order by private.card_value(st.card_id), st.card_id loop
      exit when v_n = 0;
      v_value := v_value + private.card_value(s.card_id) * least(v_n, s.qty);
      perform private.item_take(v_player, 'card', s.card_id, null, least(v_n, s.qty)::int, 'inventory');
      v_n := v_n - least(v_n, s.qty);
    end loop;
    if v_n > 0 then
      perform private.fail('not_enough_cards');
    end if;
    v_value := round(v_value * private.cfg_num('company.mystery_markup'));
    update game.companies set cash_cents = cash_cents + v_value, mystery_sour = mystery_sour + p_arg::int where id = c.id;
    perform private.company_book(c.id, 0, v_value, 0);
  else
    perform private.fail('invalid_request');
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.company_shady(uuid, text, text)');

-- A repaid loan is a kept deal: a little Ruf for the borrower.
create or replace function private.loan_close_repaid(l game.loans) returns void
language plpgsql set search_path = '' as $$
declare
  v_due bigint := private.loan_due(l);
begin
  perform private.money_add(l.borrower_id, -v_due, 'loan_repay', l.id::text);
  perform private.money_add(l.lender_id, v_due, 'loan_repay', l.id::text);
  perform private.league_shift(l.borrower_id, l.lender_id, v_due - l.principal_cents);
  update game.loans set state = 'repaid', closed_at = private.now() where id = l.id;
  update game.players set honor_kept = honor_kept + 1, ruf = least(1000, ruf + private.cfg_num('loan.repaid_ruf')::int) where id = l.borrower_id;
  perform private.notify(l.lender_id, 'loan_repaid', jsonb_build_object('name', (select username from game.players where id = l.borrower_id), 'cents', v_due));
  perform private.emit(l.borrower_id, 'loan_repaid');
end $$;
