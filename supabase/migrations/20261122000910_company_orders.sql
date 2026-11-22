-- alpha_09 (Firma), part 2: players send cards to a friend's company (docs/GAME_DESIGN.md §9.2). A company slab
-- has the grader 'co:<company id>', the company's label and a brand value from the owner's Ruf (a closed company's
-- slabs keep the lowest brand). The company grades like PSA (the worst quality value), wrong now and then by its
-- accuracy. VIP orders: the owner judges the four quality values himself (§9.3, "Selbst graden").

alter table game.card_copies drop constraint card_copies_grader_check;
alter table game.card_copies add constraint card_copies_grader_check check (grader in ('psa', 'bgs', 'cgc') or grader ~ '^co:[0-9]+$');
alter table game.grading_orders drop constraint grading_orders_grader_check;
alter table game.grading_orders add constraint grading_orders_grader_check check (grader in ('psa', 'bgs', 'cgc') or grader ~ '^co:[0-9]+$');
-- Gefälligkeitsgutachten (shady, set by the company owner): one grade more for this order
alter table game.grading_orders add column bumped boolean not null default false;

create table game.company_vip (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references game.companies (id) on delete cascade,
  card_id text not null references game.card_defs (id),
  q smallint[] not null,
  width int not null,
  fee_cents bigint not null,
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create index company_vip_company on game.company_vip (company_id, expires_at);
create index company_vip_card on game.company_vip (card_id);
alter table game.company_vip enable row level security;

create function private.company_id_of(p_grader text) returns bigint
language sql immutable set search_path = '' as $$
  select case when p_grader like 'co:%' then substr(p_grader, 4)::bigint end
$$;

-- ---------------------------------------------------------------------------------------------
-- Grading by a company
-- ---------------------------------------------------------------------------------------------
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
    -- the worst quality value; the share of wrong grades follows the company's accuracy (mostly too strict)
    v_wrong := 100 - coalesce((select private.company_accuracy(co, true) from game.companies co where co.id = private.company_id_of(p_grader)), 80);
    r := private.rand() * 100;
    v_grade := (select min(x) from unnest(q) x)
      + case when r < v_wrong * 0.7 then -1 when r < v_wrong then 1 else 0 end
      + case when (select bumped from game.grading_orders where copy_id = c.id) then 1 else 0 end;
    return jsonb_build_object('grade', least(10, greatest(1, v_grade)), 'subgrades', null, 'black_label', false);
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

create or replace function private.cert_next(p_grader text) returns text
language sql volatile set search_path = '' as $$
  select case
    when p_grader = 'psa' then (10000000 + (n * 7919) % 90000000)::text
    when p_grader = 'bgs' then lpad(((n * 7919) % 1000000000)::text, 10, '0')
    when p_grader like 'co:%' then private.company_id_of(p_grader) || '-' || lpad(((n * 7919) % 10000000)::text, 7, '0')
    else (3000000000 + (n * 7919) % 1000000000)::text
  end
  from (select nextval('game.cert_seq') as n) x
$$;

-- A company slab is worth its brand: the owner's Ruf today (closed companies keep the lowest brand).
create or replace function private.slab_value(p_card text, p_grader text, p_grade numeric, p_black boolean) returns bigint
language sql stable set search_path = '' as $$
  select case when p_grader is null then private.card_value(p_card) else
    least(9000000000000000, round(private.card_value(p_card) * private.grade_factor(p_grade, p_black)
      * private.pop_factor(p_card, p_grader, p_grade)
      * case when p_grader like 'co:%' then private.company_brand_bps(private.company_id_of(p_grader))
             else (private.cfg('grading.graders') -> p_grader ->> 'brand_bps')::numeric end / 10000))::bigint
  end
$$;

create or replace function private.slab_doc(c game.card_copies) returns jsonb
language sql stable set search_path = '' as $$
  select case when c.grader is null then null else jsonb_build_object(
    'grader', c.grader,
    'grade', c.grade,
    'subgrades', to_jsonb(c.subgrades),
    'black_label', c.black_label,
    'cert_no', c.cert_no,
    'pop', (select coalesce(sum(n), 0)::int from game.pop_report
            where card_id = c.card_id and grader = c.grader and grade = c.grade and black_label = c.black_label),
    'pop_higher', (select coalesce(sum(n), 0)::int from game.pop_report
                   where card_id = c.card_id and grader = c.grader
                     and (grade > c.grade or (grade = c.grade and black_label and not c.black_label))),
    'company', (select jsonb_build_object('id', co.id, 'name', co.name, 'label', co.label)
                from game.companies co where co.id = private.company_id_of(c.grader))
  ) end
$$;

-- How long a player's order takes: the service's own time or the queue, whichever is longer.
create function private.company_eta_minutes(c game.companies, p_service text) returns int
language sql stable set search_path = '' as $$
  select greatest((private.cfg('company.service_minutes') ->> p_service)::int,
                  ceil(c.backlog / greatest(private.company_capacity(c, true), 0.01) * 60)::int)
$$;

-- ---------------------------------------------------------------------------------------------
-- VIP orders: appear now and then, judged by the owner
-- ---------------------------------------------------------------------------------------------
create or replace function private.company_cycle_extra(c game.companies, p_hours numeric, p_orders numeric) returns void
language plpgsql set search_path = '' as $$
declare
  v_card text;
begin
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
end $$;

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
            from game.company_vip v where v.company_id = c.id and v.expires_at > private.now() order by v.created_at limit 1)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
