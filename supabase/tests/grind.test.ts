import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const B = 'booster-pkm-base'
const rid = () => crypto.randomUUID()
let t: TestDb
let me: string
let id: string

const setLevel = (level: number) => t.sql(`update game.players set level = $2 where id = $1`, [id, level])
const giveCash = (cents: number) => t.sql(`select private.money_add($1, $2, 'test')`, [id, cents])
const player = async () => (await t.rpc(me, 'me_get')).player!

beforeEach(async () => {
  t = await createTestDb()
  await t.sql(`select setseed(0.31)`)
  me = await t.player('Malocher')
  id = await t.playerId(me)
})

describe('Geldbunker', () => {
  it('opens at level 3, fills over time up to its capacity and pays on collect', async () => {
    expect((await t.rpc(me, 'bunker_get')).unlocked).toBe(false)
    await expect(t.rpc(me, 'bunker_collect', { p_request_id: rid() })).rejects.toThrow('locked')
    await setLevel(3)
    let b = await t.rpc(me, 'bunker_get')
    expect(b).toMatchObject({ unlocked: true, rate_cents: 120_00, capacity_h: 4, content_cents: 0, stage: 0 })
    await expect(t.rpc(me, 'bunker_collect', { p_request_id: rid() })).rejects.toThrow('bunker_empty')
    await t.advance('2 hours')
    expect((await t.rpc(me, 'bunker_get')).content_cents).toBe(240_00)
    await t.advance('10 hours')
    b = await t.rpc(me, 'bunker_get')
    expect(b.content_cents).toBe(480_00) // full: 4 h
    const before = (await player()).cash_cents
    const res = await t.rpc(me, 'bunker_collect', { p_request_id: rid() })
    expect(res.collected_cents).toBe(480_00)
    expect(res.player.cash_cents).toBeGreaterThanOrEqual(before + 480_00)
    expect(res.bunker.content_cents).toBe(0)
    await t.assertLedgerMatches()
  })

  it('upgrades raise rate and capacity, pay out the content first, and interest rewards a full bunker', async () => {
    await setLevel(10)
    await giveCash(1_000_000_00)
    await t.rpc(me, 'bunker_get')
    await t.advance('1 hour')
    const up = await t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'bunker_ertrag' })
    expect(up.bunker.content_cents).toBe(0) // paid out before the rebuild
    expect(up.bunker.rate_cents).toBe(Math.round(120_00 * 1.12))
    const cap = await t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'bunker_kapazitaet' })
    expect(cap.bunker.capacity_h).toBe(6)
    await t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'bunker_zinsen' })
    await t.advance('6 hours')
    const res = await t.rpc(me, 'bunker_collect', { p_request_id: rid() })
    expect(res.interest_cents).toBe(Math.round(res.collected_cents * 0.03))
    await t.assertLedgerMatches()
  })
})

describe('upgrades', () => {
  it('cost grows, need levels and money, apply their modifier and stop at the maximum', async () => {
    await expect(t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'energie_tank' })).rejects.toThrow('locked')
    await setLevel(5)
    let list = await t.rpc(me, 'upgrades_get')
    const tank = () => list.upgrades.find((u) => u.key === 'energie_tank')!
    expect(tank()).toMatchObject({ level: 0, cost_cents: 800_00, now: 0, next: 10 })
    await expect(t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'energie_tank' })).rejects.toThrow('insufficient_funds')
    await giveCash(10_000_00)
    const res = await t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'energie_tank' })
    list = res
    expect(tank()).toMatchObject({ level: 1, cost_cents: Math.round(800_00 * 1.45), need_level: 7 })
    expect(res.player.energy_max).toBe(110)
    // next level needs player level 7
    await expect(t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'energie_tank' })).rejects.toThrow('locked')
    await t.sql(`update game.upgrades_owned set level = 10 where player_id = $1 and key = 'energie_tank'`, [id])
    await setLevel(60)
    await expect(t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'energie_tank' })).rejects.toThrow('upgrade_max')
    await t.assertLedgerMatches()
  })
})

