-- alpha_10 (Risiko), part 2: Schattenwirtschaft (docs/GAME_DESIGN.md §16.2, docs/ECONOMY.md §10).
-- Every hostile action is one roll: chance = clamp(base + Angriff − Abwehr, 5, 85). Angriff comes from the learned
-- Schlitzohr skills (+10 as Rache), Abwehr from one upgrade per kind. A blocked attack costs a fine, half of it goes
-- to the defender as Schadenfreude. Präparierte Booster are marks on a sealed stock; they change hands only in
-- Direkthandel, and whoever opens one gets bulk.

create table game.attacks (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('bunker', 'finanzamt', 'bewertung', 'abwerben', 'geruecht', 'resealed', 'kredit')),
  attacker_id uuid not null references game.players (id) on delete cascade,
  victim_id uuid references game.players (id) on delete cascade,
  success boolean not null,
  loss_cents bigint not null default 0,
  data jsonb not null default '{}',
  at timestamptz not null
);
create index attacks_attacker on game.attacks (attacker_id, at);
create index attacks_victim on game.attacks (victim_id, at);
create index attacks_kind on game.attacks (kind, at);
alter table game.attacks enable row level security;

-- Of a player's sealed boosters of one product, `qty` were prepared by `by_id` (they are part of game.sealed.qty).
create table game.sealed_marks (
  player_id uuid not null references game.players (id) on delete cascade,
  product_id text not null references game.product_defs (id),
  by_id uuid not null references game.players (id) on delete cascade,
  qty int not null check (qty >= 0),
  primary key (player_id, product_id, by_id)
);
create index sealed_marks_product on game.sealed_marks (product_id);
create index sealed_marks_by on game.sealed_marks (by_id);
alter table game.sealed_marks enable row level security;

-- ---------------------------------------------------------------------------------------------
-- The roll
-- ---------------------------------------------------------------------------------------------
create function private.attack_chance(p_base numeric, p_angriff numeric, p_abwehr numeric) returns int
language sql stable set search_path = '' as $$
  select least(private.cfg_num('darkside.chance_max'), greatest(private.cfg_num('darkside.chance_min'), p_base + p_angriff - p_abwehr))::int
$$;

-- Angriff: every learned Schlitzohr skill counts.
create function private.attack_pts(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('darkside.angriff_per_skill') * count(*))::int
  from game.skills_owned o join game.skill_defs d on d.key = o.key
  where o.player_id = p_player and d.branch = 'schlitzohr'
$$;

-- The employee an Abwerben goes for: the victim's best one.
create function private.poach_pick(p_victim uuid) returns bigint
language sql stable set search_path = '' as $$
  select s.id from game.company_staff s join game.companies c on c.id = s.company_id
  where c.owner_id = p_victim and c.closed_at is null
  order by s.tempo + s.accuracy desc, s.id limit 1
$$;

-- Abwehr: the upgrade for that kind; an employee's loyalty adds to it.
create function private.attack_def(p_victim uuid, p_kind text) returns int
language sql stable set search_path = '' as $$
  select (private.stat(p_victim, private.cfg('darkside.attacks') -> p_kind ->> 'defence', 0)
    + case when p_kind = 'abwerben'
           then coalesce((select loyalty from game.company_staff where id = private.poach_pick(p_victim)), 0) * private.cfg_num('darkside.poach_loyalty_def')
           else 0 end)::int
$$;

-- Until when p_me may take revenge on p_other (null: no Rache).
create function private.revenge_until(p_me uuid, p_other uuid) returns timestamptz
language sql stable set search_path = '' as $$
  select max(at) + make_interval(hours => private.cfg_num('darkside.revenge_hours')::int)
  from game.attacks where attacker_id = p_other and victim_id = p_me and kind <> 'geruecht'
  having max(at) + make_interval(hours => private.cfg_num('darkside.revenge_hours')::int) > private.now()
$$;

-- What attacks may still take from the victim today: 10 % of the net worth without the collection.
create function private.attack_cap_left(p_victim uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, (private.net_worth(p_victim)
      - (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_victim)
      - (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_victim)
    ) * private.cfg_num('darkside.loss_cap_bps') / 10000
    - (select coalesce(sum(loss_cents), 0) from game.attacks
       where victim_id = p_victim and success and at >= (private.today()::timestamp at time zone 'Europe/Berlin')))::bigint
