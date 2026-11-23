-- alpha_12 database size report: the request journal (replay answers for idempotent writes) was the biggest table in
-- the simulation, about 4 MB a day for a very active player. Retries come within seconds, so one day is plenty.
create or replace function private.tick_cleanup() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
begin
  delete from game.requests where at < v_now - interval '1 day';
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
