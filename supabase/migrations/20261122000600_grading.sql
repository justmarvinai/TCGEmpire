-- alpha_06 (Grading), part 1 (docs/GAME_DESIGN.md §8, docs/ECONOMY.md §5.3). Vorprüfung with the Lupe, orders
-- to PSA / BGS / CGC with service levels and timers, the grade roll, slabs with their value, cracking, the Pop
-- Report, the Vitrine and the Master Set goal. A slab is a card copy with a grader and a grade; everything that
-- values a copy (net worth, trades, markets) uses private.slab_value from here on.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
alter table game.card_copies drop constraint card_copies_location_check;
alter table game.card_copies add constraint card_copies_location_check
  check (location in ('inventory', 'listed', 'shipping', 'grading', 'vitrine'));
alter table game.card_copies
  add column grader text check (grader in ('psa', 'bgs', 'cgc')),
  add column grade numeric(3,1) check (grade between 1 and 10),
  add column subgrades numeric(3,1)[],
  add column black_label boolean not null default false,
  add column cert_no text unique,
  add column graded_at timestamptz,
  -- width of the Vorprüfung ranges the owner has seen (null: never looked)
  add column inspected_w smallint check (inspected_w between 0 and 10),
  add column vitrine_pos smallint,
  add constraint card_copies_graded check ((grader is null) = (grade is null));

alter table game.collection add column best_grade numeric(3,1);
alter table game.goal_defs add column min_grade numeric(3,1);

create table game.grading_orders (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  copy_id uuid not null unique references game.card_copies (id) on delete cascade,
  grader text not null check (grader in ('psa', 'bgs', 'cgc')),
  service text not null check (service in ('economy', 'standard', 'express')),
  fee_cents bigint not null,
  submitted_at timestamptz not null,
  due_at timestamptz not null,
  notified boolean not null default false
);
create index grading_orders_player on game.grading_orders (player_id, due_at);
create index grading_orders_due on game.grading_orders (due_at) where not notified;

-- Every slab ever made, like the real thing: cracked slabs stay counted.
create table game.pop_report (
  card_id text not null references game.card_defs (id),
  grader text not null,
  grade numeric(3,1) not null,
  black_label boolean not null default false,
  n int not null default 0,
  primary key (card_id, grader, grade, black_label)
);

create sequence game.cert_seq;

alter table game.grading_orders enable row level security;
alter table game.pop_report enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Value of a slab: Marktwert × grade factor × pop factor × brand factor (docs/ECONOMY.md §5.3)
-- ---------------------------------------------------------------------------------------------
create function private.grade_factor(p_grade numeric, p_black boolean) returns numeric
language sql stable set search_path = '' as $$
  select case
    when p_black then private.cfg_num('grading.black_label_bps')
    when p_grade = 9.5 then private.cfg_num('grading.gem_mint_bps')
    else ((private.cfg('grading.grade_factor_bps') ->> (floor(p_grade)::int - 1))::numeric
        + (private.cfg('grading.grade_factor_bps') ->> (ceil(p_grade)::int - 1))::numeric) / 2
  end / 10000
$$;

-- The fewer 10s of a card exist at a grader, the more each is worth.
create function private.pop_factor(p_card text, p_grader text, p_grade numeric) returns numeric
language sql stable set search_path = '' as $$
  select case when p_grade < 10 then 1 else
    1 + private.cfg_num('grading.pop_bonus_bps') / 10000 * private.cfg_num('grading.pop_ref')
      / (private.cfg_num('grading.pop_ref')
         + coalesce((select sum(n) from game.pop_report where card_id = p_card and grader = p_grader and grade = 10), 0))
  end
$$;

-- Value of a copy from its columns: the Marktwert when raw, the slab value when graded.
create function private.slab_value(p_card text, p_grader text, p_grade numeric, p_black boolean) returns bigint
language sql stable set search_path = '' as $$
  select case when p_grader is null then private.card_value(p_card) else
    least(9000000000000000, round(private.card_value(p_card) * private.grade_factor(p_grade, p_black)
      * private.pop_factor(p_card, p_grader, p_grade)
      * (private.cfg('grading.graders') -> p_grader ->> 'brand_bps')::numeric / 10000))::bigint
  end
$$;

create function private.copy_value(p_copy uuid) returns bigint
language sql stable set search_path = '' as $$
  select private.slab_value(card_id, grader, grade, black_label) from game.card_copies where id = p_copy
$$;

-- Label of a slab (null for a raw copy) with its population: same grade and higher at the same grader.
create function private.slab_doc(c game.card_copies) returns jsonb
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
                     and (grade > c.grade or (grade = c.grade and black_label and not c.black_label)))
  ) end
