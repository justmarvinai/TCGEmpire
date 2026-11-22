-- alpha_09 (Firma), part 4: Großhandel (docs/GAME_DESIGN.md §7.5, level 40 with a company: a weekly allocation of
-- displays at the dealer price, more with every stage) and research (§9.3, from the UG on: a stronger brand for
-- the company's slabs and its own Black Label).

alter table game.companies add column research jsonb not null default '[]';

create table game.wholesale_buys (
  player_id uuid not null references game.players (id) on delete cascade,
  week date not null,
  qty int not null,
  primary key (player_id, week)
);
alter table game.wholesale_buys enable row level security;

-- Research adds to the brand (a scandal still takes its share).
create or replace function private.company_brand_bps(p_company bigint) returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select ((private.cfg_num('company.brand_base_bps') + private.cfg_num('company.brand_per_ruf_bps') * p.ruf
             + coalesce((select sum((private.cfg('company.research') -> r ->> 'brandBps')::numeric)
                         from jsonb_array_elements_text(c.research) r), 0))
            * case when c.scandal_until > private.now() then private.cfg_num('company.scandal_brand_pct') / 100 else 1 end)::int
    from game.companies c join game.players p on p.id = c.owner_id where c.id = p_company and c.closed_at is null
  ), private.cfg_num('company.brand_base_bps')::int)
$$;

-- The company's own Black Label: four quality values of 10, a 10 on the label.
create or replace function private.grade_roll(c game.card_copies, p_grader text) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  g jsonb := private.cfg('grading.graders') -> p_grader;
  q numeric[] := array[c.q_centering, c.q_corners, c.q_edges, c.q_surface];
  s numeric[] := '{}';
  r numeric;
  v_low numeric;
  v_grade numeric;
  v_wrong numeric;
  i int;
begin
  if p_grader like 'co:%' then
    v_wrong := 100 - coalesce((select private.company_accuracy(co, true) from game.companies co where co.id = private.company_id_of(p_grader)), 80);
    r := private.rand() * 100;
    v_grade := least(10, greatest(1, (select min(x) from unnest(q) x)
      + case when r < v_wrong * 0.7 then -1 when r < v_wrong then 1 else 0 end
      + case when (select bumped from game.grading_orders where copy_id = c.id) then 1 else 0 end));
    return jsonb_build_object('grade', v_grade, 'subgrades', null,
      'black_label', v_grade = 10 and (select min(x) from unnest(q) x) = 10
        and coalesce((select research ? 'blacklabel' from game.companies where id = private.company_id_of(p_grader)), false));
  end if;
  if p_grader = 'bgs' then
    for i in 1 .. 4 loop
      r := private.rand() * 100;
      s := s || least(10, greatest(1, q[i]
        + case when r < (g ->> 'half_down_pct')::numeric then -0.5
               when r < (g ->> 'half_down_pct')::numeric + (g ->> 'half_up_pct')::numeric then 0.5
               else 0 end));
    end loop;
    v_low := (select min(x) from unnest(s) x);
    v_grade := least(floor(((s[1] + s[2] + s[3] + s[4]) / 4 + 0.125) * 2) / 2, v_low + 1);
    return jsonb_build_object('grade', v_grade, 'subgrades', to_jsonb(s), 'black_label', v_low = 10);
  end if;
  r := private.rand() * 100;
  v_grade := least(10, greatest(1, (select min(x) from unnest(q) x)
    + case when r < (g ->> 'down_pct')::numeric then -1
           when r < (g ->> 'down_pct')::numeric + (g ->> 'up_pct')::numeric then 1
           else 0 end));
  return jsonb_build_object('grade', v_grade, 'subgrades', null, 'black_label', false);
end $$;

