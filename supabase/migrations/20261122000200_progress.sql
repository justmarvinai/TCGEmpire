-- alpha_02: level rewards, mini-quests, tutorial, energy, the Pfandflaschen minijob, Level-Pfad.

alter table game.players
  add column tutorial_step int not null default 0, -- -1 = finished or skipped
  add column quests_claimed int not null default 0;

-- Reference income per hour at a level, in Basis-€ cents (docs/ECONOMY.md §3).
create function private.ref_income_base(p_level int) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('income.ref_base_cents') * power(private.cfg_num('income.ref_growth'), p_level)
$$;

-- Money for reaching a level, in Basis-€ cents.
create function private.level_reward_base(p_level int) returns numeric
language sql stable set search_path = '' as $$
  select private.ref_income_base(p_level) * private.cfg_num('level.reward_minutes') / 60
$$;

-- ---------------------------------------------------------------------------------------------
-- Energy: lazy, from a timestamp
-- ---------------------------------------------------------------------------------------------
create function private.energy_now(r game.players) returns int
language sql stable set search_path = '' as $$
  select least(
    private.cfg_num('energy.max')::int,
    r.energy + floor(extract(epoch from private.now() - r.energy_at) / private.cfg_num('energy.regen_seconds'))::int
  )
$$;

-- Spends energy; keeps the progress towards the next point.
create function private.energy_spend(p_player uuid, p_cost int) returns void
language plpgsql set search_path = '' as $$
declare
  r game.players;
  v_regen numeric := private.cfg_num('energy.regen_seconds');
  v_max int := private.cfg_num('energy.max')::int;
  v_ticks int;
  v_now int;
begin
  select * into r from game.players where id = p_player for update;
  v_ticks := floor(extract(epoch from private.now() - r.energy_at) / v_regen)::int;
  v_now := least(v_max, r.energy + v_ticks);
  if v_now < p_cost then
    perform private.fail('not_enough_energy');
  end if;
  update game.players
  set energy = v_now - p_cost,
      energy_at = case when r.energy + v_ticks >= v_max then private.now()
                       else r.energy_at + make_interval(secs => v_ticks * v_regen) end
  where id = p_player;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Levels: rewards on level-up (replaces the alpha_01 version)
-- ---------------------------------------------------------------------------------------------
create or replace function private.ep_grant(p_player uuid, p_base_ep numeric) returns jsonb
language plpgsql set search_path = '' as $$
declare
  r game.players;
  v_median numeric;
  v_mult numeric;
  v_gain bigint;
  v_need bigint;
  v_levels int := 0;
  v_reward bigint;
  v_booster boolean;
begin
  select * into r from game.players where id = p_player for update;
  if not found then
    perform private.fail('no_player');
  end if;

  select percentile_cont(0.5) within group (order by level + 100 * prestige) into v_median
  from game.players
  where last_seen_at > private.now() - interval '72 hours';

  v_mult := private.stat(p_player, 'ep', 1);
  if v_median is not null and (r.level + 100 * r.prestige) + private.cfg_num('ep.catchup_levels') < v_median then
    v_mult := v_mult * (1 + private.cfg_num('ep.catchup_pct') / 100);
  end if;

  v_gain := round(p_base_ep * power(private.cfg_num('ep.growth'), r.level) * v_mult)::bigint;
  r.ep := r.ep + v_gain;

  while r.level < 100 loop
    v_need := private.ep_to_next(r.level);
    exit when r.ep < v_need;
    r.ep := r.ep - v_need;
    r.level := r.level + 1;
    r.skill_points := r.skill_points + 1;
    v_levels := v_levels + 1;

    v_reward := private.eur(private.level_reward_base(r.level));
    perform private.money_add(p_player, v_reward, 'level_reward', r.level::text);
    v_booster := r.level % private.cfg_num('level.booster_every')::int = 0;
    if v_booster then
      perform private.sealed_add(p_player, private.cfg('level.reward_product') #>> '{}', 1);
    end if;
    perform private.notify(p_player, 'level_up',
      jsonb_build_object('level', r.level, 'reward_cents', v_reward, 'booster', v_booster));
    perform private.emit(p_player, 'level_up');
  end loop;

  update game.players set ep = r.ep, level = r.level, skill_points = r.skill_points where id = p_player;
  return jsonb_build_object('ep_gained', v_gain, 'levels_gained', v_levels, 'level', r.level, 'ep', r.ep);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Mini-quests
-- ---------------------------------------------------------------------------------------------
create table game.quest_templates (
  key text primary key,
  event text not null,
  min_target int not null check (min_target > 0),
  max_target int not null check (max_target >= min_target)
);

create table game.quests (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  template text not null references game.quest_templates (key),
  event text not null,
  target int not null,
  progress int not null default 0,
  reward_cents bigint not null,
  reward_ep int not null,
  reward_pfandbons int not null,
  created_at timestamptz not null,
  claimed_at timestamptz
);
create index quests_open on game.quests (player_id) where claimed_at is null;
create index quests_template on game.quests (template);
create index quests_claimed on game.quests (claimed_at) where claimed_at is not null;

alter table game.quest_templates enable row level security;
alter table game.quests enable row level security;

-- Tops up the player's open mini-quests with random templates that are not active yet.
create function private.quests_fill(p_player uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_open int;
  v_level int;
  t game.quest_templates;
begin
  select count(*) into v_open from game.quests where player_id = p_player and claimed_at is null;
  select level into v_level from game.players where id = p_player;
  for t in
    select * from game.quest_templates
    where key not in (select template from game.quests where player_id = p_player and claimed_at is null)
    order by private.rand()
    limit greatest(0, private.cfg_num('quest.mini_slots')::int - v_open)
  loop
    insert into game.quests (player_id, template, event, target, reward_cents, reward_ep, reward_pfandbons, created_at)
    values (
      p_player, t.key, t.event,
      t.min_target + floor(private.rand() * (t.max_target - t.min_target + 1))::int,
      private.eur(private.ref_income_base(v_level) * private.cfg_num('quest.mini_reward_minutes') / 60),
      private.cfg_num('ep.quest')::int,
      private.cfg_num('quest.mini_pfandbons')::int,
      private.now()
    );
  end loop;
end $$;

create function private.on_player_created() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.quests_fill(new.id);
  return new;
end $$;
create trigger players_created after insert on game.players
  for each row execute function private.on_player_created();

create function private.quests_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'mini', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'template', template, 'target', target, 'progress', progress,
        'reward_cents', reward_cents, 'reward_ep', reward_ep, 'reward_pfandbons', reward_pfandbons
      ) order by id), '[]'::jsonb)
      from game.quests where player_id = p_player and claimed_at is null
    ),
    'claimed_total', (select quests_claimed from game.players where id = p_player),
    'bonus_every', private.cfg_num('quest.bonus_every')
  )