$$;

-- Label of a copy by id, for documents that only hold the id (listings, ads, trades).
create function private.slab_of(p_copy uuid) returns jsonb
language sql stable set search_path = '' as $$
  select private.slab_doc(c) from game.card_copies c where c.id = p_copy
$$;

-- ---------------------------------------------------------------------------------------------
-- Vorprüfung, fees, the grade roll
-- ---------------------------------------------------------------------------------------------
create function private.inspect_width(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select greatest(0, private.cfg_num('grading.inspect_width') - private.stat(p_player, 'pregrade_skill', 0))::int
$$;

create function private.grading_slots(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('grading.slots') + private.stat(p_player, 'grading_slots', 0))::int
$$;

-- A quality value as the Lupe shows it: a range p_w wide that contains it, the same every time for the same
-- copy, value and width.
create function private.q_range(p_copy uuid, p_aspect int, p_q int, p_w int) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_array(lo, lo + p_w) from (
    select least(greatest(p_q - abs(hashtext(p_copy::text || ':' || p_aspect || ':' || p_w)::bigint) % (p_w + 1), 1), 10 - p_w) as lo
  ) x
$$;

create function private.copy_ranges(c game.card_copies) returns jsonb
language sql immutable set search_path = '' as $$
  select case when c.inspected_w is null then null else jsonb_build_object(
    'width', c.inspected_w,
    'centering', private.q_range(c.id, 1, c.q_centering, c.inspected_w),
    'corners', private.q_range(c.id, 2, c.q_corners, c.inspected_w),
    'edges', private.q_range(c.id, 3, c.q_edges, c.inspected_w),
    'surface', private.q_range(c.id, 4, c.q_surface, c.inspected_w)
  ) end
$$;

-- Upcharge per grader on valuable cards: a share of the Marktwert above the threshold.
create function private.grading_upcharge(p_card text, p_grader text) returns bigint
language sql stable set search_path = '' as $$
  select round(greatest(0, private.card_value(p_card) - private.eur(private.cfg_num('grading.upcharge_from_base_cents')))
               * (private.cfg('grading.graders') -> p_grader ->> 'upcharge_bps')::numeric / 10000)::bigint
$$;

create function private.grading_fee(p_card text, p_grader text, p_service text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur((private.cfg('grading.graders') -> p_grader -> 'fees_base_cents' ->> p_service)::numeric)
       + private.grading_upcharge(p_card, p_grader)
$$;

-- The grader looks at the copy. PSA and CGC: the worst quality value, one off now and then. BGS: half-point
-- sub-grades, overall near their average but at most one above the worst; four 10s are the Black Label.
create function private.grade_roll(c game.card_copies, p_grader text) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  g jsonb := private.cfg('grading.graders') -> p_grader;
  q numeric[] := array[c.q_centering, c.q_corners, c.q_edges, c.q_surface];
  s numeric[] := '{}';
  r numeric;
  v_low numeric;
  v_grade numeric;
  i int;
begin
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

-- Certificate numbers: PSA 8 digits, BGS 10 digits with leading zeros, CGC 10 digits from 3; unique and
-- scrambled so they do not count up visibly.
create function private.cert_next(p_grader text) returns text
language sql volatile set search_path = '' as $$
  select case p_grader
    when 'psa' then (10000000 + (n * 7919) % 90000000)::text
    when 'bgs' then lpad(((n * 7919) % 1000000000)::text, 10, '0')
    else (3000000000 + (n * 7919) % 1000000000)::text
  end
  from (select nextval('game.cert_seq') as n) x
$$;

-- A slab of a card counts for the Master Set of whoever holds it (graded, bought or traded).
create function private.on_copy_graded() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into game.collection (player_id, card_id, first_at, best_grade)
  values (new.owner_id, new.card_id, private.now(), new.grade)
  on conflict (player_id, card_id) do update set best_grade = excluded.best_grade
  where game.collection.best_grade is null or game.collection.best_grade < excluded.best_grade;
  if found then
    perform private.goals_check(new.owner_id, new.card_id);
  end if;
  return new;
end $$;
create trigger card_copies_graded after insert or update of owner_id, grade on game.card_copies
  for each row when (new.grade is not null) execute function private.on_copy_graded();

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
create function private.vitrine_slots(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('vitrine.slots') + private.stat(p_player, 'vitrine_slots', 0))::int
$$;

create function private.vitrine_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'copy_id', c.id, 'card_id', c.card_id, 'slab', private.slab_doc(c),
    'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label)
  ) order by c.vitrine_pos), '[]'::jsonb)
  from game.card_copies c where c.owner_id = p_player and c.location = 'vitrine'