-- Displays the player may still buy this week at the dealer price.
create function private.wholesale_left(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select greatest(0, (private.cfg('wholesale.displays_per_stage') ->> (c.stage - 1))::int
      - coalesce((select qty from game.wholesale_buys where player_id = p_player and week = private.week_start()), 0))
    from game.companies c where c.owner_id = p_player and c.closed_at is null
  ), 0)
$$;

create function private.wholesale_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.wholesale')::int,
    'left', private.wholesale_left(p_player),
    'delivery_minutes', private.cfg_num('wholesale.delivery_minutes')::int,
    'displays', coalesce((select jsonb_agg(jsonb_build_object('product_id', d.id,
                  'price_cents', private.eur(d.price_base_cents * private.cfg_num('wholesale.price_bps') / 10000),
                  'list_cents', private.eur(d.price_base_cents)) order by d.id)
                 from game.product_defs d join game.set_defs s on s.id = d.set_id
                 where d.kind = 'display' and s.phase in ('print', 'last_wave')), '[]'::jsonb))
$$;

-- The company page also shows research and the Großhandel.
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
    'awards', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'at', at) order by at) from game.company_awards where company_id = c.id), '[]'::jsonb),
    'research', jsonb_build_object('owned', c.research, 'stage', private.cfg_num('company.research_stage')::int,
      'costs', (select jsonb_object_agg(key, private.eur((value ->> 'costBaseCents')::numeric)) from jsonb_each(private.cfg('company.research')))),
    'wholesale', private.wholesale_doc(c.owner_id)
  )
$$;

create function public.company_research(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_research');
  c game.companies := private.my_company(v_player);
  r jsonb := private.cfg('company.research') -> p_key;
  v_cost bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if r is null then
    perform private.fail('invalid_request');
  end if;
  if c.stage < private.cfg_num('company.research_stage') then
    perform private.fail('locked');
  end if;
  if c.research ? p_key then
    perform private.fail('already_owned');
  end if;
  v_cost := private.eur((r ->> 'costBaseCents')::numeric);
  perform private.company_spend(c.id, v_cost);
  perform private.company_book(c.id, 0, 0, v_cost);
  update game.companies set research = research || to_jsonb(p_key), invested_cents = invested_cents + v_cost where id = c.id;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player));
end $$;
select private.expose('public.company_research(uuid, text)');

-- Großhandel: displays at the dealer price from the weekly allocation, paid by the player, delivered as a parcel.
create function public.wholesale_buy(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'wholesale_buy');
  v_price bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'wholesale');
  perform private.rate_limit(v_player, 'buy', private.cfg_num('rate.buy')::int, 60);
  perform 1 from game.players where id = v_player for update;
  if not exists (select 1 from game.companies where owner_id = v_player and closed_at is null) then
    perform private.fail('not_found');
  end if;
  if p_qty is null or p_qty < 1 or not exists (
       select 1 from game.product_defs d join game.set_defs s on s.id = d.set_id
       where d.id = p_product and d.kind = 'display' and s.phase in ('print', 'last_wave')) then
    perform private.fail('invalid_request');
  end if;
  if p_qty > private.wholesale_left(v_player) then
    perform private.fail('group_week_limit');
  end if;
  perform private.lager_check(v_player, p_qty);
  v_price := private.eur((select price_base_cents from game.product_defs where id = p_product) * private.cfg_num('wholesale.price_bps') / 10000);
  perform private.money_add(v_player, -v_price * p_qty, 'wholesale', p_product);
  insert into game.wholesale_buys (player_id, week, qty) values (v_player, private.week_start(), p_qty)
  on conflict (player_id, week) do update set qty = game.wholesale_buys.qty + excluded.qty;
  insert into game.shipments (buyer_id, item_kind, item_id, qty, total_cents, fee_cents, arrives_at, created_at)
  values (v_player, 'sealed', p_product, p_qty, v_price * p_qty, 0,
          private.now() + make_interval(mins => private.cfg_num('wholesale.delivery_minutes')::int), private.now());
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.wholesale_buy(uuid, text, int)');
