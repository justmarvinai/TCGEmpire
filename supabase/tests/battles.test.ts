import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const BOOSTER = 'booster-pkm-base'
let t: TestDb
let a: string
let b: string
let idA: string
let idB: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (id: string) => num(`select cash_cents as v from game.players where id = $1`, [id])
const cards = (id: string) =>
  num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [id])
const create = (who: string, mode: string, packs = 2, seats = 2, product = BOOSTER) =>
  t.rpc(who, 'battle_create', { p_request_id: rid(), p_mode: mode, p_product: product, p_packs: packs, p_seats: seats })
const join = (who: string, battle: number) => t.rpc(who, 'battle_join', { p_request_id: rid(), p_battle: battle })
const start = (who: string, battle: number) => t.rpc(who, 'battle_start', { p_request_id: rid(), p_battle: battle })
const get = (who: string, battle: number) => t.rpc(who, 'battle_get', { p_battle: battle })
const pulls = (battle: number) => num(`select count(*) as v from game.battle_pulls where battle_id = $1`, [battle])

beforeEach(async () => {
  t = await createTestDb()
  a = await t.player('Zocker')
  b = await t.player('Pechvogel')
  idA = await t.playerId(a)
  idB = await t.playerId(b)
  for (const id of [idA, idB]) {
    await t.sql(`update game.players set level = 16 where id = $1`, [id])
    await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
  }
})