$$;

create function private.grading_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.grading')::int,
    'slots', private.grading_slots(p_player),
    'used', (select count(*)::int from game.grading_orders where player_id = p_player),
    'width', private.inspect_width(p_player),
    'upcharge_from_cents', private.eur(private.cfg_num('grading.upcharge_from_base_cents')),
    'graders', (
      select jsonb_object_agg(e.key, jsonb_build_object(
        'brand_bps', (e.value ->> 'brand_bps')::int,
        'upcharge_bps', (e.value ->> 'upcharge_bps')::int,
        'fees_cents', (select jsonb_object_agg(f.key, private.eur((f.value #>> '{}')::numeric))
                       from jsonb_each(e.value -> 'fees_base_cents') f),
        'minutes', e.value -> 'minutes'
      ))
      from jsonb_each(private.cfg('grading.graders')) e
    ),
    'copies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'copy_id', c.id, 'card_id', c.card_id, 'value_cents', private.card_value(c.card_id),
        'ranges', private.copy_ranges(c),
        'upcharge_cents', jsonb_build_object('psa', private.grading_upcharge(c.card_id, 'psa'),
          'bgs', private.grading_upcharge(c.card_id, 'bgs'), 'cgc', private.grading_upcharge(c.card_id, 'cgc'))
      ) order by private.card_value(c.card_id) desc, c.pulled_at)
      from game.card_copies c where c.owner_id = p_player and c.location = 'inventory' and c.grader is null
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'copy_id', o.copy_id, 'card_id', c.card_id, 'grader', o.grader, 'service', o.service,
        'fee_cents', o.fee_cents, 'submitted_at', o.submitted_at, 'due_at', o.due_at
      ) order by o.due_at, o.id)
      from game.grading_orders o join game.card_copies c on c.id = o.copy_id where o.player_id = p_player
    ), '[]'::jsonb),
    'slabs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'copy_id', c.id, 'card_id', c.card_id, 'location', c.location, 'slab', private.slab_doc(c),
        'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label),
        'raw_cents', private.card_value(c.card_id)
      ) order by c.graded_at desc)
      from game.card_copies c where c.owner_id = p_player and c.grader is not null and c.location <> 'shipping'
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function public.grading_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.grading_doc(v_player);
end $$;
select private.expose('public.grading_get()');

-- Vorprüfung: look at a hit (p_copy) or at one card of a bulk stack (p_card), which becomes a copy for that.
create function public.grading_inspect(p_request_id uuid, p_copy uuid, p_card text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'grading_inspect');
  v_copy uuid := p_copy;
  c game.card_copies;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  perform private.rate_limit(v_player, 'grading', private.cfg_num('rate.grading')::int, 60);
  if v_copy is null then
    if p_card is null or private.is_hit(p_card) is distinct from false then
      perform private.fail('invalid_request');
    end if;
    perform 1 from game.players where id = v_player for update;
    perform private.item_take(v_player, 'card', p_card, null, 1, null);
    v_copy := private.copy_create(v_player, p_card);
  end if;
  update game.card_copies set inspected_w = least(coalesce(inspected_w, 10), private.inspect_width(v_player))
  where id = v_copy and owner_id = v_player and location = 'inventory' and grader is null
  returning * into c;
  if not found then
    perform private.fail('not_owned');
  end if;
  perform private.emit(v_player, 'pregrade');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'copy_id', c.id, 'card_id', c.card_id, 'ranges', private.copy_ranges(c),
    'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.grading_inspect(uuid, uuid, text)');

-- Sends raw copies to a grader: pays the fee per card, the cards wait at the grader until due_at.
create function public.grading_submit(p_request_id uuid, p_copies uuid[], p_grader text, p_service text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'grading_submit');
  g jsonb := private.cfg('grading.graders') -> p_grader;
  v_n int := coalesce(array_length(p_copies, 1), 0);
  v_found int;
  v_total bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  perform private.rate_limit(v_player, 'grading', private.cfg_num('rate.grading')::int, 60);
  if g is null or p_service is null or not (g -> 'fees_base_cents') ? p_service
     or v_n = 0 or v_n > 50 or v_n <> (select count(distinct x) from unnest(p_copies) x) then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if (select count(*) from game.grading_orders where player_id = v_player) + v_n > private.grading_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  with taken as (
    update game.card_copies set location = 'grading'
    where id = any (p_copies) and owner_id = v_player and location = 'inventory' and grader is null
    returning id, card_id
  ), placed as (
    insert into game.grading_orders (player_id, copy_id, grader, service, fee_cents, submitted_at, due_at)
    select v_player, t.id, p_grader, p_service, private.grading_fee(t.card_id, p_grader, p_service), private.now(),
           private.now() + make_interval(mins => (g -> 'minutes' ->> p_service)::int)
    from taken t
    returning fee_cents
  )
  select count(*), coalesce(sum(fee_cents), 0) into v_found, v_total from placed;
  if v_found <> v_n then
    perform private.fail('not_owned');
  end if;
  perform private.money_add(v_player, -v_total, 'grading', p_grader);
  perform private.emit(v_player, 'grading_submitted', v_n);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'fee_cents', v_total, 'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.grading_submit(uuid, uuid[], text, text)');

