-- alpha_03: daily/weekly quests and rerolls, Stempelkarte, Geldbunker, upgrades, shifts and more minijobs,
-- snacks and the Pfandautomat, achievements and titles, recap, account reset and deletion.

create function private.week_start() returns date
language sql stable set search_path = '' as $$
  select date_trunc('week', private.today())::date
$$;

-- EP worth a share of the current level, in level-1 units (ep_grant scales them back up).
-- Quests, stamps and achievements pay like this, so they stay proportional at every level.
create function private.ep_share(p_level int, p_share numeric) returns numeric
language sql stable set search_path = '' as $$
  select p_share * (private.cfg_num('ep.base') + private.cfg_num('ep.factor') * power(p_level::numeric, private.cfg_num('ep.exponent')))
$$;

-- Server-side feature gate (levels from content/unlocks.ts, config `unlock.<feature>`).
create function private.require_level(p_player uuid, p_feature text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if (select level from game.players where id = p_player) < private.cfg_num('unlock.' || p_feature) then
    perform private.fail('locked');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
alter table game.players
  add column title text,
  add column reroll_day date,
  add column daily_bonus_day date,
  add column weekly_bonus_week date,
  add column reset_at timestamptz;

alter table game.quest_templates
  add column kind text not null default 'mini' check (kind in ('mini', 'daily', 'weekly')),
  add column min_level int not null default 1;
alter table game.quests
  add column kind text not null default 'mini' check (kind in ('mini', 'daily', 'weekly')),
  add column period date;
create index quests_period on game.quests (player_id, kind, period);

create table game.stamps (
  player_id uuid primary key references game.players (id) on delete cascade,
  week date not null,
  days int not null default 0 check (days between 0 and 7),
  last_day date,
  joker_used boolean not null default false
);

create table game.upgrade_defs (
  key text primary key,
  grp text not null,
  max_level int not null,
  cost_base_cents bigint not null,
  growth numeric not null,
  min_level int not null,
  level_step numeric not null,
  stat text,
  op text check (op in ('flat', 'pct')),
  per_level numeric
);
create table game.upgrades_owned (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null references game.upgrade_defs (key),
  level int not null check (level >= 0),
  primary key (player_id, key)
);
create index upgrades_owned_key on game.upgrades_owned (key);
create unique index modifiers_source on game.modifiers (player_id, source, stat);

create table game.bunker (
  player_id uuid primary key references game.players (id) on delete cascade,
  accrual_at timestamptz not null
);

create table game.job_defs (
  key text primary key,
  min_level int not null,
  wage numeric not null,
  minigame text,
  shifts boolean not null
);
create table game.job_hours (
  player_id uuid not null references game.players (id) on delete cascade,
  job text not null references game.job_defs (key),
  hours numeric not null default 0,
  primary key (player_id, job)
);
create index job_hours_job on game.job_hours (job);
create table game.shifts (
  player_id uuid primary key references game.players (id) on delete cascade,
  job text not null references game.job_defs (key),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  checkins int not null default 0,
  last_checkin_at timestamptz
);
create index shifts_job on game.shifts (job);

create table game.consumable_defs (
  key text primary key,
  price_base_cents bigint,
  pfandbons int,
  energy int not null default 0,
  booster int not null default 0,
  buff_stat text,
  buff_op text,
  buff_value numeric,
  buff_minutes int
);

create table game.achievement_defs (
  key text primary key,
  event text not null,
  tiers jsonb not null,
  titles jsonb not null default '[]'
);
create index achievement_defs_event on game.achievement_defs (event);
create table game.achievements (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null references game.achievement_defs (key),
  tier int not null,
  at timestamptz not null,
  primary key (player_id, key)
);
create index achievements_key on game.achievements (key);

alter table game.stamps enable row level security;
alter table game.upgrade_defs enable row level security;
alter table game.upgrades_owned enable row level security;
alter table game.bunker enable row level security;
alter table game.job_defs enable row level security;
alter table game.job_hours enable row level security;
alter table game.shifts enable row level security;
alter table game.consumable_defs enable row level security;
alter table game.achievement_defs enable row level security;
alter table game.achievements enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Upgrades and energy
-- ---------------------------------------------------------------------------------------------
create function private.upgrade_level(p_player uuid, p_key text) returns int
language sql stable set search_path = '' as $$
  select coalesce((select level from game.upgrades_owned where player_id = p_player and key = p_key), 0)
$$;

create function private.energy_max(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (private.cfg_num('energy.max') + private.stat(p_player, 'energy_max', 0))::int
$$;

create function private.energy_regen_s(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('energy.regen_seconds') / (1 + private.stat(p_player, 'energy_regen_pct', 0) / 100)
$$;

create or replace function private.energy_now(r game.players) returns int
language sql stable set search_path = '' as $$
  select least(
    private.energy_max(r.id),
    r.energy + floor(extract(epoch from private.now() - r.energy_at) / private.energy_regen_s(r.id))::int
  )
$$;

-- Adds (or with a negative delta spends) energy; keeps the progress towards the next regenerated point.
create function private.energy_change(p_player uuid, p_delta int) returns void
language plpgsql set search_path = '' as $$
declare
  r game.players;
  v_regen numeric := private.energy_regen_s(p_player);
  v_max int := private.energy_max(p_player);
  v_ticks int;
  v_now int;
begin
  select * into r from game.players where id = p_player for update;
  v_ticks := floor(extract(epoch from private.now() - r.energy_at) / v_regen)::int;
  v_now := least(v_max, r.energy + v_ticks);
  if v_now + p_delta < 0 then
    perform private.fail('not_enough_energy');
  end if;
  update game.players
  set energy = least(v_max, v_now + p_delta),
      energy_at = case when r.energy + v_ticks >= v_max or v_now + p_delta >= v_max then private.now()
                       else r.energy_at + make_interval(secs => v_ticks * v_regen) end
  where id = p_player;
end $$;

create or replace function private.energy_spend(p_player uuid, p_cost int) returns void
language sql set search_path = '' as $$
  select private.energy_change(p_player, -p_cost)
$$;

-- Value an upgrade gives at a level (for "jetzt -> danach"); the bunker yield has its own formula.
create function private.upgrade_value(p_key text, p_level int) returns numeric
language sql stable set search_path = '' as $$
  select case when d.key = 'bunker_ertrag'
    then private.eur(private.cfg_num('bunker.base_rate_base_cents') * power(private.cfg_num('bunker.rate_growth'), p_level))
    else coalesce(d.per_level, 0) * p_level end
  from game.upgrade_defs d where d.key = p_key
$$;

create function private.upgrade_cost(p_key text, p_level int) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(least(9000000000000000, d.cost_base_cents * power(d.growth, p_level)))
  from game.upgrade_defs d where d.key = p_key
$$;

create function private.upgrades_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.upgrades'),
    'upgrades', coalesce(jsonb_agg(jsonb_build_object(
      'key', d.key,
      'group', d.grp,
      'level', coalesce(o.level, 0),
      'max', d.max_level,
      'cost_cents', case when coalesce(o.level, 0) < d.max_level then private.upgrade_cost(d.key, coalesce(o.level, 0)) end,
      'need_level', d.min_level + floor(coalesce(o.level, 0) * d.level_step)::int,
      'now', private.upgrade_value(d.key, coalesce(o.level, 0)),
      'next', case when coalesce(o.level, 0) < d.max_level then private.upgrade_value(d.key, coalesce(o.level, 0) + 1) end
    ) order by d.min_level, d.key), '[]'::jsonb)
  )
  from game.upgrade_defs d
  left join game.upgrades_owned o on o.player_id = p_player and o.key = d.key
$$;

-- ---------------------------------------------------------------------------------------------
-- Geldbunker: lazy, from a timestamp; full means no more income
-- ---------------------------------------------------------------------------------------------
create function private.bunker_rate_base(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('bunker.base_rate_base_cents')
    * power(private.cfg_num('bunker.rate_growth'), private.upgrade_level(p_player, 'bunker_ertrag'))
$$;

create function private.bunker_capacity_h(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('bunker.base_capacity_h') + private.stat(p_player, 'bunker_capacity_h', 0)
$$;

-- Basis-€ cents in the bunker right now (null when the player has no bunker yet).
create function private.bunker_content_base(p_player uuid) returns numeric
language sql stable set search_path = '' as $$
  select private.bunker_rate_base(p_player)
    * least(extract(epoch from private.now() - b.accrual_at) / 3600, private.bunker_capacity_h(p_player))
  from game.bunker b where b.player_id = p_player
$$;

create function private.bunker_ensure(p_player uuid) returns void
language sql set search_path = '' as $$
  insert into game.bunker (player_id, accrual_at)
  select p_player, private.now()
  where (select level from game.players where id = p_player) >= private.cfg_num('unlock.bunker')
  on conflict do nothing
$$;

create function private.bunker_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select case when b.player_id is null then jsonb_build_object('unlocked', false, 'unlock_level', private.cfg_num('unlock.bunker'))
  else jsonb_build_object(
    'unlocked', true,
    'unlock_level', private.cfg_num('unlock.bunker'),
    'rate_cents', private.eur(private.bunker_rate_base(p_player)),
    'capacity_h', private.bunker_capacity_h(p_player),
    'content_cents', private.eur(private.bunker_content_base(p_player)),
    'accrual_at', b.accrual_at,
    'interest_pct', private.stat(p_player, 'bunker_interest_pct', 0),
    'interest_fill', private.cfg_num('bunker.interest_fill'),
    'security', private.stat(p_player, 'def_bunker', 0),
    'stage', (
      select count(*) - 1 from jsonb_array_elements_text(private.cfg('bunker.stages')) t
      where t::numeric <= (
        select coalesce(sum(u.level), 0) from game.upgrades_owned u join game.upgrade_defs d on d.key = u.key
        where u.player_id = p_player and d.grp = 'bunker'
      )
    )
  ) end
  from (select p_player as id) x
  left join game.bunker b on b.player_id = x.id
$$;

-- Pays out what is in the bunker. With interest (and EP, counters) when the player collects on purpose.
create function private.bunker_payout(p_player uuid, p_collect boolean) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_content numeric;
  v_cap numeric;
  v_total bigint;
  v_interest bigint := 0;
begin
  perform private.bunker_ensure(p_player);
  perform 1 from game.bunker where player_id = p_player for update;
  v_content := coalesce(private.bunker_content_base(p_player), 0);
  v_total := private.eur(v_content);
  if v_total < 1 then
    return jsonb_build_object('collected_cents', 0, 'interest_cents', 0);
  end if;
  v_cap := private.bunker_rate_base(p_player) * private.bunker_capacity_h(p_player);
  if p_collect and v_content >= v_cap * private.cfg_num('bunker.interest_fill') then
    v_interest := round(v_total * private.stat(p_player, 'bunker_interest_pct', 0) / 100);
  end if;
  update game.bunker set accrual_at = private.now() where player_id = p_player;
  perform private.money_add(p_player, v_total + v_interest, 'bunker');
  if p_collect then
    perform private.ep_grant(p_player, private.cfg_num('ep.bunker'));
    perform private.emit(p_player, 'bunker_collected');
  end if;
  return jsonb_build_object('collected_cents', v_total, 'interest_cents', v_interest);
end $$;

create function public.bunker_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  perform private.bunker_ensure(v_player);
  return private.bunker_doc(v_player);
end $$;
select private.expose('public.bunker_get()');

create function public.bunker_collect(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'bunker_collect');
  v_res jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'bunker');
  v_res := private.bunker_payout(v_player, true);
  if (v_res ->> 'collected_cents')::bigint < 1 then
    perform private.fail('bunker_empty');
  end if;
  return private.request_done(v_player, p_request_id,
    v_res || jsonb_build_object('bunker', private.bunker_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.bunker_collect(uuid)');

create function public.upgrades_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.upgrades_doc(private.require_player());
end $$;
select private.expose('public.upgrades_get()');

create function public.upgrade_buy(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'upgrade_buy');
  d game.upgrade_defs;
  v_level int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'upgrade', 60, 60);
  perform private.require_level(v_player, 'upgrades');
  select * into d from game.upgrade_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  v_level := private.upgrade_level(v_player, p_key);
  if v_level >= d.max_level then
    perform private.fail('upgrade_max');
  end if;
  if (select level from game.players where id = v_player) < d.min_level + floor(v_level * d.level_step) then
    perform private.fail('locked');
  end if;
  -- Rebuilding the bunker empties it first, so a new rate or capacity never applies retroactively.
  if d.grp = 'bunker' then
    perform private.bunker_payout(v_player, false);
  end if;
  perform private.money_add(v_player, -private.upgrade_cost(p_key, v_level), 'upgrade', p_key);
  insert into game.upgrades_owned (player_id, key, level) values (v_player, p_key, 1)
  on conflict (player_id, key) do update set level = game.upgrades_owned.level + 1;
  if d.stat is not null then
    insert into game.modifiers (player_id, source, stat, op, value)
    values (v_player, 'upgrade:' || p_key, d.stat, d.op, d.per_level * (v_level + 1))
    on conflict (player_id, source, stat) do update set op = excluded.op, value = excluded.value;
  end if;
  perform private.emit(v_player, 'upgrade_bought');
  return private.request_done(v_player, p_request_id, private.upgrades_doc(v_player)
    || jsonb_build_object('bunker', private.bunker_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.upgrade_buy(uuid, text)');

-- ---------------------------------------------------------------------------------------------
-- Quests: mini (endless), daily (00:00), weekly (Monday); Stempelkarte
-- ---------------------------------------------------------------------------------------------
create function private.quests_fill_kind(p_player uuid, p_kind text, p_period date, p_slots int, p_level int,
  p_exclude text default null) returns void
language plpgsql set search_path = '' as $$
declare
  v_have int;
  t game.quest_templates;
begin
  select count(*) into v_have from game.quests
  where player_id = p_player and kind = p_kind
    and case when p_kind = 'mini' then claimed_at is null else period = p_period end;
  for t in
    select * from game.quest_templates
    where kind = p_kind and min_level <= p_level and key is distinct from p_exclude
      and key not in (
        select template from game.quests where player_id = p_player and kind = p_kind
          and case when p_kind = 'mini' then claimed_at is null else period = p_period end
      )
    order by private.rand()
    limit greatest(0, p_slots - v_have)
  loop
    insert into game.quests (player_id, template, event, target, reward_cents, reward_ep, reward_pfandbons, created_at, kind, period)
    values (
      p_player, t.key, t.event,
      t.min_target + floor(private.rand() * (t.max_target - t.min_target + 1))::int,
      private.eur(private.ref_income_base(p_level) * private.cfg_num('quest.' || p_kind || '_reward_minutes') / 60),
      round(private.ep_share(p_level, private.cfg_num('quest.' || p_kind || '_ep_share')))::int,
      private.cfg_num('quest.' || p_kind || '_pfandbons')::int,
      private.now(), p_kind, p_period
    );
  end loop;
end $$;

create or replace function private.quests_fill(p_player uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_level int;
  v_today date := private.today();
  v_week date := private.week_start();
begin
  select level into v_level from game.players where id = p_player;
  delete from game.quests where player_id = p_player and claimed_at is null
    and ((kind = 'daily' and period < v_today) or (kind = 'weekly' and period < v_week));
  perform private.quests_fill_kind(p_player, 'mini', null, private.cfg_num('quest.mini_slots')::int, v_level);
  if v_level >= private.cfg_num('unlock.daily_quests') then
    perform private.quests_fill_kind(p_player, 'daily', v_today, private.cfg_num('quest.daily_slots')::int, v_level);
  end if;
  if v_level >= private.cfg_num('unlock.weekly_quests') then
    perform private.quests_fill_kind(p_player, 'weekly', v_week, private.cfg_num('quest.weekly_slots')::int, v_level);
  end if;
end $$;

create function private.quest_list(p_player uuid, p_kind text, p_period date) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'template', template, 'target', target, 'progress', progress,
    'reward_cents', reward_cents, 'reward_ep', reward_ep, 'reward_pfandbons', reward_pfandbons,
    'claimed', claimed_at is not null
  ) order by id), '[]'::jsonb)
  from game.quests
  where player_id = p_player and kind = p_kind
    and case when p_kind = 'mini' then claimed_at is null else period = p_period end
$$;

create function private.stamps_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlocked', p.level >= private.cfg_num('unlock.stamps'),
    'unlock_level', private.cfg_num('unlock.stamps'),
    'days', case when s.week = private.week_start() then s.days else 0 end,
    'today_done', coalesce(s.week = private.week_start() and s.last_day = private.today(), false),
    'joker_available', coalesce(
      s.week = private.week_start() and s.last_day = private.today() and not s.joker_used
        and s.days < (private.today() - private.week_start() + 1) and s.days < 7,
      false),
    'rewards', (
      select jsonb_agg(private.eur(private.ref_income_base(p.level) * m::numeric / 60) order by i)
      from jsonb_array_elements_text(private.cfg('stamp.minutes')) with ordinality as x(m, i)
    )
  )
  from game.players p
  left join game.stamps s on s.player_id = p.id
  where p.id = p_player
$$;

create or replace function private.quests_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'mini', private.quest_list(p_player, 'mini', null),
    'daily', private.quest_list(p_player, 'daily', private.today()),
    'weekly', private.quest_list(p_player, 'weekly', private.week_start()),
    'claimed_total', p.quests_claimed,
    'bonus_every', private.cfg_num('quest.bonus_every'),
    'reroll_free', p.reroll_day is distinct from private.today(),
    'daily_bonus_cents', private.eur(private.ref_income_base(p.level) * private.cfg_num('quest.daily_bonus_minutes') / 60),
    'daily_bonus_done', coalesce(p.daily_bonus_day = private.today(), false),
    'weekly_chest_boosters', private.cfg_num('quest.weekly_chest_boosters'),
    'weekly_bonus_done', coalesce(p.weekly_bonus_week = private.week_start(), false),
    'unlock_daily', private.cfg_num('unlock.daily_quests'),
    'unlock_weekly', private.cfg_num('unlock.weekly_quests'),
    'stamps', private.stamps_doc(p_player)
  )
  from game.players p where p.id = p_player
$$;

create or replace function public.quest_claim(p_request_id uuid, p_quest bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'quest_claim');
  q game.quests;
  v_level int;
  v_claimed int;
  v_bonus boolean := false;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into q from game.quests where id = p_quest and player_id = v_player and claimed_at is null for update;
  if not found or q.progress < q.target then
    perform private.fail('quest_not_ready');
  end if;
  if (q.kind = 'daily' and q.period <> private.today()) or (q.kind = 'weekly' and q.period <> private.week_start()) then
    perform private.fail('quest_expired');
  end if;
  update game.quests set claimed_at = private.now() where id = q.id;
  update game.players
  set quests_claimed = quests_claimed + case when q.kind = 'mini' then 1 else 0 end,
      pfandbons = pfandbons + q.reward_pfandbons
  where id = v_player
  returning quests_claimed, level into v_claimed, v_level;
  perform private.money_add(v_player, q.reward_cents, 'quest');
  perform private.ep_grant(v_player, q.reward_ep);

  -- every n-th mini-quest: a bonus booster
  if q.kind = 'mini' and v_claimed % private.cfg_num('quest.bonus_every')::int = 0 then
    v_bonus := true;
    perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}', 1);
  end if;
  -- all dailies of the day / all weeklies of the week done: bonus
  if q.kind in ('daily', 'weekly')
     and not exists (select 1 from game.quests where player_id = v_player and kind = q.kind and period = q.period and claimed_at is null)
     and (select count(*) from game.quests where player_id = v_player and kind = q.kind and period = q.period)
         >= private.cfg_num('quest.' || q.kind || '_slots') then
    if q.kind = 'daily' and (select daily_bonus_day from game.players where id = v_player) is distinct from q.period then
      update game.players set daily_bonus_day = q.period where id = v_player;
      perform private.money_add(v_player,
        private.eur(private.ref_income_base(v_level) * private.cfg_num('quest.daily_bonus_minutes') / 60), 'quest_bonus');
      perform private.ep_grant(v_player, private.ep_share(v_level, private.cfg_num('quest.daily_bonus_ep_share')));
      perform private.notify(v_player, 'daily_bonus');
    elsif q.kind = 'weekly' and (select weekly_bonus_week from game.players where id = v_player) is distinct from q.period then
      update game.players set weekly_bonus_week = q.period where id = v_player;
      perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}',
        private.cfg_num('quest.weekly_chest_boosters')::int);
      perform private.notify(v_player, 'weekly_chest');
    end if;
  end if;
  perform private.emit(v_player, 'quest_claimed');
  perform private.quests_fill(v_player);
  return private.request_done(v_player, p_request_id,
    private.quests_doc(v_player) || jsonb_build_object('bonus_booster', v_bonus, 'player', private.me(v_player)));
