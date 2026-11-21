import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'
import { RPC_SCHEMAS } from '../../src/lib/schemas.ts'

let t: TestDb
beforeAll(async () => {
  t = await createTestDb()
})

describe('join and login', () => {
  it('has no player before joining', async () => {
    const me = await t.rpc(t.browser(), 'me_get')
    expect(me.player).toBeNull()
    expect(me.server.has_invite_code).toBe(false)
  })

  it('rejects calls without an auth user', async () => {
    await expect(t.rpc(null, 'me_get')).rejects.toThrow('not_authenticated')
    await expect(t.rpc(null, 'sync')).rejects.toThrow('not_authenticated')
    await expect(t.rpc(null, 'login', { p_username: 'x', p_password: 'y' })).rejects.toThrow('not_authenticated')
  })

  it('first account sets the invite code, becomes admin and gets the start capital', async () => {
    const b = t.browser()
    const me = await t.rpc(b, 'join', { p_username: 'Erster', p_password: 'passwort1', p_invite_code: 'geheim123' })
    expect(me.player).toMatchObject({ username: 'Erster', is_admin: true, level: 1, cash_cents: 400_00 })
    expect(me.server.has_invite_code).toBe(true)
    await t.assertLedgerMatches()
  })

  it('later accounts need the same code and are not admin', async () => {
    const b = t.browser()
    const args = { p_username: 'Zweiter', p_password: 'passwort1' }
    await expect(t.rpc(b, 'join', { ...args, p_invite_code: 'falsch' })).rejects.toThrow('invite_wrong')
    await expect(t.rpc(b, 'sync')).rejects.toThrow('no_player')
    const me = await t.rpc(b, 'join', { ...args, p_invite_code: 'geheim123' })
    expect(me.player).toMatchObject({ username: 'Zweiter', is_admin: false })
  })

  it('validates username, password and uniqueness (case-insensitive)', async () => {
    const b = t.browser()
    const ok = { p_username: 'Dritter', p_password: 'passwort1', p_invite_code: 'geheim123' }
    await expect(t.rpc(b, 'join', { ...ok, p_username: 'ab' })).rejects.toThrow('username_invalid')
    await expect(t.rpc(b, 'join', { ...ok, p_username: 'böse name' })).rejects.toThrow('username_invalid')
    await expect(t.rpc(b, 'join', { ...ok, p_password: '12345' })).rejects.toThrow('password_invalid')
    await expect(t.rpc(b, 'join', { ...ok, p_username: 'ERSTER' })).rejects.toThrow('username_taken')
  })

  it('signs in from another browser, signs out, and never stores the password in clear', async () => {
    const other = t.browser()
    expect(await t.rpc(other, 'login', { p_username: 'erster', p_password: 'falsch!' })).toEqual({ error: 'login_wrong' })
    expect(await t.rpc(other, 'login', { p_username: 'gibtsnicht', p_password: 'passwort1' })).toEqual({
      error: 'login_wrong',
    })
    const res = await t.rpc(other, 'login', { p_username: 'erster', p_password: 'passwort1' })
    expect(res.error).toBeNull()
    expect((await t.rpc(other, 'me_get')).player?.username).toBe('Erster')

    expect((await t.rpc(other, 'logout')).player).toBeNull()
    await expect(t.rpc(other, 'sync')).rejects.toThrow('no_player')

    const hashes = await t.sql<{ password_hash: string }>(`select password_hash from game.credentials`)
    expect(hashes.every((h) => h.password_hash.startsWith('$2') && !h.password_hash.includes('passwort1'))).toBe(true)
  })

  it('locks an account after too many wrong passwords', async () => {
    await t.player('Opfer')
    const attacker = t.browser()
    for (let i = 0; i < 8; i++) {
      expect(await t.rpc(attacker, 'login', { p_username: 'Opfer', p_password: `falsch${i}` })).toEqual({
        error: 'login_wrong',
      })
    }
    expect(await t.rpc(attacker, 'login', { p_username: 'Opfer', p_password: 'passwort1' })).toEqual({
      error: 'login_locked',
    })
    await t.advance('6 minutes')
    expect((await t.rpc(attacker, 'login', { p_username: 'Opfer', p_password: 'passwort1' })).error).toBeNull()
  })
})