$$;

-- Cost in minutes of the attacker's reference income (half as Rache).
create function private.attack_cost(p_me uuid, p_kind text, p_revenge boolean) returns bigint
language sql stable set search_path = '' as $$
  select round(private.eur(private.ref_income_base((select level from game.players where id = p_me))
    * (private.cfg('darkside.attacks') -> p_kind ->> 'costMinutes')::numeric / 60)
    * case when p_revenge then private.cfg_num('darkside.revenge_cost_pct') / 100 else 1 end)::bigint
$$;

-- Everything the attacker sees before an attack on a player, and why it is not possible right now.
create function private.attack_preview(p_me uuid, p_target uuid, p_kind text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  t game.players;
  v_revenge timestamptz := private.revenge_until(p_me, p_target);
  v_ready timestamptz := (select max(at) + make_interval(mins => private.cfg_num('darkside.cooldown_minutes')::int)
                          from game.attacks where attacker_id = p_me and victim_id = p_target and kind not in ('kredit', 'resealed', 'geruecht'));
  c game.companies;
  mine game.companies;
  v_reason text;
begin
  select * into t from game.players where id = p_target;
  if t.id is null or t.id = p_me or p_kind not in ('bunker', 'finanzamt', 'bewertung', 'abwerben') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;
  select * into c from game.companies where owner_id = p_target and closed_at is null;
  select * into mine from game.companies where owner_id = p_me and closed_at is null;
  v_reason := case
    when t.level < private.cfg_num('unlock.darkside') then 'target_protected'
    when v_ready > private.now() then 'attack_cooldown'
    when (select count(*) from game.attacks where attacker_id = p_me and victim_id = p_target and kind = p_kind and success
          and at >= (private.today()::timestamp at time zone 'Europe/Berlin')) >= private.cfg_num('darkside.daily_successes') then 'attack_limit'
    when p_kind = 'bunker' and coalesce(private.eur(private.bunker_content_base(p_target)), 0) < 100 then 'bunker_empty'
    when p_kind = 'bunker' and private.attack_cap_left(p_target) < 100 then 'attack_cap'
    when c.id is null and p_kind <> 'bunker' then 'no_company'
    when p_kind = 'abwerben' and private.poach_pick(p_target) is null then 'no_staff'
    when p_kind = 'abwerben' and mine.id is null then 'no_own_company'
    when p_kind = 'abwerben' and (select count(*) from game.company_staff where company_id = mine.id)
                                 >= (private.company_stage_def(mine.stage) ->> 'staffCap')::int then 'no_slots'
  end;
  return jsonb_build_object(
    'ok', v_reason is null,
    'reason', v_reason,
    'chance', private.attack_chance((private.cfg('darkside.attacks') -> p_kind ->> 'base')::numeric,
      private.attack_pts(p_me) + case when v_revenge is not null then private.cfg_num('darkside.revenge_bonus') else 0 end,
      private.attack_def(p_target, p_kind)),
    'cost_cents', private.attack_cost(p_me, p_kind, v_revenge is not null),
    'loot_cents', case when p_kind = 'bunker' then least(round(coalesce(private.eur(private.bunker_content_base(p_target)), 0)
                    * private.cfg_num('darkside.bunker_loot_pct') / 100), private.attack_cap_left(p_target))::bigint end,
    'ready_at', case when v_ready > private.now() then v_ready end);
end $$;

-- A rumour has no victim: the best Faktencheck at the Stammtisch defends (and gets the Schadenfreude).
create function private.rumour_preview(p_me uuid, p_card text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_def uuid;
  v_pts int := 0;
  v_ready timestamptz := (select max(at) + make_interval(mins => private.cfg_num('darkside.cooldown_minutes')::int)
                          from game.attacks where attacker_id = p_me and kind = 'geruecht');
begin
  select p.id, private.stat(p.id, 'def_geruecht', 0) into v_def, v_pts from game.players p
  where p.id <> p_me and p.level >= private.cfg_num('unlock.darkside')
  order by private.stat(p.id, 'def_geruecht', 0) desc, p.id limit 1;
  v_pts := coalesce(v_pts, 0);
  return jsonb_build_object(
    'ok', not coalesce(v_ready > private.now(), false) and not private.rumour_busy(p_card),
    'reason', case when coalesce(v_ready > private.now(), false) or private.rumour_busy(p_card) then 'attack_cooldown' end,
    'defender', case when v_pts > 0 then v_def end,
    'chance', private.attack_chance((private.cfg('darkside.attacks') -> 'geruecht' ->> 'base')::numeric, private.attack_pts(p_me), v_pts),
    'cost_cents', private.attack_cost(p_me, 'geruecht', false),
    'loot_cents', null,
    'ready_at', case when v_ready > private.now() then v_ready end);
end $$;

-- One rumour per card at a time.
create function private.rumour_busy(p_card text) returns boolean
language sql stable set search_path = '' as $$
  select p_card is not null and exists (
    select 1 from game.attacks where kind = 'geruecht' and success and data ->> 'card_id' = p_card
      and at > private.now() - make_interval(hours => private.cfg_num('darkside.rumour_card_hours')::int))
$$;

-- Books an attack: the fine and the Schadenfreude when it was blocked, the log, the victim's message, the headline.
create function private.attack_done(p_kind text, p_attacker uuid, p_victim uuid, p_ok boolean, p_cost bigint, p_loss bigint, p_data jsonb)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_fine bigint := 0;
  v_joy bigint := 0;
  v_data jsonb := p_data;
begin
  if not p_ok then
    v_fine := least(round(p_cost * private.cfg_num('darkside.fine_pct') / 100)::bigint, (select cash_cents from game.players where id = p_attacker));
    if v_fine > 0 then
      perform private.money_add(p_attacker, -v_fine, 'attack_fine', p_kind);
    end if;
    if p_victim is not null then
      v_joy := round(v_fine * private.cfg_num('darkside.schadenfreude_pct') / 100)::bigint;
      if v_joy > 0 then
        perform private.money_add(p_victim, v_joy, 'schadenfreude', p_kind);
      end if;
    end if;
    v_data := v_data || jsonb_build_object('fine_cents', v_fine, 'joy_cents', v_joy);
  end if;
  insert into game.attacks (kind, attacker_id, victim_id, success, loss_cents, data, at)
  values (p_kind, p_attacker, p_victim, p_ok, p_loss, v_data, private.now());
  v_data := v_data || jsonb_build_object('kind', p_kind,
    'name', (select username from game.players where id = p_attacker),
    'other', (select username from game.players where id = p_victim));
  if p_victim is not null then
    perform private.notify(p_victim, case when p_ok then 'attacked' else 'attack_blocked' end, v_data);
  end if;
  perform private.feed_add(case when p_ok then 'attack' else 'attack_blocked' end, v_data);
  perform private.emit(p_attacker, 'attack_done');
  return v_data;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Finanzamt and Zoll, from the company cycle and from a tip-off
-- ---------------------------------------------------------------------------------------------
create function private.company_audit(p_company bigint, p_feed boolean) returns bigint
language plpgsql set search_path = '' as $$
declare
  c game.companies;
  v_fee bigint;
begin
  select * into c from game.companies where id = p_company and closed_at is null;
  if c.id is null or c.tax_evaded_cents <= 0 then
    return 0;
  end if;
  v_fee := least(c.tax_evaded_cents * (100 + private.cfg_num('company.audit_penalty_pct'))::bigint / 100, c.cash_cents);
  update game.companies set cash_cents = cash_cents - v_fee, tax_evaded_cents = 0 where id = c.id;
  perform private.company_book(c.id, 0, 0, v_fee);
  perform private.company_ruf(c.id, private.cfg_num('company.audit_ruf')::int);
  perform private.notify(c.owner_id, 'company_audit', jsonb_build_object('cents', v_fee));
  if p_feed then
    perform private.feed_add('audit', jsonb_build_object('name', (select username from game.players where id = c.owner_id), 'company', c.name));
  end if;
  return v_fee;
end $$;

create function private.company_zoll(p_company bigint, p_feed boolean) returns bigint
language plpgsql set search_path = '' as $$
declare
  c game.companies;
  v_fee bigint;
begin
  select * into c from game.companies where id = p_company and closed_at is null;
  if c.id is null or not c.schwarzarbeit then
    return 0;
  end if;
  v_fee := least(round((private.company_costs(c) ->> 'wages')::numeric / private.cfg_num('company.schwarz_wage_pct') * 100
                       * private.cfg_num('company.schwarz_fine_hours'))::bigint, c.cash_cents);
  update game.companies set cash_cents = cash_cents - v_fee, schwarzarbeit = false where id = c.id;
  perform private.company_book(c.id, 0, 0, v_fee);
  perform private.company_ruf(c.id, private.cfg_num('company.schwarz_ruf')::int);
  perform private.notify(c.owner_id, 'company_zoll', jsonb_build_object('cents', v_fee));
  if p_feed then
    perform private.feed_add('zoll', jsonb_build_object('name', (select username from game.players where id = c.owner_id), 'company', c.name));
  end if;
  return v_fee;
end $$;

-- The company cycle uses the same two checks.
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
    perform private.company_zoll(c.id, true);
  end if;

  -- the Finanzamt finds the untaxed payouts
  if c.tax_evaded_cents > 0 and private.rand() < private.cfg_num('company.audit_per_hour') * p_hours then
    perform private.company_audit(c.id, true);
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
-- Präparierte Booster
-- ---------------------------------------------------------------------------------------------
-- A prepared booster: commons only.
create function private.roll_bulk(p_product text) returns text[]
language sql volatile set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from (
    select c.id from game.card_defs c
    where c.set_id = (select set_id from game.product_defs where id = p_product) and c.tier = 'common' and c.kind <> 'energy'
    order by private.rand()
    limit (select sum((g ->> 'n')::int) from game.product_defs d, jsonb_array_elements(d.slots) g where d.id = p_product)
  ) s
$$;

-- Someone opens a booster that p_by prepared: bulk, unless the Prüfgerät notices first; then the preparer pays the
-- booster's value as a fine and the pack is a real one.
create function private.resealed_open(p_by uuid, p_victim uuid, p_product text) returns boolean
language plpgsql set search_path = '' as $$
declare
  v_value bigint := private.product_value(p_product);
  v_ok boolean := private.rand() * 100 < private.attack_chance((private.cfg('darkside.attacks') -> 'resealed' ->> 'base')::numeric,
    private.attack_pts(p_by), private.attack_def(p_victim, 'resealed'));
begin
  if v_ok then
    update game.players set honor_broken = honor_broken + 1 where id = p_by;
  end if;
  perform private.attack_done('resealed', p_by, p_victim, v_ok, v_value, case when v_ok then v_value else 0 end,
    jsonb_build_object('product_id', p_product, 'cents', v_value));
  return v_ok;
end $$;

-- Opening: prepared boosters of others come first; one's own only once the normal ones are gone (pack_open has
-- already taken the opened boosters off the stock). Battles and breaks roll for nobody (null) and skip this.
create or replace function private.roll_pack(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
declare
  m game.sealed_marks;
begin
  if (select kind from game.product_defs where id = p_product) is distinct from 'booster' then
    perform private.fail('invalid_request');
  end if;
  update game.set_defs set packs_opened = packs_opened + 1
  where id = (select set_id from game.product_defs where id = p_product);
  if p_player is not null then
    select * into m from game.sealed_marks
    where player_id = p_player and product_id = p_product and qty > 0
      and (by_id <> p_player or qty > coalesce((select qty from game.sealed where player_id = p_player and product_id = p_product), 0))
    order by by_id = p_player, by_id limit 1 for update;
    if found then
      update game.sealed_marks set qty = qty - 1 where player_id = p_player and product_id = p_product and by_id = m.by_id;
      delete from game.sealed_marks where player_id = p_player and product_id = p_product and by_id = m.by_id and qty = 0;
      if m.by_id = p_player or private.resealed_open(m.by_id, p_player, p_product) then
        return private.roll_bulk(p_product);
      end if;
    end if;
  end if;
  return private.roll_pack_cards(p_player, p_product);
end $$;

-- Direkthandel: prepared boosters leave first (one's own, then those someone else prepared) and stay prepared.
create function private.marks_pass(p_from uuid, p_to uuid, p_product text, p_qty int) returns void
language plpgsql set search_path = '' as $$
declare
  m game.sealed_marks;
  v_left int := p_qty;
  v_n int;
begin
  for m in select * from game.sealed_marks where player_id = p_from and product_id = p_product and qty > 0
           order by by_id <> p_from, by_id for update loop
    exit when v_left <= 0;
    v_n := least(m.qty, v_left);
    v_left := v_left - v_n;
    update game.sealed_marks set qty = qty - v_n where player_id = p_from and product_id = p_product and by_id = m.by_id;
    insert into game.sealed_marks (player_id, product_id, by_id, qty) values (p_to, p_product, m.by_id, v_n)
    on conflict (player_id, product_id, by_id) do update set qty = game.sealed_marks.qty + excluded.qty;
  end loop;
  delete from game.sealed_marks where player_id = p_from and product_id = p_product and qty = 0;
end $$;

-- Gifts and trades carry the marks along.
create or replace function private.goods_move(p_from uuid, p_to uuid, p_goods jsonb, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare
  v_money bigint := (p_goods ->> 'money_cents')::bigint;
  v_value bigint := private.goods_value(p_goods);
  i jsonb;
begin
  update game.league set adjust_cents = adjust_cents + v_value where week = private.week_start() and player_id = p_from;
  update game.league set adjust_cents = adjust_cents - v_value where week = private.week_start() and player_id = p_to;
  if v_money > 0 then
    perform private.money_add(p_from, -v_money, p_reason, p_to::text);
    perform private.money_add(p_to, v_money, p_reason, p_from::text);
  end if;
  for i in select * from jsonb_array_elements(p_goods -> 'items') loop
    if i ->> 'kind' = 'sealed' then
      perform private.marks_pass(p_from, p_to, i ->> 'item_id', (i ->> 'qty')::int);
    end if;
    perform private.item_take(p_from, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int, 'inventory');
    perform private.item_give(p_to, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int);
  end loop;
end $$;

-- One's own prepared boosters are worth nothing more: their cards are already in the collection.
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
    - (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed_marks where player_id = p_player and by_id = p_player)
  )::numeric)::bigint
$$;
-- At the end of every transaction that changed a sealed stock, the marks never exceed the stock. Prepared boosters
-- that left any other way (shop, market, Kleinanzeigen, a parcel) are found by the buyer protection: the preparer
-- refunds their value. Deferred, so that opening (stock first, marks after) is not cut short; security definer,
-- because it runs at commit, outside the RPC.
create function private.sealed_marks_trim() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid;
  v_product text;
  v_over int;
  m game.sealed_marks;
  v_cut int;
  v_cents bigint;
begin
  if tg_op = 'DELETE' then
    v_player := old.player_id;
    v_product := old.product_id;
  else
    v_player := new.player_id;
    v_product := new.product_id;
  end if;
  v_over := coalesce((select sum(qty) from game.sealed_marks where player_id = v_player and product_id = v_product), 0)
          - coalesce((select qty from game.sealed where player_id = v_player and product_id = v_product), 0);
  if v_over <= 0 then
    return null;
  end if;
  for m in select * from game.sealed_marks where player_id = v_player and product_id = v_product and qty > 0
           order by by_id <> v_player, by_id for update loop
    exit when v_over <= 0;
    v_cut := least(m.qty, v_over);
    v_over := v_over - v_cut;
    update game.sealed_marks set qty = qty - v_cut where player_id = v_player and product_id = v_product and by_id = m.by_id;
    v_cents := least(private.product_value(v_product) * v_cut, (select cash_cents from game.players where id = m.by_id));
    if v_cents > 0 then
      perform private.money_add(m.by_id, -v_cents, 'resealed_refund', v_product);
    end if;
    perform private.notify(m.by_id, 'resealed_caught', jsonb_build_object('product_id', v_product, 'qty', v_cut, 'cents', v_cents));
    perform private.feed_add('resealed_caught', jsonb_build_object('name', (select username from game.players where id = m.by_id), 'qty', v_cut));
  end loop;
  delete from game.sealed_marks where player_id = v_player and product_id = v_product and qty = 0;
  return null;
end $$;
create constraint trigger sealed_marks_trim after update or delete on game.sealed
  deferrable initially deferred for each row execute function private.sealed_marks_trim();

create function private.on_player_reset_darkside() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.sealed_marks where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_darkside after update of reset_at on game.players
  for each row execute function private.on_player_reset_darkside();

-- ---------------------------------------------------------------------------------------------
-- The page
-- ---------------------------------------------------------------------------------------------
create function private.darkside_doc(p_me uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.darkside')::int,
    'angriff', private.attack_pts(p_me),
    'abwehr', (select jsonb_object_agg(key, private.attack_def(p_me, key)) from jsonb_each(private.cfg('darkside.attacks'))),
    'cap_left_cents', private.attack_cap_left(p_me),
    'rules', jsonb_build_object(
      'cooldown_minutes', private.cfg_num('darkside.cooldown_minutes')::int,
      'daily_successes', private.cfg_num('darkside.daily_successes')::int,
      'loss_cap_pct', private.cfg_num('darkside.loss_cap_bps')::int / 100,
      'revenge_hours', private.cfg_num('darkside.revenge_hours')::int,
      'revenge_cost_pct', private.cfg_num('darkside.revenge_cost_pct')::int,
      'revenge_bonus', private.cfg_num('darkside.revenge_bonus')::int,
      'fine_pct', private.cfg_num('darkside.fine_pct')::int,
      'schadenfreude_pct', private.cfg_num('darkside.schadenfreude_pct')::int,
      'angriff_per_skill', private.cfg_num('darkside.angriff_per_skill')::int,
      'bunker_loot_pct', private.cfg_num('darkside.bunker_loot_pct')::int,
      'tip_pct', private.cfg_num('darkside.tip_pct')::int,
      'review_ruf', private.cfg_num('darkside.review_ruf')::int,
      'rumour_pct', private.cfg_num('darkside.rumour_pct')::int,
      'rumour_card_hours', private.cfg_num('darkside.rumour_card_hours')::int),
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.username, 'level', p.level, 'look', private.look(p), 'honor', private.honor_doc(p),
        'company', (select name from game.companies where owner_id = p.id and closed_at is null),
        'revenge_until', private.revenge_until(p_me, p.id),
        'attacks', (select jsonb_object_agg(k, private.attack_preview(p_me, p.id, k))
                    from unnest(array['bunker', 'finanzamt', 'bewertung', 'abwerben']) k)
      ) order by p.username)
      from game.players p where p.id <> p_me and p.level >= private.cfg_num('unlock.darkside')
    ), '[]'::jsonb),
    'rumour', private.rumour_preview(p_me, null) || jsonb_build_object('cards', coalesce((
      select jsonb_agg(jsonb_build_object('card_id', x.item_id, 'value_cents', x.value_cents, 'busy', private.rumour_busy(x.item_id))
                       order by x.value_cents desc, x.item_id)
      from (select item_id, value_cents from game.prices where kind = 'card'
            order by value_cents desc, item_id limit private.cfg_num('darkside.rumour_cards')::int) x
    ), '[]'::jsonb)),
    'resealed', jsonb_build_object(
      'fee_pct', private.cfg_num('darkside.reseal_fee_pct')::int,
      'max', private.cfg_num('darkside.reseal_max')::int,
      'stock', coalesce((
        select jsonb_agg(jsonb_build_object('product_id', s.product_id, 'qty', s.qty,
          'prepared', coalesce((select qty from game.sealed_marks m where m.player_id = p_me and m.product_id = s.product_id and m.by_id = p_me), 0),
          'fee_cents', round(private.product_value(s.product_id) * private.cfg_num('darkside.reseal_fee_pct') / 100)::bigint)
          order by s.product_id)
        from game.sealed s join game.product_defs d on d.id = s.product_id
        where s.player_id = p_me and d.kind = 'booster' and s.qty > 0
      ), '[]'::jsonb)),
    'log', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'at', a.at, 'success', a.success,
        'role', case when a.attacker_id = p_me then 'attacker' else 'victim' end,
        'other', (select username from game.players where id = case when a.attacker_id = p_me then a.victim_id else a.attacker_id end),
        'loss_cents', a.loss_cents, 'data', a.data) order by a.id desc)
      from (select * from game.attacks where attacker_id = p_me or victim_id = p_me order by id desc limit 30) a
    ), '[]'::jsonb)
  )
