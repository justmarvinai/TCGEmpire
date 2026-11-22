import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let host: string
let fan: string
let idHost: string
let idFan: string
let display: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (id: string) => num(`select cash_cents as v from game.players where id = $1`, [id])
const cards = (id: string) =>
  num(`select (select count(*) from game.card_copies where owner_id = $1) + (select coalesce(sum(qty), 0) from game.card_stacks where player_id = $1) as v`, [id])
const sealed = (id: string) => num(`select coalesce(sum(qty), 0) as v from game.sealed where player_id = $1 and product_id = $2`, [id, display])
const band = async () => (await t.rpc(host, 'breaks_get')).displays[0]!
const create = (price: number) => t.rpc(host, 'break_create', { p_request_id: rid(), p_product: display, p_spot_cents: price })
const buy = (who: string, id: number, spot: number) => t.rpc(who, 'break_buy', { p_request_id: rid(), p_break: id, p_spot: spot })

beforeEach(async () => {
  t = await createTestDb()
  host = await t.player('Breaker')
  fan = await t.player('Spotkäufer')
  idHost = await t.playerId(host)
  idFan = await t.playerId(fan)
  display = (await t.sql<{ id: string }>(`select id from game.product_defs where kind = 'display' order by id limit 1`))[0]!.id
  for (const id of [idHost, idFan]) {
    await t.sql(`update game.players set level = 20 where id = $1`, [id])
    await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
  }
  await t.sql(`select private.sealed_add($1, $2, 1)`, [idHost, display])
})

describe('Box Breaks', () => {
  it('sells spots into escrow, pays the host at the start and gives every pack to its owner', async () => {
    const d = await band()
    expect(d.min_cents).toBeLessThan(d.booster_cents)
    await expect(create(d.max_cents + 1)).rejects.toThrow('invalid_request')
    const { break: br } = await create(d.booster_cents)
    expect(await sealed(idHost)).toBe(0) // the display is on the table
    const [cashHost, cashFan] = [await cash(idHost), await cash(idFan)]

    await buy(fan, br.id, 1)
    await buy(fan, br.id, 3)
    await expect(buy(fan, br.id, 3)).rejects.toThrow('spot_taken')
    await expect(buy(host, br.id, 2)).rejects.toThrow('invalid_request')
    await expect(buy(fan, br.id, br.packs + 1)).rejects.toThrow('invalid_request')
    expect(cashFan - (await cash(idFan))).toBe(2 * d.booster_cents)
    expect(await cash(idHost)).toBe(cashHost) // escrow until the start
    await expect(t.rpc(fan, 'break_start', { p_request_id: rid(), p_break: br.id })).rejects.toThrow('forbidden')

    const started = (await t.rpc(host, 'break_start', { p_request_id: rid(), p_break: br.id })).break
    expect(started).toMatchObject({ state: 'running', round: 0, pulls: [], sold: 2 })
    expect((await cash(idHost)) - cashHost).toBe(2 * d.booster_cents)
    await t.advance('4 seconds')
    const first = await t.rpc(fan, 'break_get', { p_break: br.id })
    expect(first.round).toBe(1)
    expect(first.pulls.every((p) => p.spot === 1)).toBe(true)

    const perPack = first.pulls.length
    await t.advance(`${br.packs * 3 + 5} seconds`)
    await t.tick()
    expect((await t.rpc(host, 'break_get', { p_break: br.id })).state).toBe('done')
    expect(await cards(idFan)).toBe(2 * perPack)
    expect(await cards(idHost)).toBe((br.packs - 2) * perPack)
    expect(await t.sql(`select player_id from game.notifications where kind = 'break_done' order by player_id`)).toHaveLength(2)
    await t.assertLedgerMatches()
  })

  it('the host calling it off refunds every spot and gives the display back; old breaks are called off by the tick', async () => {
    const d = await band()
    const before = await cash(idFan)
    const { break: br } = await create(d.min_cents)
    await buy(fan, br.id, 5)
    await expect(t.rpc(fan, 'break_cancel', { p_request_id: rid(), p_break: br.id })).rejects.toThrow('forbidden')
    await t.rpc(host, 'break_cancel', { p_request_id: rid(), p_break: br.id })
    expect(await cash(idFan)).toBe(before)
    expect(await sealed(idHost)).toBe(1)
    await expect(buy(fan, br.id, 6)).rejects.toThrow('not_found')

    const old = (await create(d.min_cents)).break
    await buy(fan, old.id, 1)
    await t.advance('25 hours')
    await t.tick()
    expect((await t.rpc(host, 'break_get', { p_break: old.id })).state).toBe('cancelled')
    expect(await cash(idFan)).toBe(before)
    expect(await sealed(idHost)).toBe(1)
    await t.assertLedgerMatches()
  })

  it('needs the level and a display; emotes work', async () => {
    await t.sql(`update game.players set level = 17 where id = $1`, [idFan])
    await expect(t.rpc(fan, 'break_create', { p_request_id: rid(), p_product: display, p_spot_cents: 100 })).rejects.toThrow('locked')
    const d = await band()
    await create(d.booster_cents)
    await expect(create(d.booster_cents)).rejects.toThrow('not_enough_sealed')
    const id = (await t.rpc(host, 'breaks_get')).open[0]!.id
    await t.rpc(fan, 'break_emote_send', { p_request_id: rid(), p_break: id, p_emote: '👀' })
    expect((await t.rpc(host, 'break_get', { p_break: id })).emotes).toEqual([expect.objectContaining({ name: 'Spotkäufer', emote: '👀' })])
  })
})