$$;

create function public.quests_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  perform private.quests_fill(v_player);
  return private.quests_doc(v_player);
end $$;
select private.expose('public.quests_get()');

create function public.quest_claim(p_request_id uuid, p_quest bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'quest_claim');
  q game.quests;
  v_claimed int;
  v_bonus boolean;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into q from game.quests where id = p_quest and player_id = v_player and claimed_at is null for update;
  if not found or q.progress < q.target then
    perform private.fail('quest_not_ready');
  end if;
  update game.quests set claimed_at = private.now() where id = q.id;
  update game.players set quests_claimed = quests_claimed + 1, pfandbons = pfandbons + q.reward_pfandbons
  where id = v_player
  returning quests_claimed into v_claimed;
  perform private.money_add(v_player, q.reward_cents, 'quest');
  perform private.ep_grant(v_player, q.reward_ep);
  v_bonus := v_claimed % private.cfg_num('quest.bonus_every')::int = 0;
  if v_bonus then
    perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}', 1);
  end if;
  perform private.emit(v_player, 'quest_claimed');
  perform private.quests_fill(v_player);
  return private.request_done(v_player, p_request_id,
    private.quests_doc(v_player) || jsonb_build_object('bonus_booster', v_bonus, 'player', private.me(v_player)));
end $$;
select private.expose('public.quest_claim(uuid, bigint)');

-- ---------------------------------------------------------------------------------------------
-- Tutorial: each step completes when its event is emitted
-- ---------------------------------------------------------------------------------------------
create table game.tutorial_steps (
  step int primary key,
  event text not null,
  reward_booster int not null default 0,
  reward_base_cents bigint not null default 0,
  reward_ep int not null default 0
);
alter table game.tutorial_steps enable row level security;

create function private.tutorial_check(p_player uuid, p_event text) returns void
language plpgsql set search_path = '' as $$
declare
  v_step int;
  s game.tutorial_steps;
begin
  select tutorial_step into v_step from game.players where id = p_player;
  if v_step is null or v_step < 0 then
    return;
  end if;
  select * into s from game.tutorial_steps where step = v_step;
  if not found or s.event <> p_event then
    return;
  end if;
  update game.players
  set tutorial_step = case when exists (select 1 from game.tutorial_steps where step = v_step + 1) then v_step + 1 else -1 end
  where id = p_player;
  if s.reward_booster > 0 then
    perform private.sealed_add(p_player, private.cfg('level.reward_product') #>> '{}', s.reward_booster);
  end if;
  if s.reward_base_cents > 0 then
    perform private.money_add(p_player, private.eur(s.reward_base_cents), 'tutorial');
  end if;
  if s.reward_ep > 0 then
    perform private.ep_grant(p_player, s.reward_ep);
  end if;
end $$;

-- Event bus (replaces the alpha_01 version): counters, quest progress, tutorial.
create or replace function private.emit(p_player uuid, p_event text, p_amount numeric default 1, p_meta jsonb default '{}')
returns void
language plpgsql set search_path = '' as $$
begin
  insert into game.counters (player_id, event, total)
  values (p_player, p_event, p_amount)
  on conflict (player_id, event) do update set total = game.counters.total + excluded.total;

  update game.quests set progress = least(target, progress + ceil(p_amount)::int)
  where player_id = p_player and event = p_event and claimed_at is null and progress < target;

  perform private.tutorial_check(p_player, p_event);
end $$;

create function public.tutorial_ack(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'tutorial_ack');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.emit(v_player, 'tutorial_ack');
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.tutorial_ack(uuid)');

create function public.tutorial_skip(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'tutorial_skip');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  update game.players set tutorial_step = -1 where id = v_player and tutorial_step >= 3;
  if not found then
    perform private.fail('tutorial_not_skippable');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.tutorial_skip(uuid)');

-- ---------------------------------------------------------------------------------------------
-- Minijob: Pfandflaschen sammeln. The client plays; the server checks time and caps the score.
-- ---------------------------------------------------------------------------------------------
create table game.minigame_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references game.players (id) on delete cascade,
  game text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  score bigint,
  payout_cents bigint
);
create index minigame_runs_player on game.minigame_runs (player_id, started_at desc);
alter table game.minigame_runs enable row level security;