$$;

create function public.darkside_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.darkside_doc(v_player);
end $$;
select private.expose('public.darkside_get()');

-- One attack on a player (bunker, finanzamt, bewertung, abwerben) or a rumour about a card (geruecht).
create function public.attack(p_request_id uuid, p_kind text, p_target uuid, p_card text, p_up boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'attack');
  v_prev jsonb;
  v_def uuid;
  v_ok boolean;
  v_cost bigint;
  v_loss bigint := 0;
  v_data jsonb := '{}';
  c game.companies;
  v_n numeric;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'darkside');
  perform private.rate_limit(v_player, 'attack', private.cfg_num('rate.attack')::int, 60);
  if p_kind = 'geruecht' then
    if p_up is null or not exists (select 1 from game.prices where item_id = p_card and kind = 'card') then
      perform private.fail('invalid_request');
    end if;
    v_prev := private.rumour_preview(v_player, p_card);
    v_def := (v_prev ->> 'defender')::uuid;
    perform private.lock_pair(v_player, coalesce(v_def, v_player));
    v_data := jsonb_build_object('card_id', p_card, 'up', p_up);
  else
    if p_target is null or not exists (select 1 from game.players where id = p_target) then
      perform private.fail('not_found');
    end if;
    perform private.lock_pair(v_player, p_target);
    v_prev := private.attack_preview(v_player, p_target, p_kind);
    v_def := p_target;
    select * into c from game.companies where owner_id = p_target and closed_at is null;
  end if;
  if not (v_prev ->> 'ok')::boolean then
    perform private.fail(v_prev ->> 'reason');
  end if;
  v_cost := (v_prev ->> 'cost_cents')::bigint;
  perform private.money_add(v_player, -v_cost, 'attack', p_kind);
  v_ok := private.rand() * 100 < (v_prev ->> 'chance')::numeric;
  if p_kind = 'finanzamt' and c.tax_evaded_cents = 0 and not c.schwarzarbeit then
    -- nothing to find: falsche Verdächtigung, booked like a blocked attack
    v_ok := false;
    v_data := jsonb_build_object('clean', true);
  end if;

  if v_ok and p_kind = 'bunker' then
    perform 1 from game.bunker where player_id = p_target for update;
    v_n := private.bunker_content_base(p_target);
    v_loss := least(round(private.eur(v_n) * private.cfg_num('darkside.bunker_loot_pct') / 100), private.attack_cap_left(p_target))::bigint;
    update game.bunker set accrual_at = private.now()
      - make_interval(secs => (v_n * (1 - v_loss::numeric / private.eur(v_n)) / private.bunker_rate_base(p_target) * 3600)::double precision)
    where player_id = p_target;
    perform private.money_add(v_player, v_loss, 'attack_loot', p_kind);
    v_data := jsonb_build_object('cents', v_loss);
  elsif v_ok and p_kind = 'finanzamt' then
    v_n := private.company_audit(c.id, false) + private.company_zoll(c.id, false);
    v_data := jsonb_build_object('fee_cents', v_n::bigint, 'cents', round(v_n * private.cfg_num('darkside.tip_pct') / 100)::bigint, 'company', c.name);
    if (v_data ->> 'cents')::bigint > 0 then
      perform private.money_add(v_player, (v_data ->> 'cents')::bigint, 'attack_tip', p_kind);
    end if;
  elsif v_ok and p_kind = 'bewertung' then
    perform private.company_ruf(c.id, -private.cfg_num('darkside.review_ruf')::int);
    insert into game.company_reviews (company_id, stars, text_idx, at)
    values (c.id, 1, floor(private.rand() * (private.cfg('company.review_counts') ->> 0)::int)::int, private.now());
    v_data := jsonb_build_object('ruf', private.cfg_num('darkside.review_ruf')::int, 'company', c.name);
  elsif v_ok and p_kind = 'abwerben' then
    update game.company_staff
    set company_id = (select id from game.companies where owner_id = v_player and closed_at is null),
        loyalty = private.cfg_num('darkside.poach_loyalty')::int,
        wage_base_cents = round(wage_base_cents * (100 + private.cfg_num('darkside.poach_wage_pct')) / 100),
        hired_at = private.now()
    where id = private.poach_pick(p_target)
    returning jsonb_build_object('archetype', archetype, 'first_idx', first_idx, 'last_idx', last_idx, 'company', c.name) into v_data;
  elsif v_ok and p_kind = 'geruecht' then
    update game.prices set pressure = pressure * (1 + case when p_up then 1 else -1 end * private.cfg_num('darkside.rumour_pct') / 100)
    where item_id = p_card;
  elsif p_kind in ('finanzamt', 'bewertung', 'abwerben') then
    v_data := v_data || jsonb_build_object('company', c.name);
  end if;

  v_data := private.attack_done(p_kind, v_player, v_def, v_ok, v_cost, v_loss, v_data);
  return private.request_done(v_player, p_request_id, private.darkside_doc(v_player) || jsonb_build_object(
    'result', v_data || jsonb_build_object('success', v_ok, 'chance', (v_prev ->> 'chance')::int, 'cost_cents', v_cost),
    'player', private.me(v_player)));