-- The parcels are back: the grade is rolled now, the copies become slabs.
create function public.grading_reveal(p_request_id uuid, p_orders bigint[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'grading_reveal');
  v_n int := coalesce(array_length(p_orders, 1), 0);
  o game.grading_orders;
  c game.card_copies;
  r jsonb;
  v_tier text;
  v_out jsonb := '[]';
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if v_n = 0 or v_n > 50 or v_n <> (select count(distinct x) from unnest(p_orders) x) then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  for o in
    select * from game.grading_orders where id = any (p_orders) and player_id = v_player order by due_at, id for update
  loop
    if o.due_at > private.now() then
      perform private.fail('not_ready');
    end if;
    select * into c from game.card_copies where id = o.copy_id for update;
    r := private.grade_roll(c, o.grader);
    update game.card_copies set
      grader = o.grader,
      grade = (r ->> 'grade')::numeric,
      subgrades = case when jsonb_typeof(r -> 'subgrades') = 'array'
                       then array(select x::numeric from jsonb_array_elements_text(r -> 'subgrades') x) end,
      black_label = (r ->> 'black_label')::boolean,
      cert_no = private.cert_next(o.grader),
      graded_at = private.now(),
      location = 'inventory'
    where id = c.id
    returning * into c;
    insert into game.pop_report (card_id, grader, grade, black_label, n)
    values (c.card_id, c.grader, c.grade, c.black_label, 1)
    on conflict (card_id, grader, grade, black_label) do update set n = game.pop_report.n + 1;
    delete from game.grading_orders where id = o.id;

    perform private.ep_grant(v_player, private.cfg_num('ep.grading'));
    perform private.emit(v_player, 'graded');
    if c.grade = 10 then
      perform private.emit(v_player, 'graded_10');
    end if;
    if c.black_label then
      perform private.emit(v_player, 'black_label');
    end if;
    select tier into v_tier from game.card_defs where id = c.card_id;
    if c.grade = 10 or (c.grade <= 4 and v_tier in ('ultra', 'grail')) then
      perform private.feed_add('slab', jsonb_build_object('name', (select username from game.players where id = v_player),
        'card_id', c.card_id, 'grader', c.grader, 'grade', c.grade, 'black_label', c.black_label));
    end if;
    v_out := v_out || jsonb_build_object(
      'order_id', o.id, 'copy_id', c.id, 'card_id', c.card_id, 'slab', private.slab_doc(c),
      'fee_cents', o.fee_cents, 'raw_cents', private.card_value(c.card_id),
      'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label));
  end loop;
  if jsonb_array_length(v_out) <> v_n then
    perform private.fail('not_found');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'results', v_out, 'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.grading_reveal(uuid, bigint[])');

-- Crack a slab open: the card is raw again (and sometimes a corner pays for it).
create function public.slab_crack(p_request_id uuid, p_copy uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'slab_crack');
  v_damage boolean := private.rand() * 100 < private.cfg_num('grading.crack_damage_pct');
  c game.card_copies;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  perform private.rate_limit(v_player, 'grading', private.cfg_num('rate.grading')::int, 60);
  update game.card_copies set
    grader = null, grade = null, subgrades = null, black_label = false, cert_no = null, graded_at = null,
    q_corners = case when v_damage then greatest(1, q_corners - 1) else q_corners end,
    inspected_w = case when v_damage then null else inspected_w end
  where id = p_copy and owner_id = v_player and location = 'inventory' and grader is not null
  returning * into c;
  if not found then
    perform private.fail('not_owned');
  end if;
  perform private.emit(v_player, 'slab_cracked');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'copy_id', c.id, 'card_id', c.card_id, 'damaged', v_damage,
    'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.slab_crack(uuid, uuid)');