end $$;

-- One free reroll of a daily quest per day.
create function public.quest_reroll(p_request_id uuid, p_quest bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'quest_reroll');
  q game.quests;
  v_level int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into q from game.quests
  where id = p_quest and player_id = v_player and kind = 'daily' and period = private.today() and claimed_at is null
  for update;
  if not found then
    perform private.fail('invalid_request');
  end if;
  select level into v_level from game.players where id = v_player for update;
  if (select reroll_day from game.players where id = v_player) = private.today() then
    perform private.fail('reroll_used');
  end if;
  delete from game.quests where id = q.id;
  update game.players set reroll_day = private.today() where id = v_player;
  perform private.quests_fill_kind(v_player, 'daily', private.today(), private.cfg_num('quest.daily_slots')::int, v_level, q.template);
  return private.request_done(v_player, p_request_id,
    private.quests_doc(v_player) || jsonb_build_object('bonus_booster', false, 'player', private.me(v_player)));
end $$;
select private.expose('public.quest_reroll(uuid, bigint)');

-- Stempelkarte: one stamp per day, the joker catches up one missed day per week.
create function public.stamp_claim(p_request_id uuid, p_joker boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'stamp_claim');
  v_week date := private.week_start();
  v_today date := private.today();
  s game.stamps;
  v_n int;
  v_level int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'stamps');
  insert into game.stamps (player_id, week) values (v_player, v_week) on conflict do nothing;
  select * into s from game.stamps where player_id = v_player for update;
  if s.week <> v_week then
    update game.stamps set week = v_week, days = 0, last_day = null, joker_used = false where player_id = v_player
    returning * into s;
  end if;
  if coalesce(p_joker, false) then
    if s.last_day is distinct from v_today or s.joker_used or s.days >= (v_today - v_week + 1) or s.days >= 7 then
      perform private.fail('stamp_unavailable');
    end if;
    update game.stamps set days = days + 1, joker_used = true where player_id = v_player returning days into v_n;
  else
    if s.last_day = v_today then
      perform private.fail('stamp_done');
    end if;
    update game.stamps set days = days + 1, last_day = v_today where player_id = v_player returning days into v_n;
  end if;
  select level into v_level from game.players where id = v_player;
  perform private.money_add(v_player,
    private.eur(private.ref_income_base(v_level) * (private.cfg('stamp.minutes') ->> (v_n - 1))::numeric / 60), 'stamp');
  perform private.ep_grant(v_player, private.ep_share(v_level, private.cfg_num('stamp.ep_share')));
  if v_n = 7 then
    perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}', 1);
  end if;
  perform private.emit(v_player, 'stamp_claimed');
  return private.request_done(v_player, p_request_id,
    private.quests_doc(v_player) || jsonb_build_object('bonus_booster', false, 'player', private.me(v_player)));