end $$;
select private.expose('public.attack(uuid, text, uuid, text, boolean)');

-- Präparieren: the boosters are opened for the player (cards into the collection) and stay in the stock as prepared.
create function public.reseal(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'reseal');
  v_fee bigint;
  v_id text;
  v_card jsonb;
  v_value bigint := 0;
  v_hits int := 0;
  i int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'darkside');
  perform private.rate_limit(v_player, 'open', private.cfg_num('rate.open')::int, 60);
  if p_qty is null or p_qty < 1 or p_qty > private.cfg_num('darkside.reseal_max')
     or (select kind from game.product_defs where id = p_product) is distinct from 'booster' then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if coalesce((select qty from game.sealed where player_id = v_player and product_id = p_product), 0)
     - coalesce((select sum(qty) from game.sealed_marks where player_id = v_player and product_id = p_product), 0) < p_qty then
    perform private.fail('not_enough_sealed');
  end if;
  v_fee := round(private.product_value(p_product) * private.cfg_num('darkside.reseal_fee_pct') / 100)::bigint * p_qty;
  perform private.money_add(v_player, -v_fee, 'reseal', p_product);
  update game.set_defs set packs_opened = packs_opened + p_qty where id = (select set_id from game.product_defs where id = p_product);
  for i in 1 .. p_qty loop
    foreach v_id in array private.roll_pack_cards(v_player, p_product) loop
      v_card := private.give_card(v_player, v_id);
      v_value := v_value + (v_card ->> 'value_cents')::bigint;
      if v_card ->> 'tier' in ('holo', 'alternative', 'ultra', 'grail') then
        v_hits := v_hits + 1;
      end if;
    end loop;
  end loop;
  insert into game.sealed_marks (player_id, product_id, by_id, qty) values (v_player, p_product, v_player, p_qty)
  on conflict (player_id, product_id, by_id) do update set qty = game.sealed_marks.qty + excluded.qty;
  perform private.emit(v_player, 'attack_done');
  return private.request_done(v_player, p_request_id, private.darkside_doc(v_player) || jsonb_build_object(
    'prepared', jsonb_build_object('product_id', p_product, 'qty', p_qty, 'fee_cents', v_fee, 'value_cents', v_value, 'hits', v_hits),
    'player', private.me(v_player)));
end $$;
select private.expose('public.reseal(uuid, text, int)');

-- Kredit platzen lassen (decision 087): keep the money now, with everything a burst loan brings.
create function public.loan_burst(p_request_id uuid, p_loan bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loan_burst');
  l game.loans;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'darkside');
  select * into l from game.loans where id = p_loan and borrower_id = v_player and state = 'active';
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.lock_pair(l.lender_id, l.borrower_id);
  select * into l from game.loans where id = p_loan and state = 'active' for update;
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.loan_default(l);
  insert into game.attacks (kind, attacker_id, victim_id, success, loss_cents, data, at)
  values ('kredit', v_player, l.lender_id, true, 0, jsonb_build_object('cents', l.principal_cents), private.now());
  perform private.emit(v_player, 'attack_done');
  return private.request_done(v_player, p_request_id, jsonb_build_object('loans', private.loans_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.loan_burst(uuid, bigint)');
