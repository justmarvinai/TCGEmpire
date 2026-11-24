-- 0.0.9: sets that are not out yet (Angekündigt, Vorbestellung) stay out of the game until the admin releases them.
-- Stores, kiosk, wholesale, quests and battles already skip them; this closes the places that pick from every set:
-- NPC traders and classifieds, the VIP customers of grading companies, the reward booster, the top movers and the
-- price headlines; the market writes no price history for them. The server doc names them, so the client can hide
-- them in the collection and the minigames.

create or replace function private.server_doc() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'time', private.now(),
    'version', private.cfg('version') #>> '{}',
    'price_level', s.price_level,
    'has_invite_code', s.invite_code_hash is not null,
    'unreleased', (select coalesce(jsonb_agg(d.id order by d.id), '[]'::jsonb) from game.set_defs d
                   where d.phase in ('announced', 'preorder'))
  )
  from game.server s where s.id
$$;

create or replace function private.npc_act(n game.npcs) returns void
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
      select pr.item_id, pr.value_cents into r from game.prices pr join game.set_defs s on s.id = pr.set_id
      where pr.kind = 'card' and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
      perform private.npc_order(n.id, r.item_id, 1, round(r.value_cents * (p ->> 'orderPct')::numeric / 100)::bigint);
    end loop;

  elsif n.archetype = 'dealer' then
    delete from game.listings where npc_id = n.id and created_at < private.now() - make_interval(hours => (p ->> 'maxAgeH')::int);
    for i in 1 .. greatest(0, (p ->> 'stock')::int - (select count(*) from game.listings where npc_id = n.id)::int) loop
      v_hit := private.rand() * 100 < (p ->> 'hitChancePct')::numeric;
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id join game.set_defs s on s.id = c.set_id
      where s.phase not in ('announced', 'preorder')
        and ((v_hit and c.tier in ('holo', 'alternative', 'ultra', 'grail')) or (not v_hit and c.tier in ('common', 'uncommon', 'rare')))
      order by private.rand() limit 1;
      perform private.npc_list(n.id, r.item_id, case when v_hit then 1 else 1 + floor(private.rand() * 3)::int end,
        round(r.value_cents * ((p ->> 'markupMinPct')::numeric + private.rand() * ((p ->> 'markupMaxPct')::numeric - (p ->> 'markupMinPct')::numeric)) / 100)::bigint);
    end loop;

  elsif n.archetype = 'bulk' then
    perform private.npc_orders_expire(n.id, interval '24 hours');
    for i in 1 .. greatest(0, (p ->> 'orders')::int - (select count(*) from game.buy_orders where npc_id = n.id)::int) loop
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id join game.set_defs s on s.id = c.set_id
      where c.tier in ('common', 'uncommon') and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
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

create or replace function private.ad_create_npc() returns void
language plpgsql set search_path = '' as $$
declare
  v_style text;
  v_roll numeric := private.rand() * 100;
  v_item text;
  v_kind text;
  v_value bigint;
  v_qty int;
  v_ask numeric;
  v_min numeric;
  v_risk text;
  v_hit boolean;