end $$;
select private.expose('public.stamp_claim(uuid, boolean)');

-- ---------------------------------------------------------------------------------------------
-- Jobs: shifts (idle) and minijobs (active)
-- ---------------------------------------------------------------------------------------------
create function private.rank_of(p_hours numeric) returns int
language sql stable set search_path = '' as $$
  select (count(*) - 1)::int from jsonb_array_elements_text(private.cfg('shift.rank_hours')) h where h::numeric <= p_hours
$$;

-- Shift wage per hour in Basis-€ cents.
create function private.shift_wage_base(p_player uuid, p_job text) returns numeric
language sql stable set search_path = '' as $$
  select private.ref_income_base(p.level) * private.cfg_num('shift.wage_share') * j.wage
    * (private.cfg('shift.rank_bonus') ->> private.rank_of(coalesce(h.hours, 0)))::numeric
    * (1 + private.stat(p_player, 'wage_pct', 0) / 100)
  from game.players p
  join game.job_defs j on j.key = p_job
  left join game.job_hours h on h.player_id = p.id and h.job = p_job
  where p.id = p_player
$$;

create function private.jobs_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_shifts', private.cfg_num('unlock.shifts'),
    'checkin_bonus_pct', private.cfg_num('shift.checkin_bonus_pct'),
    'jobs', (
      select jsonb_agg(jsonb_build_object(
        'key', j.key,
        'min_level', j.min_level,
        'minigame', j.minigame,
        'energy', case when j.minigame is not null then (private.cfg('minigame.' || j.minigame) ->> 'energy')::int end,
        'shifts', j.shifts,
        'hours', coalesce(h.hours, 0),
        'rank', private.rank_of(coalesce(h.hours, 0)),
        'wage_cents', case when j.shifts then private.eur(private.shift_wage_base(p_player, j.key)) end
      ) order by j.min_level)
      from game.job_defs j
      left join game.job_hours h on h.player_id = p_player and h.job = j.key
    ),
    'shift', (
      select jsonb_build_object(
        'job', s.job,
        'started_at', s.started_at,
        'ends_at', s.ends_at,
        'checkins', s.checkins,
        'checkin_max', private.cfg_num('shift.checkin_max'),
        'next_checkin_at', coalesce(s.last_checkin_at, s.started_at) + make_interval(mins => private.cfg_num('shift.checkin_minutes')::int),
        'done', private.now() >= s.ends_at,
        'wage_cents', round(private.eur(private.shift_wage_base(p_player, s.job) * extract(epoch from s.ends_at - s.started_at) / 3600)
          * (1 + s.checkins * private.cfg_num('shift.checkin_bonus_pct') / 100))
      )
      from game.shifts s where s.player_id = p_player
    )
  )
