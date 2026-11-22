// Balancing simulation: a bot plays the real server SQL (in-memory Postgres) with a fast-forwarded clock.
// It plays like an active player for N minutes a day and is away for the rest of the day.
import { createTestDb, type TestDb } from '../supabase/tests/harness.ts'

const B = 'booster-pkm-base'
const rid = () => crypto.randomUUID()
const ASPECTS = ['centering', 'corners', 'edges', 'surface'] as const
/** Typical scores of a decent player per minijob (Basis-€ cents). */
const SCORE: Record<string, number> = { pfand: 8_000, regale: 9_000, sortieren: 8_000, pakete: 12_000, fake: 14_000, praktikum: 16_000 }

export interface SimResult {
  /** level -> active minutes and day when it was reached */
  levels: Record<number, { activeMin: number; day: number }>
  finalLevel: number
  netWorthCents: number
  /** Basis-€ income per ledger reason over the whole run */
  income: Record<string, number>
  /** grader and grade of every slab at the end */
  slabs: string[]
}

export async function simulate(opts: { days: number; activeMinPerDay: number; seed?: number }): Promise<SimResult> {
  const t = await createTestDb()
  await t.sql(`select setseed($1)`, [opts.seed ?? 0.5])
  const me = await t.player('Bot')
  const id = await t.playerId(me)
  await t.sql(`update game.players set tutorial_step = -1 where id = $1`, [id])
  const levels: SimResult['levels'] = {}
  let active = 0
  let day = 1
  const note = (level: number) => {
    for (let l = 2; l <= level; l++) levels[l] ??= { activeMin: Math.round(active), day }
  }

  for (; day <= opts.days; day++) {
    let spent = 0
    await quietly(t, me, 'recap_collect', {})
    while (spent < opts.activeMinPerDay * 60) {
      advanced = 0
      const s = await step(t, me)
      spent += s
      active += s / 60
      if (s > advanced) await t.advance(`${Math.round(s - advanced)} seconds`)
      note((await t.rpc(me, 'me_get')).player!.level)
    }
    // Before leaving: start a long shift, then the rest of the day passes.
    const jobs = await t.rpc(me, 'jobs_get')
    if (!jobs.shift && (await level(t, me)) >= jobs.unlock_shifts) await quietly(t, me, 'shift_start', { p_job: bestShift(jobs, await level(t, me)), p_hours: 8 })
    await t.advance(`${24 * 3600 - spent} seconds`)
  }

  const income: Record<string, number> = {}
  for (const r of await t.sql<{ reason: string; sum: string }>(
    `select reason, sum(sum_cents)::bigint as sum from game.ledger_daily where player_id = $1 and sum_cents > 0 group by reason`,
    [id],
  ))
    income[r.reason] = Number(r.sum)
  const p = (await t.rpc(me, 'me_get')).player!
  const slabs = await t.sql<{ grader: string; grade: string }>(`select grader, grade from game.card_copies where owner_id = $1 and grader is not null`, [id])
  return { levels, finalLevel: p.level, netWorthCents: p.net_worth_cents, income, slabs: slabs.map((s) => `${s.grader} ${Number(s.grade)}`) }
}

/** Seconds the current step already moved the clock (a minijob round has to really last). */
let advanced = 0

const level = async (t: TestDb, me: string) => (await t.rpc(me, 'me_get')).player!.level

function bestShift(jobs: Awaited<ReturnType<TestDb['rpc']>> & { jobs: { key: string; shifts: boolean; min_level: number; wage_cents: number | null }[] }, lvl: number) {
  return jobs.jobs.filter((j) => j.shifts && j.min_level <= lvl).sort((a, b) => (b.wage_cents ?? 0) - (a.wage_cents ?? 0))[0]!.key
}

/** Calls an RPC and ignores game errors (the bot simply tries the next thing). */
async function quietly(t: TestDb, me: string, fn: Parameters<TestDb['rpc']>[1], args: Record<string, unknown>) {
  try {
    return await t.rpc(me, fn, { p_request_id: rid(), ...args })
  } catch {
    return undefined
  }
}

