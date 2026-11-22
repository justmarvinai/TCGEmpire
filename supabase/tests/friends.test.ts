import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let a: string
let b: string
let idA: string
let idB: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (id: string) => num(`select cash_cents as v from game.players where id = $1`, [id])
const epoch = async (q: string, params: unknown[] = []) => num(`select extract(epoch from (${q})) as v`, params)
const act = (who: string, target: string, kind: string) => t.rpc(who, 'friend_act', { p_request_id: rid(), p_target: target, p_kind: kind })

beforeEach(async () => {
  t = await createTestDb()
  a = await t.player('Helfer')
  b = await t.player('Faulpelz')
  idA = await t.playerId(a)
  idB = await t.playerId(b)
  for (const id of [idA, idB]) {
    await t.sql(`update game.players set level = 20 where id = $1`, [id])
    await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
  }
})

describe('Aushelfen und Kaffee und Kuchen', () => {
  it('takes time off the friend’s grading and shift, pays both a little, once per day', async () => {
    const copy = (
      await t.sql<{ id: string }>(
        `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
         values ($1, (select id from game.card_defs where tier = 'holo' limit 1), 9, 9, 9, 9, private.now()) returning id`,
        [idB],
      )
    )[0]!.id
    await t.sql(
      `insert into game.grading_orders (player_id, copy_id, grader, service, fee_cents, submitted_at, due_at)
       values ($1, $2, 'psa', 'economy', 100, private.now(), private.now() + interval '4 hours')`,
      [idB, copy],
    )
    await t.sql(
      `insert into game.shifts (player_id, job, started_at, ends_at)
       values ($1, (select key from game.job_defs order by key limit 1), private.now(), private.now() + interval '2 hours')`,
      [idB],
    )
    const [cashA, cashB, epB] = [await cash(idA), await cash(idB), await num(`select ep as v from game.players where id = $1`, [idB])]

    const res = await act(a, idB, 'aushelfen')
    expect(res.minutes).toBe(60)
    expect(await epoch(`(select due_at from game.grading_orders where player_id = $1) - private.now()`, [idB])).toBeCloseTo(3 * 3600, -1)
    // the whole shift moves: 30 minutes (a quarter of two hours) earlier, its length stays
    expect(await epoch(`(select ends_at from game.shifts where player_id = $1) - private.now()`, [idB])).toBeCloseTo(90 * 60, -1)
    expect(await epoch(`(select ends_at - started_at from game.shifts where player_id = $1)`, [idB])).toBe(2 * 3600)
    expect(res.reward_cents).toBeGreaterThan(0)
    expect((await cash(idA)) - cashA).toBe(res.reward_cents)
    expect((await cash(idB)) - cashB).toBeGreaterThan(0)
    expect(await num(`select ep as v from game.players where id = $1`, [idB])).toBeGreaterThan(epB)
    expect(await t.sql(`select data ->> 'name' as n from game.notifications where player_id = $1 and kind = 'helped'`, [idB])).toEqual([{ n: 'Helfer' }])

    await expect(act(a, idB, 'aushelfen')).rejects.toThrow('already_done')
    await expect(act(a, idA, 'aushelfen')).rejects.toThrow('invalid_request')
    expect((await act(b, idA, 'aushelfen')).minutes).toBe(0) // nothing running at A: the reward still comes
    await t.advance('1 day')
    await act(a, idB, 'aushelfen')
    expect((await t.rpc(a, 'players_get')).friends.done[idB]).toEqual(['aushelfen'])
    await t.assertLedgerMatches()
  })

  it('Kaffee und Kuchen gives both a short EP buff', async () => {
    await act(b, idA, 'kaffee')
    for (const who of [a, b]) {
      const me = await t.rpc(who, 'me_get')
      expect(me.player!.buffs.map((x) => x.key)).toContain('kuchen')
    }
    expect(await num(`select private.stat($1, 'ep', 1) as v`, [idA])).toBeCloseTo(1.1)
    await expect(act(b, idA, 'kaffee')).rejects.toThrow('already_done')
    await t.advance('3 hours')
    expect(await num(`select private.stat($1, 'ep', 1) as v`, [idA])).toBeCloseTo(1)
  })

  it('is locked below its level', async () => {
    await t.sql(`update game.players set level = 6 where id = $1`, [idA])
    await expect(act(a, idB, 'kaffee')).rejects.toThrow('locked')
  })
})