-- Population of one card at every grader and grade.
create function public.pop_report_get(p_card text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  if not exists (select 1 from game.card_defs where id = p_card) then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object(
    'card_id', p_card,
    'value_cents', private.card_value(p_card),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('grader', p.grader, 'grade', p.grade, 'black_label', p.black_label, 'n', p.n,
        'value_cents', private.slab_value(p_card, p.grader, p.grade, p.black_label))
        order by p.grader, p.grade desc, p.black_label desc)
      from game.pop_report p where p.card_id = p_card and p.n > 0
    ), '[]'::jsonb),
    'mine', (select count(*)::int from game.card_copies where owner_id = v_player and card_id = p_card and grader is not null)
  );
end $$;
select private.expose('public.pop_report_get(text)');

-- Fills the Vitrine with up to vitrine_slots hits or slabs, in the given order (empty array: empty Vitrine).
create function public.vitrine_set(p_request_id uuid, p_copies uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'vitrine_set');
  v_n int := coalesce(array_length(p_copies, 1), 0);
  v_found int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  if v_n <> (select count(distinct x) from unnest(coalesce(p_copies, '{}')) x) then
    perform private.fail('invalid_request');
  end if;
  if v_n > private.vitrine_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  perform 1 from game.players where id = v_player for update;
  update game.card_copies set location = 'inventory', vitrine_pos = null where owner_id = v_player and location = 'vitrine';
  update game.card_copies c set location = 'vitrine', vitrine_pos = x.pos
  from unnest(coalesce(p_copies, '{}')) with ordinality as x(id, pos)
  where c.id = x.id and c.owner_id = v_player and c.location = 'inventory';
  get diagnostics v_found = row_count;
  if v_found <> v_n then
    perform private.fail('not_owned');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'vitrine', private.vitrine_doc(v_player), 'slots', private.vitrine_slots(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.vitrine_set(uuid, uuid[])');

-- A player's public profile: name, level, net worth, Vitrine and a few counters.
create function public.profile_get(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := private.require_player();
  p game.players;
begin
  select * into p from game.players where id = coalesce(p_player, v_me);
  if not found then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object(
    'id', p.id,
    'name', p.username,
    'title', p.title,
    'level', p.level,
    'net_worth_cents', private.net_worth(p.id),
    'created_at', p.created_at,
    'me', p.id = v_me,
    'vitrine', private.vitrine_doc(p.id),
    'slots', private.vitrine_slots(p.id),
    'unlocked', p.level >= private.cfg_num('unlock.grading'),
    'stats', jsonb_build_object(
      'pack_opened', coalesce((select total from game.counters where player_id = p.id and event = 'pack_opened'), 0),
      'graded', coalesce((select total from game.counters where player_id = p.id and event = 'graded'), 0),
      'graded_10', coalesce((select total from game.counters where player_id = p.id and event = 'graded_10'), 0),
      'collection', private.collection_count(p.id)
    )
  );
end $$;
select private.expose('public.profile_get(uuid)');

-- Arrived parcels: one notification per player and round.
create function private.tick_grading() returns void
language plpgsql set search_path = '' as $$
declare
  r record;
begin
  for r in
    select player_id, count(*)::int as n from game.grading_orders
    where not notified and due_at <= private.now() group by player_id
  loop
    begin
      update game.grading_orders set notified = true where player_id = r.player_id and not notified and due_at <= private.now();
      perform private.notify(r.player_id, 'grading_back', jsonb_build_object('n', r.n));
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('grading', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('grading', 60);

-- ---------------------------------------------------------------------------------------------
-- Sammelziele with a minimum grade (Master Set)
-- ---------------------------------------------------------------------------------------------
create function private.goal_have(p_player uuid, p_groups jsonb, p_min_grade numeric) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from jsonb_array_elements(p_groups) g
  where exists (select 1 from game.collection c where c.player_id = p_player and g ? c.card_id
                and (p_min_grade is null or c.best_grade >= p_min_grade))
$$;

create or replace function private.goals_check(p_player uuid, p_card text) returns void
language plpgsql set search_path = '' as $$
declare
  g game.goal_defs;
begin
  for g in
    select d.* from game.goal_defs d
    where exists (select 1 from jsonb_array_elements(d.groups) x where x ? p_card)
      and not exists (select 1 from game.goals_done where player_id = p_player and goal = d.key)
  loop
    if private.goal_have(p_player, g.groups, g.min_grade) = jsonb_array_length(g.groups) then
      insert into game.goals_done (player_id, goal, at) values (p_player, g.key, private.now()) on conflict do nothing;
      insert into game.modifiers (player_id, source, stat, op, value)
      values (p_player, 'goal:' || g.key, g.stat, g.op, g.value) on conflict do nothing;
      perform private.notify(p_player, 'goal_done', jsonb_build_object('goal', g.key));
      perform private.feed_add('goal', jsonb_build_object('name', (select username from game.players where id = p_player), 'goal', g.key));
      perform private.emit(p_player, 'goal_done');
    end if;
  end loop;
end $$;

create or replace function public.goals_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object('goals', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', d.key,
      'set_id', d.set_id,
      'total', jsonb_array_length(d.groups),
      'have', private.goal_have(v_player, d.groups, d.min_grade),
      'done_at', g.at,
      'stat', d.stat,
      'op', d.op,
      'value', d.value
    ) order by d.set_id, d.key), '[]'::jsonb)
    from game.goal_defs d
    left join game.goals_done g on g.goal = d.key and g.player_id = v_player
  ));
