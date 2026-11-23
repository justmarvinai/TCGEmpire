// Balancing simulation: a bot plays the real server SQL (in-memory Postgres) with a fast-forwarded clock.
// It plays like an active player for N minutes a day and is away for the rest of the day.
import { createTestDb, type TestDb } from '../supabase/tests/harness.ts'
import { HOMES } from '../content/housing.ts'
import { SKILL_COST, SKILLS } from '../content/skills.ts'
import { DECISIONS, type DecisionEffect } from '../content/company.ts'

const B = 'booster-pkm-base'
/** the games in the order the bot buys licences, and their sets */
const GAMES = ['pokemon', 'yugioh', 'onepiece', 'riftbound'] as const
const SETS = ['pokemon-base', 'yugioh-lob', 'onepiece-op01', 'riftbound-origins']
const rid = () => crypto.randomUUID()
const ASPECTS = ['centering', 'corners', 'edges', 'surface'] as const
const BRANCH_ORDER = ['unternehmer', 'sammler', 'haendler', 'schlitzohr']
/** Typical scores of a decent player per minijob (Basis-€ cents). */
const SCORE: Record<string, number> = { pfand: 8_000, regale: 9_000, sortieren: 8_000, pakete: 12_000, fake: 14_000, praktikum: 16_000 }

export interface SimResult {
  /** level -> active minutes and day when it was reached (first run) */
  levels: Record<number, { activeMin: number; day: number }>
  /** every run (an exit starts the next): its first day, the day of the run each level came, the exit, the Sterne */
  runs: { startDay: number; levels: Record<number, number>; exitDay?: number; stars?: number; peakNetWorthCents: number; prevPeakDay?: number }[]
  finalLevel: number
  netWorthCents: number
  /** Basis-€ income per ledger reason over the whole run */
  income: Record<string, number>
  /** grader and grade of every slab at the end */
  slabs: string[]
  /** failed tick jobs (system: error) */
  jobErrors: string[]
  /** notifications the bot got, by kind */
  notes: Record<string, number>
  /** events that happened, by slot */
  events: Record<string, number>
  /** the bot's failed actions, most frequent first */
  failures: string[]
  /** database size at the end (one player, no tick retention jobs: an upper bound) and the biggest tables */
  db: { mb: number; tables: string }
  /** the company at the end (if founded): stage, value, and per German day its profit and the player's other income */
  company: {
    stage: number
    valueCents: number
    staff: number
    /** what limits it at the end */
    capacity: number
    demand: number
    accuracy: number
    ruf: number
    cashCents: number
    equipment: Record<string, number>
    days: { day: string; profit: number; other: number }[]
  } | null
}

