-- One tick dispatcher. Each system has its own interval and runs isolated: a failing system is
-- logged and skipped, it never blocks the others.

create table game.tick_systems (
  name text primary key,
  every_seconds int not null check (every_seconds > 0),
  last_run_at timestamptz,
  enabled boolean not null default true
);
create table game.job_runs (
  id bigint generated always as identity primary key,
  name text not null,
  started_at timestamptz not null,
  ms int not null,
  ok boolean not null,
  error text
);
create index job_runs_started on game.job_runs (started_at);
alter table game.tick_systems enable row level security;
alter table game.job_runs enable row level security;

create function private.tick() returns jsonb
language plpgsql set search_path = '' as $$
declare
  s game.tick_systems;
  v_now timestamptz := private.now();
  v_start timestamptz;
  v_ran int := 0;
  v_failed int := 0;
begin
  if not pg_try_advisory_xact_lock(7741001) then
    return jsonb_build_object('skipped', true);
  end if;

  for s in
    select * from game.tick_systems
    where enabled and (last_run_at is null or last_run_at + make_interval(secs => every_seconds) <= v_now)
    order by name
  loop
    v_start := clock_timestamp();
    begin
      execute format('select private.%I()', 'tick_' || s.name);
      insert into game.job_runs (name, started_at, ms, ok)
      values (s.name, v_now, (extract(epoch from clock_timestamp() - v_start) * 1000)::int, true);
    exception when others then
      v_failed := v_failed + 1;
      insert into game.job_runs (name, started_at, ms, ok, error)
      values (s.name, v_now, (extract(epoch from clock_timestamp() - v_start) * 1000)::int, false, sqlerrm);
    end;
    update game.tick_systems set last_run_at = v_now where name = s.name;
    v_ran := v_ran + 1;
  end loop;

  return jsonb_build_object('ran', v_ran, 'failed', v_failed);
end $$;

-- Daily reset at 00:00 Europe/Berlin. Idempotent per day. Currently: the Preisniveau.
-- P = min(cap, rate ^ max(0, median career level - free levels)); never falls; limited step per day.
create function private.tick_daily() returns void
language plpgsql set search_path = '' as $$
declare
  v_today date := private.today();
  v_srv game.server;
  v_median numeric;
  v_target numeric;
  v_new numeric;
begin
  select * into v_srv from game.server where id for update;
  if v_srv.price_level_day is not null and v_srv.price_level_day >= v_today then
    return;
  end if;

  select percentile_cont(0.5) within group (order by level + 100 * prestige) into v_median
  from game.players
  where last_seen_at > private.now() - interval '72 hours';

  v_target := least(
    private.cfg_num('price.cap'),
    power(private.cfg_num('price.rate'), greatest(0, coalesce(v_median, 0) - private.cfg_num('price.free_levels')))
  );
  v_new := round(greatest(
    v_srv.price_level,
    least(v_target, v_srv.price_level * (1 + private.cfg_num('price.max_daily_step_pct') / 100))
  ), 4);

  update game.server set price_level = v_new, price_level_day = v_today where id;

  if v_new > v_srv.price_level then
    perform private.feed_add('inflation', jsonb_build_object('from', v_srv.price_level, 'to', v_new));
  end if;
end $$;

-- Retention (docs/DATA_MODEL.md §5).
create function private.tick_cleanup() returns void
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
end $$;

insert into game.tick_systems (name, every_seconds) values ('daily', 60), ('cleanup', 3600);

-- Supabase: run the tick every minute. Elsewhere (tests, local mode) the tick is driven by the caller.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('tcgempire-tick', '* * * * *', 'select private.tick()');
exception when others then
  raise notice 'pg_cron not available, the tick must be driven externally (%).', sqlerrm;
end $$;