describe('Sammelbestellung', () => {
  const display = async () =>
    (
      await t.sql<{ id: string }>(
        `select d.id from game.product_defs d join game.set_defs s on s.id = d.set_id
         where d.kind = 'display' and s.phase in ('print', 'last_wave') order by d.id limit 1`,
      )
    )[0]!.id
  const sealed = (id: string, product: string) => num(`select coalesce(sum(qty), 0) as v from game.sealed where player_id = $1 and product_id = $2`, [id, product])

  it('two friends fill a case at the wholesale price and both get a parcel', async () => {
    const product = await display()
    const list = await num(`select private.eur(price_base_cents) as v from game.product_defs where id = $1`, [product])
    const [cashA, cashB] = [await cash(idA), await cash(idB)]
    await expect(t.rpc(a, 'group_order_create', { p_request_id: rid(), p_product: product, p_shares: 6 })).rejects.toThrow('group_alone')
    const created = await t.rpc(a, 'group_order_create', { p_request_id: rid(), p_product: product, p_shares: 4 })
    const order = created.orders.open[0]!
    expect(order).toMatchObject({ taken: 4, mine: 4, state: 'open' })
    expect(order.unit_cents).toBe(Math.round((list * 95) / 100))
    expect(cashA - (await cash(idA))).toBe(4 * order.unit_cents)
    await expect(t.rpc(b, 'group_order_join', { p_request_id: rid(), p_order: order.id, p_shares: 3 })).rejects.toThrow('invalid_request')

    const done = await t.rpc(b, 'group_order_join', { p_request_id: rid(), p_order: order.id, p_shares: 2 })
    expect(done.orders.open).toHaveLength(0)
    expect(done.orders.recent[0]).toMatchObject({ state: 'done', taken: 6, mine: 2 })
    expect(cashB - (await cash(idB))).toBe(2 * order.unit_cents)
    expect(await sealed(idA, product)).toBe(0) // still on the way
    await t.advance('61 minutes')
    await t.tick()
    expect(await sealed(idA, product)).toBe(4)
    expect(await sealed(idB, product)).toBe(2)
    // six shares per week at most
    expect((await t.rpc(a, 'group_orders_get')).shares_left).toBe(2)
    await expect(t.rpc(a, 'group_order_create', { p_request_id: rid(), p_product: product, p_shares: 3 })).rejects.toThrow('group_week_limit')
    await t.assertLedgerMatches()
  })

  it('leaving refunds, the host leaving cancels, an unfilled order expires', async () => {
    const product = await display()
    const before = [await cash(idA), await cash(idB)]
    const order = (await t.rpc(a, 'group_order_create', { p_request_id: rid(), p_product: product, p_shares: 2 })).orders.open[0]!
    await t.rpc(b, 'group_order_join', { p_request_id: rid(), p_order: order.id, p_shares: 1 })
    const leave = { p_request_id: rid(), p_order: order.id }
    await t.rpc(b, 'group_order_leave', leave)
    await t.rpc(b, 'group_order_leave', leave) // replay
    expect(await cash(idB)).toBe(before[1])
    await t.rpc(b, 'group_order_join', { p_request_id: rid(), p_order: order.id, p_shares: 1 })
    await t.rpc(a, 'group_order_leave', { p_request_id: rid(), p_order: order.id })
    expect([await cash(idA), await cash(idB)]).toEqual(before)
    await expect(t.rpc(b, 'group_order_join', { p_request_id: rid(), p_order: order.id, p_shares: 1 })).rejects.toThrow('not_found')

    await t.rpc(a, 'group_order_create', { p_request_id: rid(), p_product: product, p_shares: 1 })
    await t.advance('49 hours')
    await t.tick()
    expect((await t.rpc(a, 'group_orders_get')).open).toHaveLength(0)
    expect(await cash(idA)).toBe(before[0])
    await t.assertLedgerMatches()
  })
})