create function public.minigame_start(p_request_id uuid, p_game text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'minigame_start');
  c jsonb;
  v_run uuid;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'minigame', private.cfg_num('rate.minigame')::int, 60);
  if p_game is distinct from 'pfand' then
    perform private.fail('invalid_request');
  end if;
  c := private.cfg('minigame.pfand');
  perform private.energy_spend(v_player, (c ->> 'energy')::int);
  insert into game.minigame_runs (player_id, game, started_at) values (v_player, p_game, private.now())
  returning id into v_run;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'run_id', v_run, 'duration_s', (c ->> 'duration_s')::int, 'player', private.me(v_player)));
end $$;
select private.expose('public.minigame_start(uuid, text)');

create function public.minigame_finish(p_request_id uuid, p_run uuid, p_score bigint, p_bottles int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'minigame_finish');
  c jsonb := private.cfg('minigame.pfand');
  r game.minigame_runs;
  v_elapsed numeric;
  v_cap bigint := (c ->> 'cap_base_cents')::bigint;
  v_score bigint;
  v_payout bigint;
  v_ep jsonb;
  v_bons int := 0;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into r from game.minigame_runs where id = p_run and player_id = v_player and finished_at is null for update;
  if not found then
    perform private.fail('invalid_request');
  end if;
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
  v_payout := private.eur(v_score);
  update game.minigame_runs set finished_at = private.now(), score = v_score, payout_cents = v_payout where id = r.id;
  if v_payout > 0 then
    perform private.money_add(v_player, v_payout, 'minigame', 'pfand');
  end if;
  if v_score >= (c ->> 'pfandbon_at_base_cents')::bigint then
    v_bons := 1;
    update game.players set pfandbons = pfandbons + 1 where id = v_player;
  end if;
  v_ep := private.ep_grant(v_player, private.cfg_num('ep.minigame_min')
    + (private.cfg_num('ep.minigame_max') - private.cfg_num('ep.minigame_min')) * v_score / v_cap);
  perform private.emit(v_player, 'minigame_round');
  if v_score > 0 then
    perform private.emit(v_player, 'bottles', least(greatest(coalesce(p_bottles, 0), 0), 100));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'score', v_score, 'payout_cents', v_payout, 'ep_gained', (v_ep ->> 'ep_gained')::bigint,
    'pfandbons', v_bons, 'player', private.me(v_player)));
end $$;
select private.expose('public.minigame_finish(uuid, uuid, bigint, int)');

-- ---------------------------------------------------------------------------------------------
-- Level-Pfad: what every level costs and brings
-- ---------------------------------------------------------------------------------------------
create function public.level_path_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_player();
  return jsonb_build_object('levels', (
    select jsonb_agg(jsonb_build_object(
      'level', n,
      'ep', private.ep_to_next(n - 1),
      'reward_cents', private.eur(private.level_reward_base(n)),
      'booster', n % private.cfg_num('level.booster_every')::int = 0
    ) order by n)
    from generate_series(2, 100) n
  ));
end $$;
select private.expose('public.level_path_get()');

-- ---------------------------------------------------------------------------------------------
-- Player document (replaces the alpha_01 version)
-- ---------------------------------------------------------------------------------------------
create or replace function private.player_doc(r game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'cash_cents', r.cash_cents,
    'level', r.level,
    'ep', r.ep,
    'ep_to_next', case when r.level < 100 then private.ep_to_next(r.level) end,
    'skill_points', r.skill_points,
    'ruf', r.ruf,
    'pfandbons', r.pfandbons,
    'energy', private.energy_now(r),
    'energy_max', private.cfg_num('energy.max'),
    'energy_at', r.energy_at,
    'energy_regen_s', private.cfg_num('energy.regen_seconds'),
    'prestige', r.prestige,
    'stars', r.stars,
    'is_admin', r.is_admin,
    'tutorial_step', r.tutorial_step,
    'sealed_total', (select coalesce(sum(qty), 0) from game.sealed where player_id = r.id),
    'net_worth_cents', r.cash_cents
      + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = r.id)
      + (select coalesce(sum(private.card_value(card_id)), 0) from game.card_copies where owner_id = r.id),
    'quests_ready', (select count(*) from game.quests where player_id = r.id and claimed_at is null and progress >= target),
    'created_at', r.created_at
  )
$$;