describe('quests', () => {
  it('adds five dailies from level 2 and five weeklies from level 13; one free reroll per day', async () => {
    let q = await t.rpc(me, 'quests_get')
    expect(q.daily).toHaveLength(0)
    await setLevel(2)
    q = await t.rpc(me, 'quests_get')
    expect(q.daily).toHaveLength(5)
    expect(q.weekly).toHaveLength(0)
    const first = q.daily[0]!
    const re = await t.rpc(me, 'quest_reroll', { p_request_id: rid(), p_quest: first.id })
    expect(re.daily).toHaveLength(5)
    expect(re.daily.map((d) => d.template)).not.toContain(first.template)
    expect(re.reroll_free).toBe(false)
    await expect(t.rpc(me, 'quest_reroll', { p_request_id: rid(), p_quest: re.daily[0]!.id })).rejects.toThrow('reroll_used')
    await setLevel(13)
    expect((await t.rpc(me, 'quests_get')).weekly).toHaveLength(5)
  })

  it('pays a bonus for all five dailies, expires old ones at midnight', async () => {
    await setLevel(5)
    const q = await t.rpc(me, 'quests_get')
    for (const d of q.daily) await t.sql(`update game.quests set progress = target where id = $1`, [d.id])
    const before = (await player()).cash_cents
    let last
    for (const d of q.daily) last = await t.rpc(me, 'quest_claim', { p_request_id: rid(), p_quest: d.id })
    expect(last!.daily_bonus_done).toBe(true)
    const paid = q.daily.reduce((s, d) => s + d.reward_cents, 0)
    expect(last!.player.cash_cents).toBeGreaterThan(before + paid) // + bonus
    const notes = (await t.rpc(me, 'sync')).notifications.map((n) => n.kind)
    expect(notes).toContain('daily_bonus')

    await t.advance('1 day')
    const next = await t.rpc(me, 'quests_get')
    expect(next.daily).toHaveLength(5)
    expect(next.daily_bonus_done).toBe(false)
    expect(next.daily.every((d) => !d.claimed)).toBe(true)
  })

  it('stamps once a day, the joker catches up one missed day, the 7th stamp brings a booster', async () => {
    await expect(t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })).rejects.toThrow('locked')
    await setLevel(2)
    // move to a Monday morning so the week is predictable
    await t.sql(`update game.server set clock_offset = clock_offset + ((date_trunc('week', now()) + interval '7 days 9 hours') - now())`)
    let q = await t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })
    expect(q.stamps).toMatchObject({ days: 1, today_done: true, joker_available: false })
    await expect(t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })).rejects.toThrow('stamp_done')
    await t.advance('2 days') // missed Tuesday
    q = await t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })
    expect(q.stamps).toMatchObject({ days: 2, joker_available: true })
    q = await t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: true })
    expect(q.stamps).toMatchObject({ days: 3, joker_available: false })
    for (let i = 0; i < 4; i++) {
      await t.advance('1 day')
      q = await t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })
    }
    expect(q.stamps.days).toBe(7)
    expect(q.player.sealed_total).toBe(1)
    await t.advance('1 day') // new week
    q = await t.rpc(me, 'stamp_claim', { p_request_id: rid(), p_joker: false })
    expect(q.stamps.days).toBe(1)
  })
})

