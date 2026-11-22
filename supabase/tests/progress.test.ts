import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let me: string

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.17)`)
  me = await t.player('Neuling')
})

describe('level rewards', () => {
  it('pays money on every level-up and a booster every 5 levels', async () => {
    const id = await t.playerId(me)
    const before = (await t.rpc(me, 'me_get')).player!
    await t.sql(`select private.ep_grant($1, 2000)`, [id])
    const after = (await t.rpc(me, 'me_get')).player!
    expect(after.level).toBeGreaterThanOrEqual(5)
    expect(after.cash_cents).toBeGreaterThan(before.cash_cents)
    expect(after.sealed_total).toBeGreaterThanOrEqual(1)
    const ups = (await t.rpc(me, 'sync')).notifications.filter((n) => n.kind === 'level_up')
    expect(ups[0]!.data).toMatchObject({ level: 2, booster: false })
    expect(ups.find((n) => n.data.level === 5)!.data.booster).toBe(true)
    const path = await t.rpc(me, 'level_path_get')
    expect(path.levels).toHaveLength(99)
    expect(path.levels[0]).toMatchObject({ level: 2, ep: 35, reward_cents: ups[0]!.data.reward_cents })
    await t.assertLedgerMatches()
  })
})

describe('mini-quests', () => {
  it('always has three, tracks events and replaces a claimed one', async () => {
    const q = await t.rpc(me, 'quests_get')
    expect(q.mini).toHaveLength(3)
    const id = await t.playerId(me)
    const first = q.mini[0]!
    await expect(t.rpc(me, 'quest_claim', { p_request_id: rid(), p_quest: first.id })).rejects.toThrow('quest_not_ready')
    const [{ event }] = await t.sql<{ event: string }>(`select event from game.quests where id = $1`, [first.id]) as [{ event: string }]
    await t.sql(`select private.emit($1, $2, 1000)`, [id, event])
    const ready = (await t.rpc(me, 'me_get')).player!.quests_ready
    expect(ready).toBeGreaterThanOrEqual(1)
    const before = (await t.rpc(me, 'me_get')).player!
    const res = await t.rpc(me, 'quest_claim', { p_request_id: rid(), p_quest: first.id })
    expect(res.mini).toHaveLength(3)
    expect(res.mini.map((m) => m.id)).not.toContain(first.id)
    expect(res.player.pfandbons).toBe(before.pfandbons + 1)
    expect(res.player.cash_cents).toBeGreaterThan(before.cash_cents)
    expect(res.claimed_total).toBe(1)
  })
})

describe('tutorial', () => {
  it('walks through the steps on real events and pays rewards', async () => {
    const id = await t.playerId(me)
    await t.sql(`delete from game.licenses where player_id = $1`, [id]) // fresh from registration: no game yet
    let p = (await t.rpc(me, 'me_get')).player!
    expect(p.tutorial_step).toBe(0)
    await expect(t.rpc(me, 'tutorial_skip', { p_request_id: rid() })).rejects.toThrow('tutorial_not_skippable')
    p = (await t.rpc(me, 'starter_pick', { p_request_id: rid(), p_game: 'yugioh' })).player
    expect(p).toMatchObject({ tutorial_step: 1, sealed_total: 1 }) // Opa's booster, from the favourite game
    const sealed = await t.sql<{ product_id: string }>(`select product_id from game.sealed where player_id = $1 and qty > 0`, [id])
    expect(sealed.map((r) => r.product_id)).toEqual(['booster-ygo-lob'])
    p = (await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: 'booster-ygo-lob', p_qty: 1 })).player
    expect(p.tutorial_step).toBe(2)
    // acknowledging again does nothing outside its step
    p = (await t.rpc(me, 'tutorial_ack', { p_request_id: rid() })).player
    expect(p.tutorial_step).toBe(2)
    const run = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'pfand' })
    await t.advance('46 seconds')
    p = (await t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: run.run_id, p_score: 8000, p_bottles: 30 })).player
    expect(p.tutorial_step).toBe(3)
    p = (await t.rpc(me, 'tutorial_skip', { p_request_id: rid() })).player
    expect(p.tutorial_step).toBe(-1)
  })
})

describe('minijob Pfandflaschen', () => {
  it('costs energy, pays the deposit, caps cheats and refuses early finishes', async () => {
    const start = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'pfand' })
    expect(start.player.energy).toBe(90)
    await expect(
      t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: start.run_id, p_score: 5000, p_bottles: 20 }),
    ).rejects.toThrow('too_early')
    await t.advance('45 seconds')
    const before = (await t.rpc(me, 'me_get')).player!
    const done = await t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: start.run_id, p_score: 15000, p_bottles: 40 })
    expect(done.payout_cents).toBe(15000)
    expect(done.pfandbons).toBe(1)
    // the round's EP may also trigger a level-up with its own reward
    expect(done.player.cash_cents).toBeGreaterThanOrEqual(before.cash_cents + 15000)
    await expect(
      t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: start.run_id, p_score: 1, p_bottles: 1 }),
    ).rejects.toThrow('invalid_request')

    const cheat = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'pfand' })
    await t.advance('45 seconds')
    const res = await t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: cheat.run_id, p_score: 999_999, p_bottles: 999 })
    expect(res.payout_cents).toBe(0)
    await t.assertLedgerMatches()
  })

  it('regenerates energy over time and blocks when empty', async () => {
    const id = await t.playerId(me)
    await t.sql(`update game.players set energy = 5 where id = $1`, [id])
    await expect(t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'pfand' })).rejects.toThrow('not_enough_energy')
    await t.advance('15 minutes') // +5
    const start = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'pfand' })
    expect(start.player.energy).toBe(0)
    await t.advance('2 hours')
    expect((await t.rpc(me, 'me_get')).player!.energy).toBe(40)
    await t.advance('10 hours')
    expect((await t.rpc(me, 'me_get')).player!.energy).toBe(100)
  })
})