-- The other players' companies a card can go to.
create function public.companies_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slogan', c.slogan, 'label', c.label, 'owner', p.username, 'stage', c.stage,
      'ruf', p.ruf, 'brand_bps', private.company_brand_bps(c.id),
      'stars_avg', (select round(avg(stars), 1) from game.company_reviews where company_id = c.id),
      'services', (select jsonb_agg(jsonb_build_object('service', s, 'fee_cents', (c.prices ->> s)::bigint,
                     'minutes', private.company_eta_minutes(c, s)))
                   from jsonb_array_elements_text(private.company_stage_def(c.stage) -> 'services') s)
    ) order by p.ruf desc, c.id)
    from game.companies c join game.players p on p.id = c.owner_id
    where c.closed_at is null and c.owner_id <> v_player
  ), '[]'::jsonb);
end $$;
select private.expose('public.companies_list()');

create function public.company_order_submit(p_request_id uuid, p_copies uuid[], p_company bigint, p_service text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_order_submit');
  c game.companies;
  v_n int := coalesce(array_length(p_copies, 1), 0);
  v_fee bigint;
  v_found int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  perform private.rate_limit(v_player, 'grading', private.cfg_num('rate.grading')::int, 60);
  select * into c from game.companies where id = p_company and closed_at is null for update;
  if not found or c.owner_id = v_player or p_service is null
     or not (private.company_stage_def(c.stage) -> 'services') ? p_service
     or v_n = 0 or v_n > 50 or v_n <> (select count(distinct x) from unnest(p_copies) x) then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id in (v_player, c.owner_id) order by id for update;
  if (select count(*) from game.grading_orders where player_id = v_player) + v_n > private.grading_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  v_fee := (c.prices ->> p_service)::bigint;
  with taken as (
    update game.card_copies set location = 'grading'
    where id = any (p_copies) and owner_id = v_player and location = 'inventory' and grader is null
    returning id
  ), placed as (
    insert into game.grading_orders (player_id, copy_id, grader, service, fee_cents, submitted_at, due_at)
    select v_player, t.id, 'co:' || c.id, p_service, v_fee, private.now(),
           private.now() + make_interval(mins => private.company_eta_minutes(c, p_service))
    from taken t
    returning 1
  )
  select count(*) into v_found from placed;
  if v_found <> v_n then
    perform private.fail('not_owned');
  end if;
  -- the customer pays the company
  perform private.money_add(v_player, -v_fee * v_n, 'grading', 'co:' || c.id);
  update game.companies set cash_cents = cash_cents + v_fee * v_n where id = c.id;
  perform private.company_book(c.id, 0, v_fee * v_n, 0);
  perform private.emit(v_player, 'grading_submitted', v_n);
  perform private.notify(c.owner_id, 'company_order', jsonb_build_object('name', (select username from game.players where id = v_player), 'n', v_n));
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'fee_cents', v_fee * v_n, 'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.company_order_submit(uuid, uuid[], bigint, text)');

-- The owner judges a VIP card: the closer to the truth, the more of the fee and the more Ruf.
create function public.company_vip_grade(p_request_id uuid, p_vip uuid, p_values int[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_vip_grade');
  c game.companies;
  v game.company_vip;
  v_err int;
  v_paid bigint;
  v_ruf int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_values is null or array_length(p_values, 1) <> 4 or exists (select 1 from unnest(p_values) x where x is null or x not between 1 and 10) then
    perform private.fail('invalid_request');
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  delete from game.company_vip where id = p_vip and company_id = c.id and expires_at > private.now() returning * into v;
  if not found then
    perform private.fail('not_found');
  end if;
  v_err := abs(p_values[1] - v.q[1]) + abs(p_values[2] - v.q[2]) + abs(p_values[3] - v.q[3]) + abs(p_values[4] - v.q[4]);
  v_paid := round(v.fee_cents * greatest(0, 1 - v_err / private.cfg_num('company.vip_error_zero')));
  v_ruf := case when v_err = 0 then private.cfg_num('company.vip_ruf_exact') when v_err <= 2 then private.cfg_num('company.vip_ruf_close')
                when v_err >= 6 then private.cfg_num('company.vip_ruf_bad') else 0 end;
  update game.companies set cash_cents = cash_cents + v_paid where id = c.id;
  perform private.company_book(c.id, 1, v_paid, 0);
  update game.players set ruf = least(1000, greatest(0, ruf + v_ruf)) where id = v_player;
  perform private.ep_grant(v_player, private.cfg_num('ep.grading'));
  perform private.emit(v_player, 'vip_graded');
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object(
    'result', jsonb_build_object('truth', to_jsonb(v.q), 'guess', to_jsonb(p_values), 'error', v_err, 'paid_cents', v_paid, 'ruf', v_ruf)));
end $$;
select private.expose('public.company_vip_grade(uuid, uuid, int[])');