$$;

-- Ends the running shift: full pay with check-in bonus when it is over, pro rata without bonus when
-- stopped early.
create function private.shift_finish(p_player uuid, p_require_done boolean) returns jsonb
language plpgsql set search_path = '' as $$
declare
  s game.shifts;
  v_done boolean;
  v_hours numeric;
  v_wage bigint;
begin
  select * into s from game.shifts where player_id = p_player for update;
  if not found then
    return null;
  end if;
  v_done := private.now() >= s.ends_at;
  if p_require_done and not v_done then
    return null;
  end if;
  v_hours := extract(epoch from least(private.now(), s.ends_at) - s.started_at) / 3600;
  v_wage := round(private.eur(private.shift_wage_base(p_player, s.job) * v_hours)
    * (1 + case when v_done then s.checkins * private.cfg_num('shift.checkin_bonus_pct') / 100 else 0 end));
  delete from game.shifts where player_id = p_player;
  insert into game.job_hours (player_id, job, hours) values (p_player, s.job, v_hours)
  on conflict (player_id, job) do update set hours = game.job_hours.hours + excluded.hours;
  if v_wage > 0 then
    perform private.money_add(p_player, v_wage, 'shift', s.job);
  end if;
  perform private.ep_grant(p_player, private.cfg_num('ep.shift_hour') * v_hours);
  perform private.emit(p_player, 'shift_hours', round(v_hours, 2));
  if v_done then
    perform private.emit(p_player, 'shift_done');
  end if;
  return jsonb_build_object('job', s.job, 'hours', round(v_hours, 2), 'wage_cents', v_wage, 'done', v_done);