describe('shifts', () => {
  it('pay wage by rank with check-in bonus; early stops pay pro rata', async () => {
    await expect(t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 1 })).rejects.toThrow('locked')
    await setLevel(7)
    await expect(t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'dhl', p_hours: 1 })).rejects.toThrow('locked')
    await expect(t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 2 })).rejects.toThrow('invalid_request')
    const jobs = await t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 1 })
    const wage = jobs.jobs.find((j) => j.key === 'mueller')!.wage_cents!
    expect(jobs.shift).toMatchObject({ job: 'mueller', checkins: 0, done: false })
    await expect(t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 1 })).rejects.toThrow('shift_running')
    await expect(t.rpc(me, 'shift_checkin', { p_request_id: rid() })).rejects.toThrow('checkin_unavailable')
    await t.advance('31 minutes')
    expect((await t.rpc(me, 'shift_checkin', { p_request_id: rid() })).shift!.checkins).toBe(1)
    await t.advance('30 minutes')
    const done = await t.rpc(me, 'shift_claim', { p_request_id: rid() })
    expect(done.result).toMatchObject({ job: 'mueller', hours: 1, done: true })
    expect(done.result.wage_cents).toBe(Math.round(wage * 1.05))
    expect(done.shift).toBeNull()

    await t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 4 })
    await t.advance('1 hour')
    const early = await t.rpc(me, 'shift_claim', { p_request_id: rid() })
    expect(early.result).toMatchObject({ hours: 1, done: false })
    // 10 hours worked -> Festangestellt with +15 % (compared at the same player level: shifts give EP)
    const base = (await t.rpc(me, 'jobs_get')).jobs.find((j) => j.key === 'mueller')!.wage_cents!
    await t.sql(`update game.job_hours set hours = 10 where player_id = $1`, [id])
    const ranked = (await t.rpc(me, 'jobs_get')).jobs.find((j) => j.key === 'mueller')!
    expect(ranked.rank).toBe(1)
    expect(Math.abs(ranked.wage_cents! - base * 1.15)).toBeLessThanOrEqual(1)
    await t.assertLedgerMatches()
  })
})

describe('minijobs, snacks and the Pfandautomat', () => {
  it('gates minijobs by job level and pays their score', async () => {
    await expect(t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'regale' })).rejects.toThrow('locked')
    await setLevel(3)
    const run = await t.rpc(me, 'minigame_start', { p_request_id: rid(), p_game: 'regale' })
    expect(run.duration_s).toBe(45)
    await t.advance('45 seconds')
    const res = await t.rpc(me, 'minigame_finish', { p_request_id: rid(), p_run: run.run_id, p_score: 30000, p_bottles: 0 })
    expect(res.payout_cents).toBe(30000)
    expect(res.pfandbons).toBe(1)
  })

  it('Döner gives energy and greasy fingers; Pfandbons buy boosts and boosters', async () => {
    await t.sql(`update game.players set energy = 10 where id = $1`, [id])
    const res = await t.rpc(me, 'consumable_use', { p_request_id: rid(), p_key: 'doener' })
    expect(res.player.energy).toBe(60)
    expect(res.player.buffs.map((b) => b.key)).toEqual(['doener'])
    expect(res.player.cash_cents).toBe(400_00 - 150_00)
    await expect(t.rpc(me, 'consumable_use', { p_request_id: rid(), p_key: 'kioskbon' })).rejects.toThrow('not_enough_pfandbons')
    await t.sql(`update game.players set pfandbons = 20 where id = $1`, [id])
    const bon = await t.rpc(me, 'consumable_use', { p_request_id: rid(), p_key: 'kioskbon' })
    expect(bon.player).toMatchObject({ pfandbons: 12, sealed_total: 1 })
    const luck = await t.rpc(me, 'consumable_use', { p_request_id: rid(), p_key: 'gluecksbon' })
    expect(luck.player.buffs.map((b) => b.key).sort()).toEqual(['doener', 'gluecksbon'])
    await t.advance('11 minutes')
    expect((await player()).buffs.map((b) => b.key)).toEqual(['gluecksbon'])
    await t.assertLedgerMatches()
  })
})

