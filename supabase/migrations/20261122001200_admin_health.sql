-- alpha_12 (Feinschliff): server health for the admin console. Database size against the free plan's limit
-- (warning from 60 %), the largest tables, the money in circulation and how many players are around.
create function public.admin_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
begin
  return jsonb_build_object(
    'db_bytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
    'limit_bytes', (private.cfg_num('platform.db_limit_mb') * 1024 * 1024)::bigint,
    'warn_pct', private.cfg_num('platform.warn_pct')::int,
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.relname, 'bytes', t.bytes, 'rows', t.rows) order by t.bytes desc)
      from (select c.relname, pg_catalog.pg_total_relation_size(c.oid) as bytes, greatest(c.reltuples, 0)::bigint as rows
            from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'game' and c.relkind = 'r'
            order by 2 desc limit 10) t
    ), '[]'::jsonb),
    'cash_cents', (select coalesce(sum(cash_cents), 0) from game.players),
    'players', (select count(*) from game.players),
    'active_24h', (select count(*) from game.players where last_seen_at > private.now() - interval '24 hours'),
    'active_7d', (select count(*) from game.players where last_seen_at > private.now() - interval '7 days'),
    'median_level', (select coalesce(percentile_cont(0.5) within group (order by level), 0) from game.players)
  );
end $$;
select private.expose('public.admin_health()');
