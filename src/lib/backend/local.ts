// Local mode: the complete server (same SQL as production) runs in the browser inside PGlite.
// Used for development and end-to-end tests when no Supabase project is configured.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import type { Backend } from './types.ts'
import { localRpc } from './localRpc.ts'

const shim = import.meta.glob('/supabase/shim/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const migrations = import.meta.glob('/supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const seeds = import.meta.glob('/supabase/seed/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const sorted = (files: Record<string, string>) =>
  Object.keys(files)
    .sort()
    .map((k) => files[k]!)

function hash(text: string) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export async function createLocalBackend(): Promise<Backend> {
  // A schema change gets a fresh database; the previous one is dropped.
  const schema = [...sorted(shim), ...sorted(migrations)].join('\n')
  const name = `tcgempire-${hash(schema)}`
  const previous = localStorage.getItem('tcge.local.db')
  if (previous && previous !== name) indexedDB.deleteDatabase(`/pglite/${previous}`)
  localStorage.setItem('tcge.local.db', name)

  const db = await PGlite.create(`idb://${name}`, { extensions: { pgcrypto } })
  const fresh = (await db.query(`select 1 from pg_namespace where nspname = 'game'`)).rows.length === 0
  if (fresh) await db.exec(schema)
  for (const sql of sorted(seeds)) await db.exec(sql)
  await db.exec(
    `insert into game.config_overrides (key, value, updated_at) values ('auth.bcrypt_cost', '6', now())
     on conflict (key) do nothing`,
  )

  // This browser's anonymous "auth user".
  let uid = localStorage.getItem('tcge.local.uid')
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem('tcge.local.uid', uid)
  }

  // No pg_cron here: drive the tick ourselves.
  const tick = () => db.query('select private.tick()').catch(() => undefined)
  void tick()
  setInterval(tick, 60_000)

  // PGlite writes to IndexedDB lazily; flush after every call so a reload never loses state.
  const flushed = async <T>(work: Promise<T>) => {
    try {
      return await work
    } finally {
      await db.syncToFs()
    }
  }

  return {
    mode: 'local',
    rpc: (fn, args) => flushed(localRpc(db, uid, fn, args)),
    // Without parameters several statements may run at once (exec); with parameters only one (query).
    devSql: (query, params) =>
      flushed(params?.length ? db.query(query, params).then((r) => r.rows) : db.exec(query).then((r) => r.at(-1)?.rows ?? [])),
  }
}