end $$;

drop function private.goal_have(uuid, jsonb);

-- ---------------------------------------------------------------------------------------------
-- Slabs everywhere a copy is valued or offered
-- ---------------------------------------------------------------------------------------------
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
  )::numeric)::bigint
$$;

-- Value of one goods line: a copy by its own value (slab or raw), anything else by Marktwert × qty.
create function private.goods_item_value(i jsonb) returns bigint
language sql stable set search_path = '' as $$
  select case when i ->> 'kind' = 'copy' then private.copy_value((i ->> 'copy_id')::uuid)
              else private.card_or_product_value(i ->> 'item_id') * (i ->> 'qty')::int end
$$;

create or replace function private.goods_value(p_goods jsonb) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (p_goods ->> 'money_cents')::numeric + coalesce((
    select sum(private.goods_item_value(i)) from jsonb_array_elements(p_goods -> 'items') i
  ), 0))::bigint
$$;

create or replace function private.goods_doc(p_goods jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'money_cents', (p_goods ->> 'money_cents')::bigint,
    'items', coalesce((
      select jsonb_agg(i || jsonb_build_object('value_cents', private.goods_item_value(i),
        'slab', case when i ->> 'kind' = 'copy' then private.slab_of((i ->> 'copy_id')::uuid) end))
      from jsonb_array_elements(p_goods -> 'items') i
    ), '[]'::jsonb),
    'value_cents', private.goods_value(p_goods)
  )
$$;

create or replace function public.trade_inventory(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := private.require_player();
begin
  if not exists (select 1 from game.players where id = p_player) then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object('items', (
    select coalesce(jsonb_agg(x order by x ->> 'item_id', x ->> 'copy_id'), '[]'::jsonb) from (
      select jsonb_build_object('kind', 'card', 'item_id', card_id, 'copy_id', null, 'qty', qty, 'value_cents', private.card_value(card_id)) as x
      from game.card_stacks where player_id = p_player and qty > 0
      union all
      select jsonb_build_object('kind', 'copy', 'item_id', c.card_id, 'copy_id', c.id, 'qty', 1,
        'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label), 'slab', private.slab_doc(c))
      from game.card_copies c where c.owner_id = p_player and c.location = 'inventory'
      union all
      select jsonb_build_object('kind', 'sealed', 'item_id', product_id, 'copy_id', null, 'qty', qty, 'value_cents', private.product_value(product_id))
      from game.sealed where player_id = p_player and qty > 0
    ) s
  ), 'cash_cents', case when p_player = v_me then (select cash_cents from game.players where id = v_me) end);
end $$;

-- Binder: raw copies stay sellable from the binder, slabs are listed apart.
create or replace function public.binder_get(p_set text) returns jsonb
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

-- NPC collectors buy listings that are cheap compared to the Marktwert, slabs compared to their slab value.
create or replace function private.npc_buy_cheap(p_npc text, p_kinds text[], p_below_pct numeric, p_max int) returns void
language plpgsql set search_path = '' as $$
declare
  r record;
begin
  for r in
    select id, qty from (
      select l.id, l.qty, l.price_cents,
        case when l.item_kind = 'copy' then private.copy_value(l.copy_id) else pr.value_cents end as worth
      from game.listings l left join game.prices pr on pr.item_id = l.item_id
      where l.seller_id is not null and l.item_kind = any (p_kinds)
    ) x
    where x.worth > 0 and x.price_cents <= x.worth * p_below_pct / 100
    order by x.price_cents::numeric / x.worth
    limit p_max
  loop
    perform private.npc_buy(p_npc, r.id, r.qty);
  end loop;
end $$;

-- Sales of slabs are logged with their label and do not move the Marktwert of the raw card.
alter table game.sales_log add column slab text;

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
          p_total, round(p_total * private.cfg_num('market.fee_bps') / 10000), private.now() + make_interval(secs => v_minutes * 60), private.now());
  insert into game.sales_log (item_id, qty, price_cents, at, slab) values (p_item, p_qty, p_total / p_qty, private.now(), v_slab);
  if v_slab is null then
    perform private.price_push(p_item, p_total / p_qty);
  end if;
end $$;

-- Value of a listing (a slab by its own value) and its label.
create function private.listing_value(l game.listings) returns bigint
language sql stable set search_path = '' as $$
  select case when l.item_kind = 'copy' then private.copy_value(l.copy_id) else private.card_or_product_value(l.item_id) end
$$;

create or replace function private.my_market_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'item_id', l.item_id,
      'qty', l.qty, 'price_cents', l.price_cents, 'value_cents', private.listing_value(l), 'slab', private.slab_of(l.copy_id))
      order by l.created_at desc)
      from game.listings l where l.seller_id = p_player), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_kind', item_kind, 'item_id', item_id,
      'qty', qty, 'price_cents', price_cents, 'value_cents', private.card_or_product_value(item_id)) order by created_at desc)
      from game.buy_orders where buyer_id = p_player), '[]'::jsonb),
    'parcels', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_id', item_id, 'qty', qty,
      'total_cents', total_cents, 'payout_cents', total_cents - fee_cents, 'arrives_at', arrives_at,
      'incoming', buyer_id is not distinct from p_player) order by arrives_at)
      from game.shipments where buyer_id = p_player or seller_id = p_player), '[]'::jsonb),
    'slots', private.market_slots(p_player),
    'used', (select count(*) from game.listings where seller_id = p_player) + (select count(*) from game.buy_orders where buyer_id = p_player)
  )