end $$;

create function public.jobs_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.jobs_doc(private.require_player());
end $$;
select private.expose('public.jobs_get()');

create function public.shift_start(p_request_id uuid, p_job text, p_hours numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'shift_start');
  j game.job_defs;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'shifts');
  select * into j from game.job_defs where key = p_job and shifts;
  if not found or p_hours is null or p_hours not in (0.25, 1, 4, 8) then
    perform private.fail('invalid_request');
  end if;
  if (select level from game.players where id = v_player) < j.min_level then
    perform private.fail('locked');
  end if;
  if exists (select 1 from game.shifts where player_id = v_player) then
    perform private.fail('shift_running');
  end if;
  insert into game.shifts (player_id, job, started_at, ends_at)
  values (v_player, p_job, private.now(), private.now() + make_interval(secs => p_hours * 3600));
  return private.request_done(v_player, p_request_id, private.jobs_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.shift_start(uuid, text, numeric)');

create function public.shift_checkin(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'shift_checkin');
  s game.shifts;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into s from game.shifts where player_id = v_player for update;
  if not found or private.now() >= s.ends_at or s.checkins >= private.cfg_num('shift.checkin_max')
     or private.now() < coalesce(s.last_checkin_at, s.started_at) + make_interval(mins => private.cfg_num('shift.checkin_minutes')::int) then
    perform private.fail('checkin_unavailable');
  end if;
  update game.shifts set checkins = checkins + 1, last_checkin_at = private.now() where player_id = v_player;
  return private.request_done(v_player, p_request_id, private.jobs_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.shift_checkin(uuid)');

create function public.shift_claim(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'shift_claim');
  v_res jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  v_res := private.shift_finish(v_player, false);
  if v_res is null then
    perform private.fail('no_shift');
  end if;
  return private.request_done(v_player, p_request_id,
    private.jobs_doc(v_player) || jsonb_build_object('result', v_res, 'player', private.me(v_player)));
end $$;
select private.expose('public.shift_claim(uuid)');

-- Minijobs (replace the alpha_02 versions): any game of a job, unlocked by the job's level.
create or replace function public.minigame_start(p_request_id uuid, p_game text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'minigame_start');
  j game.job_defs;
  c jsonb;
  v_run uuid;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'minigame', private.cfg_num('rate.minigame')::int, 60);
  select * into j from game.job_defs where minigame = p_game;
  if not found then
    perform private.fail('invalid_request');
  end if;
  if (select level from game.players where id = v_player) < j.min_level then
    perform private.fail('locked');
  end if;
  c := private.cfg('minigame.' || p_game);
  perform private.energy_spend(v_player, (c ->> 'energy')::int);
  insert into game.minigame_runs (player_id, game, started_at) values (v_player, p_game, private.now())
  returning id into v_run;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'run_id', v_run, 'duration_s', (c ->> 'duration_s')::int, 'player', private.me(v_player)));