describe('Pack Battles', () => {
  it('both pay the same stake, the table starts when full and reveals round by round, the winner takes all', async () => {
    const stake = 2 * (await num(`select private.product_value($1) as v`, [BOOSTER]))
    const [cashA, cashB, cardsA, cardsB] = [await cash(idA), await cash(idB), await cards(idA), await cards(idB)]
    const { battle } = await create(a, 'klassisch')
    expect(battle).toMatchObject({ state: 'open', stake_cents: stake, round: 0, pulls: [] })
    expect(cashA - (await cash(idA))).toBe(stake)
    await expect(join(a, battle.id)).rejects.toThrow('already_owned')

    const joined = (await join(b, battle.id)).battle
    expect(cashB - (await cash(idB))).toBe(stake)
    expect(joined.state).toBe('running')
    // Nothing is shown before the first round, the result not before the end.
    expect(joined.round).toBe(0)
    expect(joined.pulls).toEqual([])
    expect(joined.result).toBeNull()
    expect(joined.players.map((p: { shown_cents: number }) => p.shown_cents)).toEqual([0, 0])
    const total = await pulls(battle.id)
    expect(total).toBeGreaterThan(0)

    await t.advance('5 seconds')
    const r1 = await get(b, battle.id)
    expect(r1.round).toBe(1)
    expect(r1.pulls.length).toBe(total / 2)
    expect(r1.pulls.every((p: { round: number }) => p.round === 1)).toBe(true)
    expect(r1.result).toBeNull()

    await t.advance('12 seconds')
    const end = await get(b, battle.id)
    expect(end.state).toBe('done')
    expect(end.pulls.length).toBe(total)
    const totals = end.result!.totals as Record<string, number>
    const winner = Number(end.result!.winners[0])
    expect(totals[String(winner)]).toBe(Math.max(...Object.values(totals)))
    const winnerId = winner === 1 ? idA : idB
    const loserId = winner === 1 ? idB : idA
    expect((await cards(winnerId)) - (winner === 1 ? cardsA : cardsB)).toBe(total)
    expect((await cards(loserId)) - (winner === 1 ? cardsB : cardsA)).toBe(0)
    expect(await t.sql(`select data ->> 'won' as won from game.notifications where kind = 'battle_done' order by player_id = $1 desc`, [winnerId]))
      .toEqual([{ won: 'true' }, { won: 'false' }])
    // Settling twice gives nothing twice.
    await t.tick()
    await get(a, battle.id)
    expect((await cards(winnerId)) - (winner === 1 ? cardsA : cardsB)).toBe(total)
    await t.assertLedgerMatches()
  })

  it('the host starts with bots in the empty seats; bots pay nothing and their winnings leave the world', async () => {
    const { battle } = await create(a, 'klassisch', 1, 4)
    await expect(start(b, battle.id)).rejects.toThrow('forbidden')
    const started = (await start(a, battle.id)).battle
    expect(started.players).toHaveLength(4)
    expect(started.players.filter((p: { bot: boolean }) => p.bot)).toHaveLength(3)
    expect(await num(`select coalesce(sum(paid_cents), 0) as v from game.battle_seats where battle_id = $1 and npc_id is not null`, [battle.id])).toBe(0)
    await t.advance('1 minute')
    await t.tick()
    const end = await get(a, battle.id)
    expect(end.state).toBe('done')
    const mine = await cards(idA)
    expect(mine).toBe(Number(end.result!.winners[0]) === 1 ? await pulls(battle.id) : 0)
    await t.assertLedgerMatches()
  })

  it('Krepel, Top-Karte, Team and Freundschaftsspiel decide by their own rule', async () => {
    const run = async (mode: string, seats: number) => {
      const { battle } = await create(a, mode, 2, seats)
      if (seats === 2) await join(b, battle.id)
      else await start(a, battle.id)
      await t.advance('1 minute')
      return get(a, battle.id)
    }
    const krepel = await run('krepel', 2)
    const kt = krepel.result!.totals as Record<string, number>
    expect(kt[String(krepel.result!.winners[0])]).toBe(Math.min(...Object.values(kt)))

    const top = await run('top', 2)
    const best = Math.max(...top.pulls.map((p: { value_cents: number }) => p.value_cents))
    expect(top.pulls.filter((p: { seat: number; value_cents: number }) => p.seat === Number(top.result!.winners[0]) && p.value_cents === best).length)
      .toBeGreaterThan(0)

    const team = await run('team', 4)
    const tt = team.result!.totals as Record<string, number>
    const left = tt['1']! + tt['3']!
    const right = tt['2']! + tt['4']!
    expect(team.result!.winners).toEqual(left > right ? [1, 3] : left < right ? [2, 4] : team.result!.winners)

    const before = [await cards(idA), await cards(idB)]
    const friendly = await run('freundschaft', 2)
    expect(friendly.result!.winners).toEqual([])
    const own = (seat: number) => friendly.pulls.filter((p: { seat: number }) => p.seat === seat).length
    expect((await cards(idA)) - before[0]!).toBe(own(1))
    expect((await cards(idB)) - before[1]!).toBe(own(2))
    await t.assertLedgerMatches()
  })

  it('leaving refunds, the host leaving cancels for everybody, an old lobby is cancelled by the tick', async () => {
    const before = [await cash(idA), await cash(idB)]
    const { battle } = await create(a, 'jackpot', 1, 3)
    await join(b, battle.id)
    const leave = { p_request_id: rid(), p_battle: battle.id }
    await t.rpc(b, 'battle_leave', leave)
    expect(await t.rpc(b, 'battle_leave', leave)).toBeTruthy() // replay
    expect(await cash(idB)).toBe(before[1])
    await expect(t.rpc(b, 'battle_leave', { p_request_id: rid(), p_battle: battle.id })).rejects.toThrow('not_found')

    await join(b, battle.id)
    await t.rpc(a, 'battle_leave', { p_request_id: rid(), p_battle: battle.id })
    expect([await cash(idA), await cash(idB)]).toEqual(before)
    await expect(join(b, battle.id)).rejects.toThrow('not_found')

    const old = (await create(a, 'klassisch', 1, 2)).battle
    await t.advance('25 hours')
    await t.tick()
    expect((await get(a, old.id)).state).toBe('cancelled')
    expect(await cash(idA)).toBe(before[0])
    await t.assertLedgerMatches()
  })

  it('checks level, mode, seats, product and emotes', async () => {
    await t.sql(`update game.players set level = 15 where id = $1`, [idB])
    await expect(create(b, 'klassisch')).rejects.toThrow('locked')
    await expect(create(a, 'team', 1, 3)).rejects.toThrow('invalid_request')
    await expect(create(a, 'roulette')).rejects.toThrow('invalid_request')
    await expect(create(a, 'klassisch', 11)).rejects.toThrow('invalid_request')
    await expect(create(a, 'klassisch', 1, 5)).rejects.toThrow('invalid_request')
    const display = await t.sql<{ id: string }>(`select id from game.product_defs where kind <> 'booster' limit 1`)
    await expect(create(a, 'klassisch', 1, 2, display[0]!.id)).rejects.toThrow('invalid_request')

    const { battle } = await create(a, 'klassisch')
    await t.rpc(b, 'emote_send', { p_request_id: rid(), p_battle: battle.id, p_emote: '🔥' })
    await expect(t.rpc(b, 'emote_send', { p_request_id: rid(), p_battle: battle.id, p_emote: 'lol' })).rejects.toThrow('invalid_request')
    const doc = await get(a, battle.id)
    expect(doc.emotes).toEqual([expect.objectContaining({ name: 'Pechvogel', emote: '🔥' })])
  })
})