$$;

create or replace function private.cardmarket_item_doc(p_player uuid, p_item text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'item_id', p_item,
    'kind', case when exists (select 1 from game.product_defs where id = p_item) then 'sealed' else 'card' end,
    'value_cents', private.card_or_product_value(p_item),
    'listings', coalesce((select jsonb_agg(x order by (x ->> 'price_cents')::bigint, (x ->> 'id')::bigint) from (
      select jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'qty', l.qty, 'price_cents', l.price_cents,
        'seller', private.trader_doc(l.seller_id, l.npc_id), 'mine', l.seller_id is not distinct from p_player,
        'slab', private.slab_of(l.copy_id), 'value_cents', private.listing_value(l)) as x
      from game.listings l where l.item_id = p_item order by l.price_cents, l.id limit 30) q), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(x order by (x ->> 'price_cents')::bigint desc, (x ->> 'id')::bigint) from (
      select jsonb_build_object('id', o.id, 'qty', o.qty, 'price_cents', o.price_cents,
        'buyer', private.trader_doc(o.buyer_id, o.npc_id), 'mine', o.buyer_id is not distinct from p_player) as x
      from game.buy_orders o where o.item_id = p_item order by o.price_cents desc, o.id limit 30) q), '[]'::jsonb),
    'sales', coalesce((select jsonb_agg(jsonb_build_object('qty', qty, 'price_cents', price_cents, 'at', at, 'slab', slab) order by at desc)
      from (select * from game.sales_log where item_id = p_item order by at desc limit 10) s), '[]'::jsonb),
    'owned', jsonb_build_object(
      'qty', coalesce((select qty from game.card_stacks where player_id = p_player and card_id = p_item), 0)
           + coalesce((select qty from game.sealed where player_id = p_player and product_id = p_item), 0),
      'copies', coalesce((select jsonb_agg(id order by pulled_at) from game.card_copies
                          where owner_id = p_player and card_id = p_item and location = 'inventory' and grader is null), '[]'::jsonb),
      'slabs', coalesce((select jsonb_agg(jsonb_build_object('copy_id', c.id, 'slab', private.slab_doc(c),
                          'value_cents', private.slab_value(c.card_id, c.grader, c.grade, c.black_label)) order by c.grade desc, c.graded_at)
                         from game.card_copies c
                         where c.owner_id = p_player and c.card_id = p_item and c.location = 'inventory' and c.grader is not null), '[]'::jsonb)
    )
  )
$$;

create or replace function public.seller_get(p_seller text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_id uuid;
begin
  if p_seller ~ '^[0-9a-f-]{36}$' then
    v_id := p_seller::uuid;
    if not exists (select 1 from game.players where id = v_id) then
      perform private.fail('not_found');
    end if;
  end if;
  return jsonb_build_object(
    'seller', private.trader_doc(v_id, case when v_id is null then p_seller end),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'item_id', l.item_id,
      'qty', l.qty, 'price_cents', l.price_cents, 'value_cents', private.listing_value(l), 'slab', private.slab_of(l.copy_id))
      order by l.created_at desc)
      from game.listings l
      where (v_id is not null and l.seller_id = v_id) or (v_id is null and l.npc_id = p_seller)), '[]'::jsonb)
  );