end $$;

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
  v_ep := private.ep_grant(v_player, private.cfg_num('ep.minigame_min')
    + (private.cfg_num('ep.minigame_max') - private.cfg_num('ep.minigame_min')) * v_score / v_cap);
  perform private.emit(v_player, 'minigame_round');
  if r.game = 'pfand' and v_score > 0 then
    perform private.emit(v_player, 'bottles', least(greatest(coalesce(p_bottles, 0), 0), 100));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'score', v_score, 'payout_cents', v_payout, 'ep_gained', (v_ep ->> 'ep_gained')::bigint,
    'pfandbons', v_bons, 'player', private.me(v_player)));
end $$;

-- ---------------------------------------------------------------------------------------------
-- Snacks and the Pfandautomat
-- ---------------------------------------------------------------------------------------------
create function public.consumable_use(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'consumable_use');
  d game.consumable_defs;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'consumable', 30, 60);
  select * into d from game.consumable_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if d.price_base_cents is not null then
    perform private.money_add(v_player, -private.eur(d.price_base_cents), 'snack', p_key);
  end if;
  if d.pfandbons is not null then
    update game.players set pfandbons = pfandbons - d.pfandbons where id = v_player and pfandbons >= d.pfandbons;
    if not found then
      perform private.fail('not_enough_pfandbons');
    end if;
  end if;
  if d.energy > 0 then
    perform private.energy_change(v_player, d.energy);
  end if;
  if d.booster > 0 then
    perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}', d.booster);
  end if;
  if d.buff_stat is not null then
    insert into game.modifiers (player_id, source, stat, op, value, expires_at)
    values (v_player, 'buff:' || p_key, d.buff_stat, d.buff_op, d.buff_value, private.now() + make_interval(mins => d.buff_minutes))
    on conflict (player_id, source, stat) do update set op = excluded.op, value = excluded.value, expires_at = excluded.expires_at;
  end if;
  if d.price_base_cents is not null then
    perform private.emit(v_player, 'snack_eaten');
  end if;
  if p_key = 'doener' then
    perform private.emit(v_player, 'doener_eaten');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.consumable_use(uuid, text)');

-- ---------------------------------------------------------------------------------------------
-- Achievements (checked on every event) and titles
-- ---------------------------------------------------------------------------------------------
create function private.achievements_check(p_player uuid, p_event text, p_total numeric) returns void
language plpgsql set search_path = '' as $$
declare
  d game.achievement_defs;
  v_tier int;
  v_old int;
  v_ep jsonb := private.cfg('ep.achievement_share');
  v_level int := (select level from game.players where id = p_player);
  i int;
begin
  for d in select * from game.achievement_defs where event = p_event loop
    select count(*)::int into v_tier from jsonb_array_elements_text(d.tiers) t where t::numeric <= p_total;
    v_old := coalesce((select tier from game.achievements where player_id = p_player and key = d.key), 0);
    continue when v_tier <= v_old;
    insert into game.achievements (player_id, key, tier, at) values (p_player, d.key, v_tier, private.now())
    on conflict (player_id, key) do update set tier = excluded.tier, at = excluded.at;
    for i in v_old + 1 .. v_tier loop
      perform private.notify(p_player, 'achievement', jsonb_build_object('key', d.key, 'tier', i, 'title', d.titles ->> (i - 1)));
      perform private.ep_grant(p_player, private.ep_share(v_level, (v_ep ->> least(i - 1, jsonb_array_length(v_ep) - 1))::numeric));
    end loop;
  end loop;
end $$;

-- Event bus (replaces the alpha_02 version): counters, quest progress, tutorial, achievements.
create or replace function private.emit(p_player uuid, p_event text, p_amount numeric default 1, p_meta jsonb default '{}')
returns void
language plpgsql set search_path = '' as $$
declare
  v_total numeric;
begin
  insert into game.counters (player_id, event, total)
  values (p_player, p_event, p_amount)
  on conflict (player_id, event) do update set total = game.counters.total + excluded.total
  returning total into v_total;

  update game.quests set progress = least(target, progress + round(p_amount)::int)
  where player_id = p_player and event = p_event and claimed_at is null and progress < target;

  perform private.tutorial_check(p_player, p_event);
  perform private.achievements_check(p_player, p_event, v_total);
end $$;

-- 20 packs of a set in a row without Holo: Pechvogel.
create function private.on_pity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.dry = 20 then
    perform private.emit(new.player_id, 'pechvogel');
  end if;
  return new;
end $$;
create trigger pity_streak after insert or update on game.pity
  for each row execute function private.on_pity();

-- Titles unlocked by achievement tiers.
create function private.titles_of(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(t.title order by a.key, t.i), '[]'::jsonb)
  from game.achievements a
  join game.achievement_defs d on d.key = a.key
  cross join lateral (
    select value #>> '{}' as title, i from jsonb_array_elements(d.titles) with ordinality as x(value, i)
  ) t
  where a.player_id = p_player and t.i <= a.tier and t.title is not null
$$;

create function public.stats_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'counters', (select coalesce(jsonb_object_agg(event, total), '{}'::jsonb) from game.counters where player_id = v_player),
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object('key', key, 'tier', tier, 'at', at) order by key), '[]'::jsonb)
      from game.achievements where player_id = v_player
    ),
    'titles', private.titles_of(v_player),
    'title', (select title from game.players where id = v_player)
  );