begin
  v_style := case when private.rand() < 0.35 then 'attic' when private.rand() < 0.62 then 'normal' else 'dreamer' end;
  if v_roll < private.cfg_num('ads.sealed_pct') then
    select d.id into v_item from game.product_defs d join game.set_defs s on s.id = d.set_id
    where d.kind = 'booster' and not s.house and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
    v_kind := 'sealed';
    v_qty := 1 + floor(private.rand() * 3)::int;
  else
    v_hit := private.rand() * 100 < private.cfg_num('ads.hit_pct');
    select c.id into v_item from game.card_defs c join game.set_defs s on s.id = c.set_id
    where s.phase not in ('announced', 'preorder')
      and ((v_hit and c.tier in ('holo', 'alternative', 'ultra', 'grail')) or (not v_hit and c.tier in ('common', 'uncommon', 'rare')))
    order by private.rand() limit 1;
    v_kind := 'card';
    v_qty := case when v_hit then 1 else 1 + floor(private.rand() * 4)::int end;
  end if;
  v_value := private.card_or_product_value(v_item) * v_qty;
  if v_style = 'attic' then
    v_ask := v_value * private.rand_between(0.4, 0.8);
    v_min := v_ask * private.rand_between(0.7, 0.9);
    v_risk := case when private.rand() * 100 < private.cfg_num('ads.attic_fake_pct') then 'fake'
                   when v_hit and private.rand() * 100 < private.cfg_num('ads.attic_knick_pct') then 'knick'
                   when private.rand() * 100 < private.cfg_num('ads.ghost_pct') then 'ghost' end;
  elsif v_style = 'normal' then
    v_ask := v_value * private.rand_between(0.9, 1.2);
    v_min := v_value * private.rand_between(0.8, 0.95);
    v_risk := case when private.rand() * 100 < private.cfg_num('ads.ghost_pct') then 'ghost' end;
  else
    v_ask := v_value * private.rand_between(1.5, 3);
    v_min := v_value * private.rand_between(1.05, 1.3);
  end if;
  insert into game.ads (npc_id, seller_idx, style, title_idx, item_kind, item_id, qty, ask_cents, min_cents, patience, risk,
                        created_at, expires_at)
  values (case when v_style = 'attic' then 'doris' end, floor(private.rand() * 1000)::int,
          v_style, floor(private.rand() * 1000)::int, v_kind, v_item, v_qty, greatest(1, round(v_ask)), greatest(1, round(least(v_min, v_ask))),
          2 + floor(private.rand() * 3)::int, v_risk, private.now(),
          private.now() + make_interval(hours => (private.cfg_num('ads.npc_hours') * private.rand_between(0.5, 1.5))::int));
end $$;

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
    select c2.id into v_card from game.card_defs c2 join game.set_defs s on s.id = c2.set_id
    where c2.tier in ('holo', 'alternative', 'ultra') and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
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

