// pnpm tsx sim/size.ts [days]: the server alone for some days (10 players online, a tick every 5 minutes, vacuum every
// hour like autovacuum) to measure tick duration and how fast the world's tables grow. PGlite runs in WebAssembly,
// so the times are an upper bound for Supabase. Per-player growth comes from `pnpm sim` (it prints its database size).
import { createTestDb } from '../supabase/tests/harness.ts'

const days = Number(process.argv[2] ?? 3)
const t = await createTestDb()
await t.sql(`update game.config_overrides set value = 'true', updated_at = now() where key = 'events.enabled'`)
for (let i = 0; i < 10; i++) {
  const me = await t.player(`Spieler${i}`)
  await t.rpc(me, 'sync', {})
}
const size = async () => Number((await t.sql<{ v: string }>(`select pg_database_size(current_database()) as v`))[0]!.v)
const start = await size()
const times: number[] = []
for (let i = 0; i < (days * 24 * 60) / 5; i++) {
  await t.advance('5 minutes')
  if (i % 12 === 0) {
    await t.sql(`update game.players set last_seen_at = private.now()`) // they keep coming back
    await t.db.exec('vacuum') // PGlite has no autovacuum; Supabase reuses dead rows the same way
  }
  const s = performance.now()
  await t.tick()
  times.push(performance.now() - s)
}
await t.db.exec('vacuum analyze')
const end = await size()
times.sort((a, b) => a - b)
const avg = times.reduce((s, x) => s + x, 0) / times.length
console.log(`${days} days, ${times.length} ticks: tick avg ${avg.toFixed(0)} ms, p95 ${times[Math.floor(times.length * 0.95)]!.toFixed(0)} ms, max ${times.at(-1)!.toFixed(0)} ms`)
console.log(`database ${(start / 1048576).toFixed(1)} MB → ${(end / 1048576).toFixed(1)} MB (${((end - start) / days / 1048576).toFixed(2)} MB per day)`)
for (const r of await t.sql<{ name: string; mb: string; rows: string }>(
  `select c.relname as name, round(pg_total_relation_size(c.oid) / 1048576.0, 2) as mb, c.reltuples::bigint as rows
   from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'game' and c.relkind = 'r'
   order by pg_total_relation_size(c.oid) desc limit 10`,
))
  console.log(`  ${r.name.padEnd(22)} ${String(r.mb).padStart(7)} MB  ${r.rows} rows`)
console.log(
  'slowest systems (avg ms per run): ' +
    (await t.sql<{ name: string; ms: string }>(`select name, round(avg(ms)) as ms from game.job_runs group by name order by avg(ms) desc limit 6`))
      .map((r) => `${r.name} ${r.ms}`)
      .join(', '),
)
const failed = await t.sql<{ e: string }>(`select distinct name || ': ' || error as e from game.job_runs where not ok`)
if (failed.length) console.log(`failed jobs: ${failed.map((f) => f.e).join('; ')}`)
const [h] = await t.sql<{ items: string; rows: string; bytes: string }>(
  `select (select count(*) from game.prices) as items, (select count(*) from game.price_history) as rows,
          pg_total_relation_size('game.price_history') as bytes`,
)
console.log(`price history: ${h!.items} items, ${h!.rows} rows, ${(Number(h!.bytes) / Number(h!.rows)).toFixed(0)} bytes per row incl. index`)