end $$;
select private.expose('public.stats_get()');

create function public.title_set(p_request_id uuid, p_title text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'title_set');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_title is not null and not private.titles_of(v_player) ? p_title then
    perform private.fail('title_locked');
  end if;
  update game.players set title = p_title where id = v_player;
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.title_set(uuid, text)');

-- ---------------------------------------------------------------------------------------------
-- Cards: Fettfinger and big-pull counters (replaces the alpha_02 version)
-- ---------------------------------------------------------------------------------------------
create or replace function private.give_card(p_player uuid, p_card text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  c game.card_defs;
  v_copy uuid;
  v_new boolean;
  -- greasy fingers from a Döner make the surface of fresh hits worse
  v_grease int := case when private.stat(p_player, 'fettfinger', 0) > 0 then 2 else 0 end;
begin
  select * into c from game.card_defs where id = p_card;
  if c.tier in ('holo', 'alternative', 'ultra', 'grail') then
    insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
    values (p_player, p_card, private.roll_quality(), private.roll_quality(), private.roll_quality(),
            greatest(1, private.roll_quality() - v_grease), private.now())
    returning id into v_copy;
  else
    insert into game.card_stacks (player_id, card_id, qty) values (p_player, p_card, 1)
    on conflict (player_id, card_id) do update set qty = game.card_stacks.qty + 1;
  end if;
  insert into game.collection (player_id, card_id, first_at) values (p_player, p_card, private.now())
  on conflict do nothing;
  v_new := found;
  if c.tier in ('ultra', 'grail') then
    perform private.emit(p_player, 'pulled_' || c.tier);
  end if;
  return jsonb_build_object(
    'card_id', p_card, 'tier', c.tier, 'kind', c.kind,
    'value_cents', private.card_value(p_card), 'new', v_new, 'copy_id', v_copy
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- Levels (replaces the alpha_02 version). Writes the row at every step, so nested EP grants from
-- achievements on `level_up` can never be overwritten.
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
  v_feature text;
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
  update game.players set ep = ep + v_gain where id = p_player returning * into r;

  loop
    exit when r.level >= 100;
    v_need := private.ep_to_next(r.level);
    exit when r.ep < v_need;
    update game.players set ep = ep - v_need, level = level + 1, skill_points = skill_points + 1
    where id = p_player returning * into r;
    v_levels := v_levels + 1;

    v_reward := private.eur(private.level_reward_base(r.level));
    perform private.money_add(p_player, v_reward, 'level_reward', r.level::text);
    v_booster := r.level % private.cfg_num('level.booster_every')::int = 0;
    if v_booster then
      perform private.sealed_add(p_player, private.cfg('level.reward_product') #>> '{}', 1);
    end if;
    perform private.notify(p_player, 'level_up',
      jsonb_build_object('level', r.level, 'reward_cents', v_reward, 'booster', v_booster));
    -- features that open at this level
    for v_feature in
      select substr(key, 8) from game.config where key like 'unlock.%' and (value #>> '{}')::int = r.level
    loop
      perform private.notify(p_player, 'unlock', jsonb_build_object('feature', v_feature));
    end loop;
    perform private.bunker_ensure(p_player);
    perform private.emit(p_player, 'level_up');
    select * into r from game.players where id = p_player;
  end loop;

  return jsonb_build_object('ep_gained', v_gain, 'levels_gained', v_levels, 'level', r.level, 'ep', r.ep);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Session: away time, recap, sync (replace the earlier versions)
-- ---------------------------------------------------------------------------------------------
create or replace function public.me_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r game.players;
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;
  select * into r from game.players where id = private.current_player();
  return jsonb_build_object(
    'player', case when found then private.player_doc(r) end,
    'server', private.server_doc(),
    'away_s', case when found then floor(extract(epoch from private.now() - r.last_seen_at)) else 0 end
  );
end $$;

create or replace function public.sync(p_after_notification bigint default 0, p_after_feed bigint default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  update game.players set last_seen_at = v_now
  where id = v_player and last_seen_at < v_now - interval '60 seconds';
  perform private.quests_fill(v_player);

  return public.me_get() || jsonb_build_object(
    'notifications', (
      select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'data', n.data, 'at', n.at) order by n.id), '[]'::jsonb)
      from (
        select * from game.notifications
        where player_id = v_player and id > p_after_notification
        order by id desc limit 50
      ) n
    ),
    'feed', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'at', f.at) order by f.id), '[]'::jsonb)
      from (
        select * from game.feed where id > p_after_feed order by id desc limit 30
      ) f
    )
  );
end $$;

-- What happened while you were away.
create function public.recap_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  perform private.bunker_ensure(v_player);
  return jsonb_build_object(
    'bunker', private.bunker_doc(v_player),
    'shift', private.jobs_doc(v_player) -> 'shift'
  );
end $$;
select private.expose('public.recap_get()');

create function public.recap_collect(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'recap_collect');
  v_bunker jsonb := '{"collected_cents": 0, "interest_cents": 0}';
  v_shift jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if (select level from game.players where id = v_player) >= private.cfg_num('unlock.bunker') then
    v_bunker := private.bunker_payout(v_player, true);
  end if;
  v_shift := private.shift_finish(v_player, true);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'bunker_cents', (v_bunker ->> 'collected_cents')::bigint + (v_bunker ->> 'interest_cents')::bigint,
    'shift_cents', coalesce((v_shift ->> 'wage_cents')::bigint, 0),
    'player', private.me(v_player)));
end $$;
select private.expose('public.recap_collect(uuid)');