end $$;

-- Kleinanzeigen: NPCs answer a slab ad by its slab value; the Echt-oder-Fake buff marks fake ads.
create or replace function private.ad_npc_offer(a game.ads) returns void
language plpgsql set search_path = '' as $$
declare
  v_value bigint := case when a.item_kind = 'copy' then private.copy_value(a.copy_id)
                         else private.card_or_product_value(a.item_id) * a.qty end;
  v_r numeric := private.rand();
  v_npc game.npcs;
  v_kind text;
  v_price bigint;
begin
  if v_r < 0.5 then
    select * into v_npc from game.npcs where archetype = 'lowballer' order by private.rand() limit 1;
    v_kind := 'lowball';
    v_price := round(v_value * private.rand_between(0.4, 0.6));
  elsif v_r < 0.85 then
    select * into v_npc from game.npcs where archetype = 'collector' order by private.rand() limit 1;
    v_kind := 'fair';
    v_price := round(v_value * private.rand_between(0.8, 1));
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
      'suspicious', a.risk = 'fake' and private.stat(p_player, 'fake_sense', 0) > 0,
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

-- ---------------------------------------------------------------------------------------------
-- Minijobs: a good round of a job with a buff (Echt oder Fake?, Grading-Praktikum) grants it for a while
-- ---------------------------------------------------------------------------------------------
create or replace function public.minigame_finish(p_request_id uuid, p_run uuid, p_score bigint, p_bottles int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'minigame_finish');
  r game.minigame_runs;
  c jsonb;
  v_elapsed numeric;
  v_cap bigint;
  v_score bigint;
  v_payout bigint;
  v_ep jsonb;
  v_bons int := 0;
  v_buff boolean := false;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into r from game.minigame_runs where id = p_run and player_id = v_player and finished_at is null for update;
  if not found then
    perform private.fail('invalid_request');
  end if;
  c := private.cfg('minigame.' || r.game);
  v_cap := (c ->> 'cap_base_cents')::bigint;
  v_elapsed := extract(epoch from private.now() - r.started_at);
  if v_elapsed < (c ->> 'duration_s')::numeric - 3 then
    perform private.fail('too_early');
  end if;
  -- Implausible or late results pay nothing (the energy is gone anyway).
  v_score := case
    when p_score is null or p_score < 0 or p_score > v_cap then 0
    when v_elapsed > (c ->> 'duration_s')::numeric + 300 then 0
    else p_score
  end;
  v_payout := private.eur(v_score * (1 + private.stat(v_player, 'wage_pct', 0) / 100));
  update game.minigame_runs set finished_at = private.now(), score = v_score, payout_cents = v_payout where id = r.id;
  if v_payout > 0 then
    perform private.money_add(v_player, v_payout, 'minigame', r.game);
  end if;
  if v_score >= (c ->> 'pfandbon_at_base_cents')::bigint then
    v_bons := 1;
    update game.players set pfandbons = pfandbons + 1 where id = v_player;
  end if;
  if c ? 'buff' and v_score >= (c -> 'buff' ->> 'at_base_cents')::bigint then
    v_buff := true;
    insert into game.modifiers (player_id, source, stat, op, value, expires_at)
    values (v_player, 'buff:mj_' || r.game, c -> 'buff' ->> 'stat', c -> 'buff' ->> 'op', (c -> 'buff' ->> 'value')::numeric,
            private.now() + make_interval(mins => (c -> 'buff' ->> 'minutes')::int))
    on conflict (player_id, source, stat) do update set op = excluded.op, value = excluded.value, expires_at = excluded.expires_at;
  end if;
  v_ep := private.ep_grant(v_player, private.cfg_num('ep.minigame_min')
    + (private.cfg_num('ep.minigame_max') - private.cfg_num('ep.minigame_min')) * v_score / v_cap);
  perform private.emit(v_player, 'minigame_round');
  if r.game = 'pfand' and v_score > 0 then
    perform private.emit(v_player, 'bottles', least(greatest(coalesce(p_bottles, 0), 0), 100));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'score', v_score, 'payout_cents', v_payout, 'ep_gained', (v_ep ->> 'ep_gained')::bigint,
    'pfandbons', v_bons, 'buff', v_buff, 'player', private.me(v_player)));
end $$;
