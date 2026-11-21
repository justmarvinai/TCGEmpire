-- Core: schemas, server row, players, ledger, config, plumbing helpers.
-- Layout: `public` holds only RPC functions, `game` holds state, `private` holds internal functions.

create schema if not exists game;
create schema if not exists private;
revoke all on schema game from public;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------------------------
-- Server-wide state (single row)
-- ---------------------------------------------------------------------------------------------
create table game.server (
  id boolean primary key default true check (id),
  invite_code_hash text,
  price_level numeric(12, 4) not null default 1 check (price_level >= 1),
  price_level_day date,
  clock_offset interval not null default '0'
);
insert into game.server default values;
alter table game.server enable row level security;

-- Injectable clock: tests and the simulation move `clock_offset`.
create function private.now() returns timestamptz
language sql stable set search_path = '' as $$
  select pg_catalog.now() + (select clock_offset from game.server where id)
$$;

create function private.today() returns date
language sql stable set search_path = '' as $$
  select (private.now() at time zone 'Europe/Berlin')::date
$$;

-- Stable error codes: the message is the code, the client maps it to German text.
create function private.fail(p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using message = p_code, errcode = 'P0001';
end $$;

-- Every RPC is exposed explicitly: nobody but signed-in users may execute it.
create function private.expose(p_fn regprocedure) returns void
language plpgsql set search_path = '' as $$
begin
  execute format('revoke all on function %s from public, anon', p_fn);
  execute format('grant execute on function %s to authenticated', p_fn);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Config (generated from content/config.ts) and live admin overrides
-- ---------------------------------------------------------------------------------------------
create table game.config (
  key text primary key,
  value jsonb not null
);
create table game.config_overrides (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null
);
alter table game.config enable row level security;
alter table game.config_overrides enable row level security;

create function private.cfg(p_key text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb;
begin
  select coalesce(o.value, c.value) into v
  from (select p_key as key) k
  left join game.config c on c.key = k.key
  left join game.config_overrides o on o.key = k.key;
  if v is null then
    raise exception 'missing config key %', p_key;
  end if;
  return v;
end $$;

create function private.cfg_num(p_key text) returns numeric
language sql stable set search_path = '' as $$
  select (private.cfg(p_key) #>> '{}')::numeric
$$;

-- Basis-€ -> real cents at the current Preisniveau. The only way a config amount becomes money.
create function private.eur(p_base_cents numeric) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, round(p_base_cents * (select price_level from game.server where id)))::bigint
$$;

-- ---------------------------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------------------------
create table game.players (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text generated always as (lower(username)) stored,
  cash_cents bigint not null default 0 check (cash_cents between 0 and 9000000000000000),
  level int not null default 1 check (level between 1 and 100),
  ep bigint not null default 0 check (ep >= 0),
  skill_points int not null default 0 check (skill_points >= 0),
  ruf int not null default 500 check (ruf between 0 and 1000),
  pfandbons int not null default 0 check (pfandbons >= 0),
  energy int not null default 100 check (energy >= 0),
  energy_at timestamptz not null,
  prestige int not null default 0 check (prestige >= 0),
  stars int not null default 0 check (stars >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique (username_key)
);
alter table game.players enable row level security;

create function private.require_player() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform private.fail('not_authenticated');
  end if;
  if not exists (select 1 from game.players where id = v_uid) then
    perform private.fail('no_player');
  end if;
  return v_uid;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Ledger: every money change, with a reason code
-- ---------------------------------------------------------------------------------------------
create table game.ledger (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  delta_cents bigint not null,
  balance_after bigint not null,
  reason text not null,
  ref text,
  at timestamptz not null
);
create index ledger_player_at on game.ledger (player_id, at desc);
create index ledger_at on game.ledger (at);

-- Permanent daily totals per reason (kept when ledger rows are pruned and when players leave).
create table game.ledger_daily (
  day date not null,
  player_id uuid not null,
  reason text not null,
  sum_cents bigint not null,
  n int not null,
  primary key (day, player_id, reason)
);
alter table game.ledger enable row level security;
alter table game.ledger_daily enable row level security;

-- The only way cash changes. Negative deltas fail with insufficient_funds instead of going below zero.
create function private.money_add(p_player uuid, p_delta bigint, p_reason text, p_ref text default null)
returns bigint
language plpgsql set search_path = '' as $$
declare
  v_balance bigint;
  v_now timestamptz := private.now();
begin
  update game.players
  set cash_cents = least(9000000000000000, cash_cents + p_delta)
  where id = p_player and cash_cents + p_delta >= 0
  returning cash_cents into v_balance;

  if not found then
    if exists (select 1 from game.players where id = p_player) then
      perform private.fail('insufficient_funds');
    end if;
    perform private.fail('no_player');
  end if;

  insert into game.ledger (player_id, delta_cents, balance_after, reason, ref, at)
  values (p_player, p_delta, v_balance, p_reason, p_ref, v_now);

  insert into game.ledger_daily (day, player_id, reason, sum_cents, n)
  values (private.today(), p_player, p_reason, p_delta, 1)
  on conflict (day, player_id, reason)
  do update set sum_cents = game.ledger_daily.sum_cents + excluded.sum_cents, n = game.ledger_daily.n + 1;

  return v_balance;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Idempotency and rate limits
-- ---------------------------------------------------------------------------------------------
create table game.requests (
  player_id uuid not null references game.players (id) on delete cascade,
  request_id uuid not null,
  action text not null,
  result jsonb,
  at timestamptz not null,
  primary key (player_id, request_id)
);
create index requests_at on game.requests (at);
alter table game.requests enable row level security;

-- Returns the stored answer if this request already ran, otherwise null (and reserves the id).
create function private.request_begin(p_player uuid, p_request_id uuid, p_action text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_row game.requests;
begin
  if p_request_id is null then
    perform private.fail('invalid_request');
  end if;
  insert into game.requests (player_id, request_id, action, at)
  values (p_player, p_request_id, p_action, private.now())
  on conflict (player_id, request_id) do nothing;
  if found then
    return null;
  end if;
  select * into v_row from game.requests where player_id = p_player and request_id = p_request_id;
  if v_row.action <> p_action or v_row.result is null then
    perform private.fail('invalid_request');
  end if;
  return v_row.result;
end $$;

create function private.request_done(p_player uuid, p_request_id uuid, p_result jsonb) returns jsonb
language plpgsql set search_path = '' as $$
begin
  update game.requests set result = p_result where player_id = p_player and request_id = p_request_id;
  return p_result;
end $$;

create table game.rate_limits (
  player_id uuid not null references game.players (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  n int not null,
  primary key (player_id, bucket, window_start)
);
create index rate_limits_window on game.rate_limits (window_start);
alter table game.rate_limits enable row level security;

create function private.rate_limit(p_player uuid, p_bucket text, p_max int, p_window_seconds int) returns void
language plpgsql set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from private.now()) / p_window_seconds) * p_window_seconds);
  v_n int;
begin
  insert into game.rate_limits (player_id, bucket, window_start, n)
  values (p_player, p_bucket, v_window, 1)
  on conflict (player_id, bucket, window_start) do update set n = game.rate_limits.n + 1
  returning n into v_n;
  if v_n > p_max then
    perform private.fail('rate_limited');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Modifiers: one format for every bonus (upgrades, skills, perks, buffs, events)
-- ---------------------------------------------------------------------------------------------
create table game.modifiers (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  source text not null,
  stat text not null,
  op text not null check (op in ('flat', 'pct')),
  value numeric not null,
  expires_at timestamptz
);
create index modifiers_player_stat on game.modifiers (player_id, stat);
alter table game.modifiers enable row level security;

-- Effective value of a stat: (base + flat bonuses) x (1 + sum of percent bonuses).
create function private.stat(p_player uuid, p_stat text, p_base numeric default 0) returns numeric
language sql stable set search_path = '' as $$
  select (p_base + coalesce(sum(value) filter (where op = 'flat'), 0))
       * (1 + coalesce(sum(value) filter (where op = 'pct'), 0) / 100)
  from game.modifiers
  where player_id = p_player and stat = p_stat and (expires_at is null or expires_at > private.now())
$$;

-- ---------------------------------------------------------------------------------------------
-- Event bus, notifications, feed
-- ---------------------------------------------------------------------------------------------
create table game.counters (
  player_id uuid not null references game.players (id) on delete cascade,
  event text not null,
  total numeric not null default 0,
  primary key (player_id, event)
);
alter table game.counters enable row level security;

-- Every game action reports here. Quests and achievements hook in later; counters are lifetime stats.
create function private.emit(p_player uuid, p_event text, p_amount numeric default 1, p_meta jsonb default '{}')
returns void
language plpgsql set search_path = '' as $$
begin
  insert into game.counters (player_id, event, total)
  values (p_player, p_event, p_amount)
  on conflict (player_id, event) do update set total = game.counters.total + excluded.total;
end $$;

create table game.notifications (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  at timestamptz not null
);
create index notifications_player on game.notifications (player_id, id);
alter table game.notifications enable row level security;

create function private.notify(p_player uuid, p_kind text, p_data jsonb default '{}') returns void
language sql set search_path = '' as $$
  insert into game.notifications (player_id, kind, data, at) values (p_player, p_kind, p_data, private.now())
$$;

-- Server-wide feed. Text is rendered on the client from kind + data.
create table game.feed (
  id bigint generated always as identity primary key,
  kind text not null,
  data jsonb not null default '{}',
  at timestamptz not null
);
alter table game.feed enable row level security;

create function private.feed_add(p_kind text, p_data jsonb default '{}') returns void
language sql set search_path = '' as $$
  insert into game.feed (kind, data, at) values (p_kind, p_data, private.now())
$$;

-- ---------------------------------------------------------------------------------------------
-- EP and levels
-- ---------------------------------------------------------------------------------------------
create function private.ep_to_next(p_level int) returns bigint
language sql stable set search_path = '' as $$
  select round(
    (private.cfg_num('ep.base') + private.cfg_num('ep.factor') * power(p_level::numeric, private.cfg_num('ep.exponent')))
    * power(private.cfg_num('ep.growth'), p_level)
  )::bigint
$$;

-- Grants EP given in "level-1 units": scaled by the level's EP scale, the player's EP bonus and the
-- catch-up bonus. Handles level-ups (one skill point each).
create function private.ep_grant(p_player uuid, p_base_ep numeric) returns jsonb
language plpgsql set search_path = '' as $$
declare
  r game.players;
  v_median numeric;
  v_mult numeric;
  v_gain bigint;
  v_need bigint;
  v_levels int := 0;
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
    perform private.notify(p_player, 'level_up', jsonb_build_object('level', r.level));
    perform private.emit(p_player, 'level_up');
  end loop;

  update game.players set ep = r.ep, level = r.level, skill_points = r.skill_points where id = p_player;

  return jsonb_build_object('ep_gained', v_gain, 'levels_gained', v_levels, 'level', r.level, 'ep', r.ep);
end $$;