export async function simulate(opts: { days: number; activeMinPerDay: number; seed?: number; prestiges?: number }): Promise<SimResult> {
  const t = await createTestDb()
  await t.sql(`select setseed($1)`, [opts.seed ?? 0.5])
  // a fixed Monday morning, so that weekly and calendar events fall the same way on every run
  await t.sql(`update game.server set clock_offset = (timestamp '2026-11-23 08:00' at time zone 'Europe/Berlin') - now() where id`)
  // the world happens to the bot as well: daily, random, personal and calendar events (the tests switch them off)
  await t.sql(`update game.config_overrides set value = 'true', updated_at = now() where key = 'events.enabled'`)
  // SIM_EP=1: log every EP grant with the function that asked for it (balance work only)
  if (process.env.SIM_EP) {
    await t.sql(`create table game.sim_ep (source text, base numeric, level int)`)
    await t.sql(`alter function private.ep_grant(uuid, numeric) rename to ep_grant_inner`)
    await t.sql(`create function private.ep_grant(p_player uuid, p_base_ep numeric) returns jsonb
      language plpgsql set search_path = '' as $f$
      declare v_ctx text;
      begin
        get diagnostics v_ctx = pg_context;
        insert into game.sim_ep values ((regexp_match(substr(v_ctx, position(E'\\n' in v_ctx) + 1), 'function (?:\\w+\\.)?"?(\\w+)'))[1], p_base_ep,
          (select level from game.players where id = p_player));
        return private.ep_grant_inner(p_player, p_base_ep);
      end $f$`)
  }
  const me = await t.player('Bot')
  const id = await t.playerId(me)
  await t.sql(`update game.players set tutorial_step = -1 where id = $1`, [id])
  // SIM_LEVEL=70: start later in the game with some money (to look at the late game quickly)
  if (process.env.SIM_LEVEL) {
    await t.sql(`update game.players set level = $2 where id = $1`, [id, Number(process.env.SIM_LEVEL)])
    await t.sql(`select private.money_add($1, 5000000000, 'admin_grant', 'sim')`, [id])
  }
  const levels: SimResult['levels'] = {}
  const runs: SimResult['runs'] = [{ startDay: 1, levels: {}, peakNetWorthCents: 0 }]
  let active = 0
  let day = 1
  const note = (level: number) => {
    const run = runs.at(-1)!
    for (let l = 2; l <= level; l++) {
      if (runs.length === 1) levels[l] ??= { activeMin: Math.round(active), day }
      run.levels[l] ??= day - run.startDay + 1
    }
  }
  const exitsLeft = () => (opts.prestiges ?? 0) - (runs.length - 1)

  for (; day <= opts.days; day++) {
    let spent = 0
    await quietly(t, me, 'recap_collect', {})
    await t.rpc(me, 'sync', {}) // online: personal events can find the bot
    await t.sql(`select private.tick_events(), private.tick_calendar(), private.tick_battles()`) // the only tick systems the sim runs
    // the exit at level 100 (planned prestiges): perks first, then a new run
    const lvl = await level(t, me)
    stopGrading = exitsLeft() > 0 && lvl >= 95
    if (exitsLeft() > 0 && lvl >= 100 && Object.keys((await t.rpc(me, 'prestige_get')).blockers).length === 0) {
      const res = await quietly(t, me, 'prestige_exit', { p_confirm: 'Bot' })
      if (res) {
        Object.assign(runs.at(-1)!, { exitDay: day, stars: res.history.at(-1)?.stars })
        await buyPerks(t, me)
        runs.push({ startDay: day, levels: {}, peakNetWorthCents: 0 })
        lastRuf = -1
      }
    }
    while (spent < opts.activeMinPerDay * 60) {
      advanced = 0
      const s = await step(t, me)
      spent += s
      active += s / 60
      if (s > advanced) await t.advance(`${Math.round(s - advanced)} seconds`)
      note((await t.rpc(me, 'me_get')).player!.level)
    }
    await t.sql(`select private.tick_events(), private.tick_calendar(), private.tick_battles()`)
    if (process.env.SIM_TRACE) {
      const pl = (await t.rpc(me, 'me_get')).player!
      const top = [...doneToday].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ')
      console.log(`day ${day}: level ${pl.level}, cash ${(pl.cash_cents / 100).toFixed(0)} €, energy ${pl.energy}, sealed ${pl.sealed_total} | ${top}`)
    }
    doneToday.clear()
    const run = runs.at(-1)!
    const worth = (await t.rpc(me, 'me_get')).player!.net_worth_cents
    run.peakNetWorthCents = Math.max(run.peakNetWorthCents, worth)
    const prev = runs.at(-2)
    if (prev && run.prevPeakDay === undefined && worth >= prev.peakNetWorthCents) run.prevPeakDay = day - run.startDay + 1
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
  const co = (await t.rpc(me, 'company_get')).company
  let company: SimResult['company'] = null
  if (co) {
    const days = await t.sql<{ day: string; profit: string; other: string }>(
      `select d.day::text as day, (d.revenue_cents - d.costs_cents) as profit,
              coalesce((select sum(sum_cents) from game.ledger_daily l where l.player_id = $1 and l.day = d.day and l.sum_cents > 0
                        and l.reason not in ('company_payout', 'company_deposit', 'admin_grant')), 0) as other
       from game.company_days d where d.company_id = $2 order by d.day`,
      [id, co.id],
    )
    company = {
      stage: co.stage,
      valueCents: co.value_cents,
      staff: co.staff.length,
      capacity: co.capacity,
      demand: co.demand.total,
      accuracy: co.accuracy,
      ruf: co.ruf,
      cashCents: co.cash_cents,
      equipment: co.equipment,
      days: days.map((d) => ({ day: d.day, profit: Number(d.profit), other: Number(d.other) })),
    }
  }
  const jobErrors = (await t.sql<{ e: string }>(`select distinct name || ': ' || error as e from game.job_runs where not ok`)).map((x) => x.e)
  const notes = Object.fromEntries(
    (await t.sql<{ kind: string; n: string }>(`select kind, count(*) as n from game.notifications where player_id = $1 group by kind`, [id])).map((x) => [x.kind, Number(x.n)]),
  )
  if (process.env.SIM_EP) {
    // share of each level band's EP by source, in levels' worth (EP gained / EP needed at that level)
    for (const r of await t.sql<{ band: string; mix: string }>(
      `select band, string_agg(source || ' ' || lv, ', ' order by lv desc) as mix from (
         select (level - 1) / 10 * 10 + 1 || '–' || ((level - 1) / 10 + 1) * 10 as band, min(level) as lo, coalesce(source, '?') as source,
                round(sum(base * power(private.cfg_num('ep.reward_growth') / private.cfg_num('ep.growth'), level) / (25 + 8.5 * power(level, 1.3))), 1) as lv
         from game.sim_ep group by 1, 3) x group by band order by min(lo)`,
    ))
      console.log(`levels ${r.band}: ${r.mix}`)
    console.log(
      'EP by source (base EP):',
      (await t.sql<{ source: string; base: string; n: string }>(`select coalesce(source, '?') as source, round(sum(base)) as base, count(*) as n from game.sim_ep group by 1 order by 2 desc`))
        .map((r) => `${r.source} ${r.base} (${r.n}×)`)
        .join(', '),
    )
  }
  const events = Object.fromEntries(
    (await t.sql<{ slot: string; n: string }>(`select slot, count(*) as n from game.events where applied group by slot`)).map((x) => [x.slot, Number(x.n)]),
  )
  await t.db.exec('vacuum analyze')
  const db = {
    mb: Math.round(Number((await t.sql<{ v: string }>(`select pg_database_size(current_database()) as v`))[0]!.v) / 104857.6) / 10,
    tables: (await t.sql<{ t: string }>(
      `select c.relname || ' ' || round(pg_total_relation_size(c.oid) / 1048576.0, 1) || ' MB' as t from pg_class c
       join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'game' and c.relkind = 'r'
       order by pg_total_relation_size(c.oid) desc limit 6`,
    )).map((x) => x.t).join(', '),
  }
  const failed = [...failures].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${n}×`)
  return { failures: failed, levels, runs, finalLevel: p.level, netWorthCents: p.net_worth_cents, income, slabs: slabs.map((s) => `${s.grader} ${Number(s.grade)}`), company, jobErrors, notes, events, db }
}

/** Seconds the current step already moved the clock (a minijob round has to really last). */
let advanced = 0
/** no new grading orders shortly before an exit (open orders block it) */
let stopGrading = false

const level = async (t: TestDb, me: string) => (await t.rpc(me, 'me_get')).player!.level

function bestShift(jobs: Awaited<ReturnType<TestDb['rpc']>> & { jobs: { key: string; shifts: boolean; min_level: number; wage_cents: number | null }[] }, lvl: number) {
  return jobs.jobs.filter((j) => j.shifts && j.min_level <= lvl).sort((a, b) => (b.wage_cents ?? 0) - (a.wage_cents ?? 0))[0]!.key
}

/** Calls an RPC and ignores game errors (the bot simply tries the next thing). */
/** Failed bot actions by RPC and error (a bot stuck on one failing action shows up here). */
const failures = new Map<string, number>()
/** Successful bot actions of the current day (SIM_TRACE prints them). */
const doneToday = new Map<string, number>()
async function quietly(t: TestDb, me: string, fn: Parameters<TestDb['rpc']>[1], args: Record<string, unknown>) {
  try {
    const res = await t.rpc(me, fn, { p_request_id: rid(), ...args })
    doneToday.set(fn, (doneToday.get(fn) ?? 0) + 1)
    return res
  } catch (e) {
    const key = `${fn}: ${String((e as Error).message).slice(0, 40)}`
    failures.set(key, (failures.get(key) ?? 0) + 1)
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
    let claimed = 0
    for (const x of ready) if (await quietly(t, me, 'quest_claim', { p_quest: x.id })) claimed++
    if (claimed) return 10
  }
  if (q.stamps.unlocked && !q.stamps.today_done) {
    if (await quietly(t, me, 'stamp_claim', { p_joker: false })) return 5
  }
  // open quests steer what an active player does next; the daily grading quest needs days, so it is rerolled
  const open = new Set([...q.mini, ...q.daily, ...q.weekly].filter((x) => !x.claimed && x.progress < x.target).map((x) => x.template))
  const slow = q.daily.find((x) => x.template === 'd_graded' && !x.claimed && x.progress < x.target)
  if (q.reroll_free && slow && (await quietly(t, me, 'quest_reroll', { p_quest: slow.id }))) return 5
  // 2. idle income: a finished shift, a half-full bunker
  const jobs = await t.rpc(me, 'jobs_get')
  if (jobs.shift?.done) {
    if (await quietly(t, me, 'shift_claim', {})) return 5
  }
  if (!jobs.shift && p.level >= jobs.unlock_shifts) {
    if (await quietly(t, me, 'shift_start', { p_job: bestShift(jobs, p.level), p_hours: 4 })) return 5
  }
  const bunker = await t.rpc(me, 'bunker_get')
  const bunkerQuest = ['bunker', 'd_bunker', 'w_bunker'].some((k) => open.has(k))
  if (bunker.unlocked && (bunker.content_cents ?? 0) > (bunkerQuest ? 0 : (bunker.rate_cents ?? 0) * (bunker.capacity_h ?? 0) * 0.5)) {
    if (await quietly(t, me, 'bunker_collect', {})) return 5
  }
  // 2a. the company (level 30): founding, staff, tools, prices, stages, decisions, VIP, taxes, payouts
  if (p.level >= 30) {
    const spent = await companyStep(t, me, p)
    if (spent) return spent
  }
  // 2b. quick quests: a snack, a pack battle against bots
  const shop = await t.rpc(me, 'shop_get')
  if (open.has('d_snack')) {
    const snack = shop.snacks.filter((x) => x.price_cents !== null && x.price_cents * 10 <= p.cash_cents).sort((a, b) => a.price_cents! - b.price_cents!)[0]
    if (snack && (await quietly(t, me, 'consumable_use', { p_key: snack.key }))) return 5
  }
  if (p.level >= 16 && (open.has('d_battle') || open.has('w_battles'))) {
    const b = await quietly(t, me, 'battle_create', { p_mode: 'klassisch', p_product: B, p_packs: 1, p_seats: 2 })
    if (b && (await quietly(t, me, 'battle_start', { p_battle: b.battle.id }))) return 120 // watching it
  }
  // 3. sealed boosters are opened at once
  if (p.sealed_total > 0) return 10 + 4 * (await openAll(t, me)) // bulk opening: a few seconds a pack
  // 4. cheapest affordable upgrade, if it costs less than a third of the cash
  if (p.level >= 5) {
    const ups = (await t.rpc(me, 'upgrades_get')).upgrades
      .filter((u) => u.cost_cents !== null && u.need_level <= p.level && u.cost_cents * (open.has('d_upgrade') || open.has('w_upgrade') ? 1 : 3) <= p.cash_cents)
      .sort((a, b) => a.cost_cents! - b.cost_cents!)
    if (ups[0]) {
      if (await quietly(t, me, 'upgrade_buy', { p_key: ups[0].key })) return 5
    }
  }
  // 4a. skill points are spent at once (income first: Unternehmer, then Sammler); a better home when it is cheap
  if (p.level >= 5 && p.skill_points >= 2) {
    const sk = await t.rpc(me, 'skills_get')
    const owned = new Set(sk.owned)
    const next = SKILLS.filter((s) => !owned.has(s.key) && s.requires.every((r) => owned.has(r)) && SKILL_COST[s.tier] <= sk.points)
      .sort((a, b) => BRANCH_ORDER.indexOf(a.branch) - BRANCH_ORDER.indexOf(b.branch) || a.tier - b.tier)[0]
    if (next && (await quietly(t, me, 'skill_learn', { p_key: next.key }))) return 5
  }
  if (p.level >= 20) {
    const h = await t.rpc(me, 'housing_get')
    const home = HOMES.find((x) => x.tier === h.tier + 1)
    const price = h.homes.find((x) => x.tier === h.tier + 1)?.price_cents ?? Infinity
    if (home && home.minLevel <= p.level && p.cash_cents >= price * 3 && (await quietly(t, me, 'home_buy', { p_tier: home.tier }))) return 10
  }
  // 4b. grading: reveal what is back, inspect new hits, send promising valuable ones (cash to spare)
  if (p.level >= 13) {
    const g = await t.rpc(me, 'grading_get')
    const now = Date.parse((await t.sql<{ n: string }>(`select private.now() as n`))[0]!.n)
    const due = g.orders.filter((o) => Date.parse(o.due_at) <= now).map((o) => o.id)
    if (due.length) {
      if (await quietly(t, me, 'grading_reveal', { p_orders: due })) return 15
    }
    const fresh = g.copies.find((c) => !c.ranges)
    if (fresh) {
      if (await quietly(t, me, 'grading_inspect', { p_copy: fresh.copy_id, p_card: null })) return 5
    }
    // every aspect could still be a 10: send it (PSA for valuable cards, CGC for the rest)
    const top = (c: (typeof g.copies)[number]) => ASPECTS.every((a) => c.ranges![a][1] === 10)
    const psa = g.graders.psa.fees_cents.economy
    const cgc = g.graders.cgc.fees_cents.economy
    const send = stopGrading
      ? undefined
      : (g.copies.find((c) => top(c) && (c.value_cents >= 2 * psa || c.value_cents * 2 >= cgc)) ??
        (open.has('w_graded') ? g.copies.find((c) => c.ranges && c.value_cents * 2 >= cgc) : undefined))
    if (send && g.used < g.slots && p.cash_cents >= 3 * psa) {
      if (await quietly(t, me, 'grading_submit', { p_copies: [send.copy_id], p_grader: send.value_cents >= 2 * psa ? 'psa' : 'cgc', p_service: 'economy' })) return 10
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
  // 5a. a licence for the next game once it is cheap compared to the cash (new cards, more boosters)
  if (p.level >= 10) {
    const lic = await t.rpc(me, 'licenses_get')
    const next = GAMES.find((g) => !lic.owned.includes(g))
    if (next && lic.owned.length < lic.allowed && lic.next_fee_cents !== null && lic.next_fee_cents * 3 <= p.cash_cents &&
        (await quietly(t, me, 'license_buy', { p_game: next }))) return 10
  }
  // 6. spare money goes into boosters: the kiosk first, then the stores
  for (const k of shop.kiosk.filter((x) => x.product_id.startsWith('booster-') && x.bought_today < x.daily_limit)) {
    const most = Math.min(k.daily_limit - k.bought_today, Math.floor(p.cash_cents / k.price_cents / 2))
    const qty = [10, 5, 1].find((n) => n <= most) // the kiosk sells 1, 5 or 10 at a time
    if (qty && (await quietly(t, me, 'store_buy', { p_product: k.product_id, p_qty: qty }))) return 5
  }
  for (const st of shop.stores.filter((x) => x.open)) {
    const o = st.offers.find((x) => x.product_id.startsWith('booster-') && (x.left ?? 0) > 0 && x.bought < x.limit && x.price_cents * 20 <= p.cash_cents)
    const qty = o ? Math.min(10, o.left ?? 0, o.limit - o.bought) : 0
    if (o && qty > 0 && (await quietly(t, me, 'retail_buy', { p_store: st.key, p_product: o.product_id, p_qty: qty }))) return 5
  }
  // 7. nothing to do: wait a minute
  return 60
}

/** Sterne go into perks: EP and wage first, then the bunker, the start money and luck. */
async function buyPerks(t: TestDb, me: string) {
  for (;;) {
    const pr = await t.rpc(me, 'prestige_get')
    const key = ['ep', 'lohn', 'zinsen', 'erbe', 'glueck', 'oma'].find((k) => {
      const cost = pr.perks[k]?.cost
      return cost != null && cost <= pr.stars
    })
    if (!key || !(await quietly(t, me, 'perk_buy', { p_key: key }))) return
  }
}

/** Opens every sealed booster; returns how many. */
async function openAll(t: TestDb, me: string) {
  const sealed = (await t.rpc(me, 'shop_get')).sealed
  let opened = 0
  for (const s of sealed) {
    let left = s.qty
    while (left > 0) {
      const n = Math.min(10, left)
      if (await quietly(t, me, 'pack_open', { p_product: s.product_id, p_qty: n })) opened += n
      left -= n
    }
  }
  // sell the duplicates of bulk cards, keep one of each
  for (const set of SETS) {
    const binder = await t.rpc(me, 'binder_get', { p_set: set })
    const stacks = binder.cards.filter((c) => c.copies.length === 0 && c.qty > 1).map((c) => ({ card_id: c.card_id, qty: c.qty - 1 }))
    if (stacks.length) await quietly(t, me, 'ankauf_sell', { p_stacks: JSON.stringify(stacks), p_copies: [] })
  }
  return opened
}

const STATIONS = ['annahme', 'pruefung', 'slabbing', 'versand'] as const

/** One company decision of a sensible owner. Returns the seconds it took, or 0 when there was nothing to do. */
let lastRuf = -1
async function companyStep(t: TestDb, me: string, p: { cash_cents: number }): Promise<number> {
  const before = (await t.rpc(me, 'me_get')).player!.ruf
  const d = await t.rpc(me, 'company_get')
  const co = d.company
  if (process.env.SIM_DEBUG && co && (co.ruf !== lastRuf)) {
    const now = (await t.sql<{ n: string }>(`select private.now() as n`))[0]!.n
    console.log(`${now} ruf ${before} -> ${co.ruf} acc ${co.accuracy} cap ${co.capacity} dem ${co.demand.total} backlog ${co.backlog} h ${co.demand.backlog_hours} paid ${co.paid}`)
    lastRuf = co.ruf
  }
  if (!co) {
    if (!d.founding) return (await quietly(t, me, 'company_found_step', { p_step: 'antrag' })) ? 10 : 0
    if (d.founding.step === 1) return (await quietly(t, me, 'company_found_step', { p_step: 'a38' })) ? 30 : 0
    if (p.cash_cents < d.found_cost_cents * 2) return 0
    return (await quietly(t, me, 'company_found', { p_name: 'Bot GmbH', p_slogan: '', p_label: { bg: 'blau', fg: 'weiss', emblem: '183c7effff7e3c18' } })) ? 30 : 0
  }
  const fixedPerHour = co.costs.wages + co.costs.rent + co.costs.power
  // keep a day of running costs in the company account
  if (co.cash_cents < fixedPerHour * 24 && p.cash_cents > fixedPerHour * 48) {
    if (await quietly(t, me, 'company_money', { p_cents: Math.round(fixedPerHour * 24), p_payout: false })) return 5
  }
  if (co.decision) {
    // an honest owner: no bribes, Ruf first, then money
    const def = DECISIONS.find((x) => x.key === co.decision!.key)
    const score = (e: DecisionEffect) => (e.ruf ?? 0) * 10 + (e.rufAccuracy ?? 0) * 5 + (e.cash ?? 0) / 10_000 - (e.bump ?? 0) * 100 - (e.downgrade ? 50 : 0) + (e.loyalty ?? 0)
    const choice = def ? def.choices.map((c, i) => [score(c.effect), i] as const).sort((a, b) => b[0] - a[0])[0]![1] : 0
    if (await quietly(t, me, 'company_decide', { p_decision: co.decision.id, p_choice: choice })) return 10
  }
  if (co.vip) {
    const r = co.vip.ranges
    const mid = (a: [number, number]) => Math.round((a[0] + a[1]) / 2)
    if (await quietly(t, me, 'company_vip_grade', { p_vip: co.vip.id, p_values: [mid(r.centering), mid(r.corners), mid(r.edges), mid(r.surface)] })) return 20
  }
  if (!co.tax.advisor) {
    if (co.cash_cents >= co.tax.advisor_cost_cents * 3) {
      if (await quietly(t, me, 'company_tax_advisor', {})) return 5
    }
    const now = Date.parse((await t.sql<{ n: string }>(`select private.now() as n`))[0]!.n)
    if (Date.parse(co.tax.due_at) - now < 86400_000) {
      const today = (await t.sql<{ d: string }>(`select private.today()::text as d`))[0]!.d
      const week = co.days.filter((x) => x.day < today).reduce((sum, x) => sum + x.revenue_cents, 0)
      if (co.tax.options.includes(week)) {
        if (await quietly(t, me, 'company_tax_file', { p_amount: week })) return 20
      }
    }
  }
  // fair prices
  const off = co.services.find((s) => {
    const x = co.demand.services[s]
    return x && Math.abs(x.price_cents - x.fair_cents) > x.fair_cents * 0.05
  })
  if (off) {
    if (await quietly(t, me, 'company_prices_set', { p_prices: Object.fromEntries(co.services.map((s) => [s, co.demand.services[s]!.fair_cents])) })) return 10
  }
  // people for the slowest station, accurate ones for the Prüfung
  const neck = STATIONS.reduce((a, b) => (co.caps[b] < co.caps[a] ? b : a))
  if (co.staff.length < co.staff_cap && co.applicants.length) {
    const station = co.accuracy < 88 ? 'pruefung' : neck
    const best = [...co.applicants].sort((a, b) => (station === 'pruefung' ? b.accuracy - a.accuracy : b.tempo - a.tempo))[0]!
    if (await quietly(t, me, 'company_hire', { p_applicant: best.id, p_station: station })) return 10
  }
  // a full team: someone moves from the station with the most room to the bottleneck
  if (co.staff.length >= co.staff_cap && !co.staff.some((x) => x.station === neck)) {
    // only from a station that keeps someone (moving its only worker just moves the bottleneck back and forth)
    const roomy = STATIONS.filter((s) => s !== neck && co.staff.filter((x) => x.station === s).length >= 2).sort((a, b) => co.caps[b] - co.caps[a])[0]
    const mover = roomy && co.staff.find((x) => x.station === roomy)
    if (mover && co.caps[roomy!] > co.caps[neck] * 1.5) {
      if (await quietly(t, me, 'company_staff_act', { p_staff: mover.id, p_action: 'move', p_arg: neck })) return 5
    }
  }
  // tools for the bottleneck, then stages, research, marketing
  const next = co.equipment_next[neck]
  // tools only help while customers wait; with too few customers the money goes into growth
  if (next && co.capacity < co.demand.total * 1.1 && co.cash_cents >= next.cost_cents * 1.5) {
    if (await quietly(t, me, 'company_equipment_buy', { p_station: neck })) return 5
  }
  if (co.next_stage && !co.stage_pending && co.cash_cents >= co.next_stage.cost_cents * 1.3) {
    if (await quietly(t, me, 'company_stage_up', {})) return 10
  }
  const research = Object.entries(co.research.costs).find(([k, c]) => !co.research.owned.includes(k) && co.stage >= co.research.stage && co.cash_cents >= c * 3)
  if (research) {
    if (await quietly(t, me, 'company_research', { p_key: research[0] })) return 5
  }
  const campaign = Object.entries(co.campaigns).filter(([, c]) => c.open && co.cash_cents >= c.cost_cents * 5).sort((a, b) => b[1].cost_cents - a[1].cost_cents)[0]
  if (!co.marketing && campaign && co.demand.total < co.capacity * 0.8) {
    if (await quietly(t, me, 'company_marketing', { p_key: campaign[0] })) return 5
  }
  // pay out what is beyond two days of costs and the next stage
  const keep = fixedPerHour * 48 + (co.next_stage?.cost_cents ?? 0) * 1.3
  if (co.cash_cents > keep * 1.5 && co.cash_cents - keep > 100_000) {
    if (await quietly(t, me, 'company_money', { p_cents: Math.round((co.cash_cents - keep) / 2), p_payout: true })) return 5
  }
  return 0
}