create or replace function private.reward_booster(p_player uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce(
    (select pd.id from game.players p
     join game.set_defs s on s.game = p.fav_game
     join game.product_defs pd on pd.set_id = s.id and pd.kind = 'booster'
     where p.id = p_player and s.phase not in ('announced', 'preorder') order by s.id, pd.id limit 1),
    private.cfg('reward.default_product') #>> '{}')
$$;

create or replace function public.market_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'games', coalesce((select jsonb_agg(jsonb_build_object('game', game, 'hype', round(hype, 3)) order by game) from game.market), '[]'::jsonb),
    'sets', coalesce((
      select jsonb_agg(jsonb_build_object('set_id', id, 'phase', phase, 'packs_opened', packs_opened) order by id) from game.set_defs
    ), '[]'::jsonb),
    'movers', coalesce((
      select jsonb_agg(jsonb_build_object('item_id', item_id, 'kind', kind, 'value_cents', value_cents,
        'change_pct', round(100.0 * (value_cents - day_open_cents) / day_open_cents, 1)) order by abs(value_cents - day_open_cents)::numeric / day_open_cents desc)
      from (
        select p.* from game.prices p join game.set_defs s on s.id = p.set_id
        where coalesce(p.day_open_cents, 0) > 0 and p.value_cents <> p.day_open_cents and s.phase not in ('announced', 'preorder')
        order by abs(p.value_cents - p.day_open_cents)::numeric / p.day_open_cents desc
        limit 8
      ) m
    ), '[]'::jsonb)
  );
end $$;

create or replace function private.tick_headlines() returns void
language plpgsql set search_path = '' as $$
declare
  v_today date := private.today();
  v_since timestamptz := v_today::timestamp at time zone 'Europe/Berlin';
  v_min bigint := private.eur(private.cfg_num('feed.price_move_min_base_cents'));
  r record;
begin
  for r in
    (select 'up' as dir, p.item_id, round(100.0 * p.value_cents / p.day_open_cents - 100)::int as pct
     from game.prices p join game.set_defs s on s.id = p.set_id
     where p.day = v_today and p.day_open_cents >= v_min and s.phase not in ('announced', 'preorder')
     order by p.value_cents::numeric / p.day_open_cents desc limit 1)
    union all
    (select 'down', p.item_id, round(100.0 * p.value_cents / p.day_open_cents - 100)::int
     from game.prices p join game.set_defs s on s.id = p.set_id
     where p.day = v_today and p.day_open_cents >= v_min and s.phase not in ('announced', 'preorder')
     order by p.value_cents::numeric / p.day_open_cents limit 1)
  loop
    if abs(r.pct) >= private.cfg_num('feed.price_move_pct') and (r.dir = 'up') = (r.pct > 0)
       and not exists (select 1 from game.feed where kind = 'price_move' and at >= v_since and data ->> 'dir' = r.dir) then
      perform private.feed_add('price_move', jsonb_build_object('dir', r.dir, 'item_id', r.item_id, 'pct', r.pct));
    end if;
  end loop;
end $$;

create or replace function private.tick_market() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
  v_today date := private.today();
  v_p numeric := (select price_level from game.server where id);
begin
  -- Catalog entries get their price row; base values follow the seeded catalog.
  insert into game.prices (item_id, kind, set_id, base_cents, value_cents)
  select id, 'card', set_id, value_base_cents, round(value_base_cents * v_p) from game.card_defs
  on conflict (item_id) do update set base_cents = excluded.base_cents;
  insert into game.prices (item_id, kind, set_id, base_cents, value_cents)
  select id, 'sealed', set_id, price_base_cents, round(price_base_cents * v_p) from game.product_defs
  on conflict (item_id) do update set base_cents = excluded.base_cents;
  insert into game.market (game) select distinct game from game.set_defs on conflict do nothing;

  -- Hype-Index per game: a slow mean-reverting random walk inside its band.
  update game.market set hype = least(private.cfg_num('market.hype_max'), greatest(private.cfg_num('market.hype_min'),
    hype + private.cfg_num('market.hype_revert') * (1 - hype) + private.cfg_num('market.hype_sigma') * private.rand_normal()))
  where true;

  -- Own hype drifts back to 1 with noise; pressure fades towards 1 with its half-life.
  update game.prices set
    hype = least(private.cfg_num('market.card_hype_max'), greatest(private.cfg_num('market.card_hype_min'),
      1 + (hype - 1) * (1 - private.cfg_num('market.card_hype_revert')) + private.cfg_num('market.card_hype_sigma') * private.rand_normal())),
    pressure = 1 + (pressure - 1) * power(0.5,
      greatest(0, extract(epoch from v_now - coalesce(updated_at, v_now))) / 3600 / private.cfg_num('market.pressure_half_life_h'))
  where true;

  -- New Marktwert, bounded per day against the day's opening value. Sealed in print stays between a
  -- floor and a ceiling around its list price.
  with f as (
    select p.item_id,
      case when p.day is distinct from v_today then p.value_cents else p.day_open_cents end as open_cents,
      case when p.kind = 'sealed' and s.phase not in ('oop', 'vintage')
        then p.base_cents * v_p * least(private.cfg_num('market.sealed_print_max'),
               greatest(private.cfg_num('market.sealed_floor'), m.hype * p.hype * p.pressure))
        else p.base_cents * v_p * private.set_factor(p.set_id, p.kind) * m.hype * p.hype * p.pressure
      end as raw
    from game.prices p
    join game.set_defs s on s.id = p.set_id
    join game.market m on m.game = s.game
  )
  update game.prices p set
    day = v_today,
    day_open_cents = f.open_cents,
    value_cents = greatest(1, round(least(f.open_cents * (1 + private.cfg_num('market.day_up_pct') / 100),
      greatest(f.open_cents * (1 - private.cfg_num('market.day_down_pct') / 100), f.raw)))),
    updated_at = v_now
  from f
  where f.item_id = p.item_id;

  -- No history for sets that are not out yet: nobody can see or trade them, and it keeps the database small.
  insert into game.price_history (item_id, at, value_cents)
  select p.item_id, v_now, p.value_cents from game.prices p join game.set_defs s on s.id = p.set_id
  where s.phase not in ('announced', 'preorder')
  on conflict do nothing;
end $$;