describe('money', () => {
  it('never goes below zero and logs every change', async () => {
    const p = await t.playerId(await t.player('Geldtest'))
    await expect(t.sql(`select private.money_add($1, -500000, 'test')`, [p])).rejects.toThrow('insufficient_funds')
    await t.sql(`select private.money_add($1, -15000, 'test_sink')`, [p])
    await t.sql(`select private.money_add($1, 2500, 'test_source')`, [p])
    const [row] = await t.sql<{ cash_cents: number }>(`select cash_cents from game.players where id = $1`, [p])
    expect(Number(row!.cash_cents)).toBe(400_00 - 150_00 + 25_00)
    await t.assertLedgerMatches()
    const daily = await t.sql<{ reason: string; sum_cents: number }>(
      `select reason, sum_cents from game.ledger_daily where player_id = $1 order by reason`,
      [p],
    )
    expect(daily.map((d) => [d.reason, Number(d.sum_cents)])).toEqual([
      ['start_capital', 400_00],
      ['test_sink', -150_00],
      ['test_source', 25_00],
    ])
  })
})

describe('levels', () => {
  it('matches the documented EP curve', async () => {
    const need = async (n: number) =>
      Number((await t.sql<{ v: number }>(`select private.ep_to_next($1) as v`, [n]))[0]!.v)
    expect(await need(1)).toBe(35)
    expect(await need(10)).toBe(274)
    expect(await need(50)).toBe(7815)
    expect(await need(99)).toBe(101409)
  })

  it('levels up, grants skill points and notifies', async () => {
    const b = await t.player('Levler')
    const [res] = await t.sql<{ r: { levels_gained: number; level: number } }>(
      `select private.ep_grant($1, 200) as r`,
      [await t.playerId(b)],
    )
    expect(res!.r.levels_gained).toBeGreaterThanOrEqual(3)
    const sync = await t.rpc(b, 'sync')
    expect(sync.player?.level).toBe(res!.r.level)
    expect(sync.player?.skill_points).toBe(res!.r.levels_gained)
    expect(sync.notifications.filter((n) => n.kind === 'level_up')).toHaveLength(res!.r.levels_gained)
  })

  it('stops at level 100', async () => {
    const b = await t.player('Maxer')
    const p = await t.playerId(b)
    await t.sql(`update game.players set level = 99 where id = $1`, [p])
    await t.sql(`select private.ep_grant($1, 1000000)`, [p])
    const me = await t.rpc(b, 'me_get')
    expect(me.player?.level).toBe(100)
    expect(me.player?.ep_to_next).toBeNull()
  })

  it('applies EP modifiers', async () => {
    const a = await t.playerId(await t.player('OhneBonus'))
    const b = await t.playerId(await t.player('MitBonus'))
    await t.sql(`insert into game.modifiers (player_id, source, stat, op, value) values ($1, 'test', 'ep', 'pct', 50)`, [b])
    const gain = async (p: string) =>
      (await t.sql<{ r: { ep_gained: number } }>(`select private.ep_grant($1, 1000) as r`, [p]))[0]!.r.ep_gained
    // level 1: 1000 * 1.035 = 1035, with +50 % = 1552.5 -> 1553
    expect(await gain(a)).toBe(1035)
    expect(await gain(b)).toBe(1553)
  })
})

describe('requests', () => {
  it('replays a finished request and rejects misuse', async () => {
    const p = await t.playerId(await t.player('Replay'))
    const id = '11111111-1111-4111-8111-111111111111'
    const begin = async (action: string) =>
      (await t.sql<{ r: unknown }>(`select private.request_begin($1, $2, $3) as r`, [p, id, action]))[0]!.r
    expect(await begin('buy')).toBeNull()
    await t.sql(`select private.request_done($1, $2, '{"ok":true}'::jsonb)`, [p, id])
    expect(await begin('buy')).toEqual({ ok: true })
    await expect(begin('sell')).rejects.toThrow('invalid_request')
  })

  it('rate limits per bucket and window', async () => {
    const p = await t.playerId(await t.player('Spammer'))
    for (let i = 0; i < 3; i++) await t.sql(`select private.rate_limit($1, 'x', 3, 60)`, [p])
    await expect(t.sql(`select private.rate_limit($1, 'x', 3, 60)`, [p])).rejects.toThrow('rate_limited')
  })
})

describe('security', () => {
  it('exposes RPCs to signed-in users only, and has a contract for each', async () => {
    const fns = await t.sql<{ name: string; sig: string; anon: boolean; auth: boolean }>(
      `select p.proname as name, p.oid::regprocedure::text as sig,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as auth
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind = 'f'`,
    )
    expect(fns.length).toBeGreaterThan(0)
    for (const f of fns) {
      expect(f.anon, `${f.sig} must not be callable by anon`).toBe(false)
      expect(f.auth, `${f.sig} must be callable by authenticated`).toBe(true)
      expect(Object.keys(RPC_SCHEMAS), `${f.name} needs a schema in RPC_SCHEMAS`).toContain(f.name)
    }
  })

  it('has row level security on every game table', async () => {
    const open = await t.sql(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'game' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(open).toEqual([])
  })
})
