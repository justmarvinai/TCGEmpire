-- alpha_12 balance pass: the admin console also shows each player's pace in the current run (since joining, the last
-- account reset or the last exit), so the playtest can be compared with the target of level 100 in 2–3 weeks.
create or replace function public.admin_health() returns jsonb
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
    'median_level', (select coalesce(percentile_cont(0.5) within group (order by level), 0) from game.players),
    'pace', coalesce((
      select jsonb_agg(jsonb_build_object('username', p.username, 'level', p.level, 'prestige', p.prestige,
        'days', round(extract(epoch from private.now()
          - greatest(p.created_at, p.reset_at, (select max(x.at) from game.prestiges x where x.player_id = p.id))) / 86400, 1),
        'net_worth_cents', private.net_worth(p.id))
        order by p.prestige desc, p.level desc, p.username)
      from game.players p
    ), '[]'::jsonb)
  );
end $$;