-- ---------------------------------------------------------------------------------------------
-- Gefahrenzone: reset or delete the own account (typed confirmation = username)
-- ---------------------------------------------------------------------------------------------
create function public.account_reset(p_request_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  r game.players;
begin
  select * into r from game.players where id = v_player for update;
  if lower(btrim(coalesce(p_confirm, ''))) <> r.username_key then
    perform private.fail('confirm_wrong');
  end if;
  if r.reset_at is not null and r.reset_at > private.now() - make_interval(hours => private.cfg_num('account.reset_cooldown_h')::int) then
    perform private.fail('reset_cooldown');
  end if;
  -- Everything goes: items are destroyed (they leave supply and collections), nothing is handed over.
  delete from game.card_stacks where player_id = v_player;
  delete from game.card_copies where owner_id = v_player;
  delete from game.sealed where player_id = v_player;
  delete from game.collection where player_id = v_player;
  delete from game.pity where player_id = v_player;
  delete from game.store_purchases where player_id = v_player;
  delete from game.quests where player_id = v_player;
  delete from game.achievements where player_id = v_player;
  delete from game.counters where player_id = v_player;
  delete from game.modifiers where player_id = v_player;
  delete from game.upgrades_owned where player_id = v_player;
  delete from game.bunker where player_id = v_player;
  delete from game.shifts where player_id = v_player;
  delete from game.job_hours where player_id = v_player;
  delete from game.minigame_runs where player_id = v_player;
  delete from game.stamps where player_id = v_player;
  delete from game.notifications where player_id = v_player;
  delete from game.ledger where player_id = v_player;
  update game.players
  set cash_cents = 0, level = 1, ep = 0, skill_points = 0, ruf = 500, pfandbons = 0,
      energy = private.cfg_num('energy.max')::int, energy_at = private.now(), prestige = 0, stars = 0,
      tutorial_step = 0, quests_claimed = 0, title = null, reroll_day = null, daily_bonus_day = null,
      weekly_bonus_week = null, reset_at = private.now()
  where id = v_player;
  perform private.money_add(v_player, private.eur(private.cfg_num('start.cash_base_cents')), 'start_capital');
  perform private.quests_fill(v_player);
  perform private.feed_add('player_reset', jsonb_build_object('name', r.username));
  return public.me_get();
end $$;
select private.expose('public.account_reset(uuid, text)');

create function public.account_delete(p_request_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  r game.players;
begin
  select * into r from game.players where id = v_player for update;
  if lower(btrim(coalesce(p_confirm, ''))) <> r.username_key then
    perform private.fail('confirm_wrong');
  end if;
  delete from game.players where id = v_player; -- cascades to everything the player owns
  update game.feed set data = jsonb_set(data, '{name}', '"Gelöschter Spieler"') where data ->> 'name' = r.username;
  if r.is_admin then
    update game.players set is_admin = true
    where id = (select id from game.players order by created_at limit 1);
  end if;
  return public.me_get();
end $$;
select private.expose('public.account_delete(uuid, text)');

-- ---------------------------------------------------------------------------------------------
-- Retention (replaces the alpha_01 version)
-- ---------------------------------------------------------------------------------------------
create or replace function private.tick_cleanup() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
begin
  delete from game.requests where at < v_now - interval '3 days';
  delete from game.rate_limits where window_start < v_now - interval '1 day';
  delete from game.ledger where at < v_now - interval '14 days';
  delete from game.job_runs where started_at < v_now - interval '7 days';
  delete from game.notifications where at < v_now - interval '30 days';
  delete from game.feed where id <= (select max(id) from game.feed) - 2000;
  delete from game.sessions where last_used_at < v_now - interval '90 days';
  delete from game.quests where claimed_at < v_now - interval '14 days';
  delete from game.modifiers where expires_at < v_now - interval '1 day';
  delete from game.minigame_runs where started_at < v_now - interval '7 days';
end $$;

-- ---------------------------------------------------------------------------------------------
-- Player document (replaces the alpha_02 version): energy from upgrades, title, active buffs
-- ---------------------------------------------------------------------------------------------
create or replace function private.player_doc(r game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'title', r.title,
    'cash_cents', r.cash_cents,
    'level', r.level,
    'ep', r.ep,
    'ep_to_next', case when r.level < 100 then private.ep_to_next(r.level) end,
    'skill_points', r.skill_points,
    'ruf', r.ruf,
    'pfandbons', r.pfandbons,
    'energy', private.energy_now(r),
    'energy_max', private.energy_max(r.id),
    'energy_at', r.energy_at,
    'energy_regen_s', private.energy_regen_s(r.id),
    'prestige', r.prestige,
    'stars', r.stars,
    'is_admin', r.is_admin,
    'tutorial_step', r.tutorial_step,
    'sealed_total', (select coalesce(sum(qty), 0) from game.sealed where player_id = r.id),
    'net_worth_cents', r.cash_cents
      + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = r.id)
      + (select coalesce(sum(private.card_value(card_id)), 0) from game.card_copies where owner_id = r.id),
    'quests_ready', (
      select count(*) from game.quests
      where player_id = r.id and claimed_at is null and progress >= target
        and (kind = 'mini' or (kind = 'daily' and period = private.today()) or (kind = 'weekly' and period = private.week_start()))
    ),
    'buffs', (
      select coalesce(jsonb_agg(jsonb_build_object('key', substr(source, 6), 'expires_at', expires_at) order by expires_at), '[]'::jsonb)
      from game.modifiers
      where player_id = r.id and source like 'buff:%' and expires_at > private.now()
    ),
    'created_at', r.created_at
  )
$$;

-- Shop (replaces the alpha_02 version): also snacks and Pfandautomat items with their current prices.
create or replace function public.shop_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'kiosk', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', pd.id,
        'price_cents', private.kiosk_price(pd.id),
        'bought_today', coalesce((select sum(sp.qty) from game.store_purchases sp
          where sp.player_id = v_player and sp.store = 'kiosk' and sp.product_id = pd.id and sp.day = private.today()), 0),
        'daily_limit', private.cfg_num('kiosk.daily_limit')
      ) order by pd.id), '[]'::jsonb)
      from game.product_defs pd join game.set_defs s on s.id = pd.set_id
      where s.phase in ('print', 'last_wave')
    ),
    'sealed', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) order by product_id), '[]'::jsonb)
      from game.sealed where player_id = v_player and qty > 0
    ),
    'snacks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', key,
        'price_cents', case when price_base_cents is not null then private.eur(price_base_cents) end,
        'pfandbons', pfandbons
      ) order by key), '[]'::jsonb)
      from game.consumable_defs
    )
  );
end $$;