describe('achievements and titles', () => {
  it('unlock tiers from counters, pay EP, notify and grant titles', async () => {
    await t.sql(`select private.emit($1, 'pulled_grail')`, [id])
    const stats = await t.rpc(me, 'stats_get')
    expect(stats.achievements).toEqual([expect.objectContaining({ key: 'grail', tier: 1 })])
    expect(stats.titles).toEqual(['Gralsritter'])
    const notes = (await t.rpc(me, 'sync')).notifications.filter((n) => n.kind === 'achievement')
    expect(notes[0]!.data).toMatchObject({ key: 'grail', tier: 1, title: 'Gralsritter' })
    await expect(t.rpc(me, 'title_set', { p_request_id: rid(), p_title: 'Endgegner' })).rejects.toThrow('title_locked')
    const set = await t.rpc(me, 'title_set', { p_request_id: rid(), p_title: 'Gralsritter' })
    expect(set.player.title).toBe('Gralsritter')
  })

  it('level-up achievements granting EP inside a level-up never lose EP or levels', async () => {
    // 9 level-ups unlock "Aufsteiger" tier 1, whose EP is granted while levels are still being processed
    const r = await t.sql<{ r: { level: number } }>(`select private.ep_grant($1, 5000) as r`, [id])
    const p = await player()
    expect(p.level).toBe(r[0]!.r.level)
    const [c] = await t.sql<{ total: string }>(`select total from game.counters where player_id = $1 and event = 'level_up'`, [id])
    expect(Number(c!.total)).toBe(p.level - 1)
    expect(p.skill_points).toBe(p.level - 1)
    expect((await t.rpc(me, 'stats_get')).achievements.find((a) => a.key === 'levels')!.tier).toBeGreaterThanOrEqual(1)
    await t.assertLedgerMatches()
  })
})

describe('recap', () => {
  it('reports the time away and collects bunker and finished shift in one go', async () => {
    await setLevel(7)
    await t.rpc(me, 'bunker_get')
    await t.rpc(me, 'shift_start', { p_request_id: rid(), p_job: 'mueller', p_hours: 1 })
    await t.advance('3 hours')
    expect((await t.rpc(me, 'me_get')).away_s).toBeGreaterThanOrEqual(3 * 3600)
    const recap = await t.rpc(me, 'recap_get')
    expect(recap.bunker.content_cents).toBe(360_00)
    expect(recap.shift).toMatchObject({ done: true })
    const res = await t.rpc(me, 'recap_collect', { p_request_id: rid() })
    expect(res.bunker_cents).toBe(360_00)
    expect(res.shift_cents).toBe(recap.shift!.wage_cents)
    await t.assertLedgerMatches()
  })
})

describe('Gefahrenzone', () => {
  it('resets an account to a fresh one, with confirmation and cooldown', async () => {
    await t.sql(`select private.sealed_add($1, $2, 3)`, [id, B])
    await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: B, p_qty: 1 })
    await setLevel(9)
    await expect(t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'falsch' })).rejects.toThrow('confirm_wrong')
    const res = await t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'MALOCHER' })
    expect(res.player).toMatchObject({ level: 1, cash_cents: 400_00, sealed_total: 0, tutorial_step: 0, pfandbons: 0 })
    expect((await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })).cards.every((c) => c.qty === 0 && !c.discovered)).toBe(true)
    expect((await t.rpc(me, 'quests_get')).mini).toHaveLength(3)
    await expect(t.rpc(me, 'account_reset', { p_request_id: rid(), p_confirm: 'malocher' })).rejects.toThrow('reset_cooldown')
    await t.assertLedgerMatches()
  })

  it('deletes an account, anonymises the feed and hands admin to the oldest remaining player', async () => {
    const other = await t.player('Erbe')
    const res = await t.rpc(me, 'account_delete', { p_request_id: rid(), p_confirm: 'Malocher' })
    expect(res.player).toBeNull()
    expect(await t.sql(`select 1 from game.players where username = 'Malocher'`)).toHaveLength(0)
    const feed = (await t.rpc(other, 'sync')).feed.filter((f) => f.kind === 'player_joined').map((f) => f.data.name)
    expect(feed).toContain('Gelöschter Spieler')
    expect((await t.rpc(other, 'me_get')).player!.is_admin).toBe(true)
  })
})