/** One decision of an active player. Returns the seconds it took. */
async function step(t: TestDb, me: string): Promise<number> {
  const p = (await t.rpc(me, 'me_get')).player!
  // 1. rewards waiting: quests and the daily stamp
  const q = await t.rpc(me, 'quests_get')
  const ready = [...q.mini, ...q.daily, ...q.weekly].filter((x) => !x.claimed && x.progress >= x.target)
  if (ready.length) {
    for (const x of ready) await quietly(t, me, 'quest_claim', { p_quest: x.id })
    return 10
  }
  if (q.stamps.unlocked && !q.stamps.today_done) {
    await quietly(t, me, 'stamp_claim', { p_joker: false })
    return 5
  }
  // 2. idle income: a finished shift, a half-full bunker
  const jobs = await t.rpc(me, 'jobs_get')
  if (jobs.shift?.done) {
    await quietly(t, me, 'shift_claim', {})
    return 5
  }
  if (!jobs.shift && p.level >= jobs.unlock_shifts) {
    await quietly(t, me, 'shift_start', { p_job: bestShift(jobs, p.level), p_hours: 4 })
    return 5
  }
  const bunker = await t.rpc(me, 'bunker_get')
  if (bunker.unlocked && (bunker.content_cents ?? 0) > (bunker.rate_cents ?? 0) * (bunker.capacity_h ?? 0) * 0.5) {
    await quietly(t, me, 'bunker_collect', {})
    return 5
  }
  // 3. sealed boosters are opened at once
  if (p.sealed_total > 0) {
    await openAll(t, me)
    return 20
  }
  // 4. cheapest affordable upgrade, if it costs less than a third of the cash
  if (p.level >= 5) {
    const ups = (await t.rpc(me, 'upgrades_get')).upgrades
      .filter((u) => u.cost_cents !== null && u.need_level <= p.level && u.cost_cents * 3 <= p.cash_cents)
      .sort((a, b) => a.cost_cents! - b.cost_cents!)
    if (ups[0]) {
      await quietly(t, me, 'upgrade_buy', { p_key: ups[0].key })
      return 5
    }
  }
  // 4b. grading: reveal what is back, inspect new hits, send promising valuable ones (cash to spare)
  if (p.level >= 13) {
    const g = await t.rpc(me, 'grading_get')
    const now = Date.parse((await t.sql<{ n: string }>(`select private.now() as n`))[0]!.n)
    const due = g.orders.filter((o) => Date.parse(o.due_at) <= now).map((o) => o.id)
    if (due.length) {
      await quietly(t, me, 'grading_reveal', { p_orders: due })
      return 15
    }
    const fresh = g.copies.find((c) => !c.ranges)
    if (fresh) {
      await quietly(t, me, 'grading_inspect', { p_copy: fresh.copy_id, p_card: null })
      return 5
    }
    // every aspect could still be a 10: send it (PSA for valuable cards, CGC for the rest)
    const top = (c: (typeof g.copies)[number]) => ASPECTS.every((a) => c.ranges![a][1] === 10)
    const psa = g.graders.psa.fees_cents.economy
    const cgc = g.graders.cgc.fees_cents.economy
    const send = g.copies.find((c) => top(c) && (c.value_cents >= 2 * psa || c.value_cents * 2 >= cgc))
    if (send && g.used < g.slots && p.cash_cents >= 3 * psa) {
      await quietly(t, me, 'grading_submit', { p_copies: [send.copy_id], p_grader: send.value_cents >= 2 * psa ? 'psa' : 'cgc', p_service: 'economy' })
      return 10
    }
  }
  // 5. a minijob round when there is energy
  const game = jobs.jobs.filter((j) => j.minigame && j.min_level <= p.level && (j.energy ?? 99) <= p.energy).sort((a, b) => b.min_level - a.min_level)[0]
  if (game) {
    const run = await quietly(t, me, 'minigame_start', { p_game: game.minigame })
    if (run && 'run_id' in run) {
      await t.advance(`${run.duration_s} seconds`)
      advanced = run.duration_s
      await quietly(t, me, 'minigame_finish', { p_run: run.run_id, p_score: SCORE[game.minigame!], p_bottles: 25 })
      return run.duration_s + 10
    }
  }
  // 6. spare money goes into boosters
  const shop = await t.rpc(me, 'shop_get')
  const price = shop.kiosk[0]?.price_cents ?? Infinity
  const qty = p.cash_cents >= price * 10 ? 10 : p.cash_cents >= price * 5 ? 5 : p.cash_cents >= price ? 1 : 0
  if (qty && (await quietly(t, me, 'store_buy', { p_product: B, p_qty: qty }))) return 5
  // 7. nothing to do: wait a minute
  return 60
}

async function openAll(t: TestDb, me: string) {
  const sealed = (await t.rpc(me, 'shop_get')).sealed
  for (const s of sealed) {
    let left = s.qty
    while (left > 0) {
      const n = Math.min(10, left)
      await quietly(t, me, 'pack_open', { p_product: s.product_id, p_qty: n })
      left -= n
    }
  }
  // sell the duplicates of bulk cards, keep one of each
  const binder = await t.rpc(me, 'binder_get', { p_set: 'pokemon-base' })
  const stacks = binder.cards.filter((c) => c.copies.length === 0 && c.qty > 1).map((c) => ({ card_id: c.card_id, qty: c.qty - 1 }))
  if (stacks.length) await quietly(t, me, 'ankauf_sell', { p_stacks: JSON.stringify(stacks), p_copies: [] })
}
