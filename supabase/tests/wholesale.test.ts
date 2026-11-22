import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'schwarz', fg: 'gold', emblem: '183c7effff7e3c18' }
let t: TestDb
let me: string
let id: string
let company: number

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const act = <N extends Parameters<TestDb['rpc']>[1]>(fn: N, args: Record<string, unknown> = {}) => t.rpc(me, fn, { p_request_id: rid(), ...args })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Großhändler')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 40 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 9000000000, 'admin_grant')`, [id])
  await act('company_found_step', { p_step: 'antrag' })
  await t.advance('11 minutes')
  await act('company_found_step', { p_step: 'a38' })
  company = (await act('company_found', { p_name: 'Kistenkönig', p_slogan: '', p_label: LABEL })).company!.id
})

describe('Großhandel', () => {
  it('a weekly allocation of displays at the dealer price, delivered as a parcel', async () => {
    const doc = (await t.rpc(me, 'company_get')).company!
    expect(doc.wholesale.left).toBe(2)
    const d = doc.wholesale.displays[0]!
    expect(d.price_cents).toBe(Math.round(d.list_cents * 0.8))
    const cash = await num(`select cash_cents as v from game.players where id = $1`, [id])
    const res = await act('wholesale_buy', { p_product: d.product_id, p_qty: 2 })
    expect(res.company!.wholesale.left).toBe(0)
    expect(cash - (await num(`select cash_cents as v from game.players where id = $1`, [id]))).toBe(2 * d.price_cents)
    await expect(act('wholesale_buy', { p_product: d.product_id, p_qty: 1 })).rejects.toThrow('group_week_limit')
    await t.advance('61 minutes')
    await t.tick()
    expect(await num(`select qty as v from game.sealed where player_id = $1 and product_id = $2`, [id, d.product_id])).toBe(2)
    await t.sql(`update game.players set level = 39 where id = $1`, [id])
    await expect(act('wholesale_buy', { p_product: d.product_id, p_qty: 1 })).rejects.toThrow('locked')
    await t.assertLedgerMatches()
  })
})

describe('Research', () => {
  it('needs the UG, raises the brand, and the own Black Label goes on four 10s', async () => {
    await act('company_money', { p_cents: 8_000_000_000, p_payout: false })
    await expect(act('company_research', { p_key: 'uv' })).rejects.toThrow('locked')
    await t.sql(`update game.companies set stage = 3 where id = $1`, [company])
    const before = (await t.rpc(me, 'company_get')).company!.brand_bps
    const doc = await act('company_research', { p_key: 'uv' })
    expect(doc.company!.brand_bps).toBe(before + 300)
    expect(doc.company!.research.owned).toEqual(['uv'])
    await expect(act('company_research', { p_key: 'uv' })).rejects.toThrow('already_owned')
    await act('company_research', { p_key: 'blacklabel' })

    const copy = (
      await t.sql<{ id: string }>(
        `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
         values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), 10, 10, 10, 10, private.now()) returning id`,
        [id],
      )
    )[0]!.id
    const rolls = await t.sql<{ r: { grade: number; black_label: boolean } }>(
      `select private.grade_roll(c, 'co:' || $2) as r from game.card_copies c, generate_series(1, 30) where c.id = $1`,
      [copy, company],
    )
    const tens = rolls.filter((x) => x.r.grade === 10)
    expect(tens.length).toBeGreaterThan(0)
    expect(tens.every((x) => x.r.black_label)).toBe(true)
    expect(rolls.filter((x) => x.r.grade < 10).every((x) => !x.r.black_label)).toBe(true)
  })
})
