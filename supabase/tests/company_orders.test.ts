import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'gruen', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let boss: string
let fan: string
let idBoss: string
let idFan: string
let company: number

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const companyCash = () => num(`select cash_cents as v from game.companies where id = $1`, [company])

async function holo(owner: string, q = [9, 9, 9, 9]) {
  return (
    await t.sql<{ id: string }>(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), $2, $3, $4, $5, private.now()) returning id`,
      [owner, ...q],
    )
  )[0]!.id
}

beforeEach(async () => {
  t = await createTestDb()
  boss = await t.player('Firmenchef')
  fan = await t.player('Kunde')
  idBoss = await t.playerId(boss)
  idFan = await t.playerId(fan)
  for (const id of [idBoss, idFan]) {
    await t.sql(`update game.players set level = 30 where id = $1`, [id])
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
  }
  await t.rpc(boss, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
  await t.advance('11 minutes')
  await t.rpc(boss, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
  company = (await t.rpc(boss, 'company_found', { p_request_id: rid(), p_name: 'Slabwerk', p_slogan: '', p_label: LABEL })).company!.id
})

describe('Orders from players', () => {
  it('a friend pays the company, waits, and gets a slab with its label and brand', async () => {
    const list = await t.rpc(fan, 'companies_list')
    expect(list).toEqual([expect.objectContaining({ id: company, name: 'Slabwerk', owner: 'Firmenchef' })])
    expect(await t.rpc(boss, 'companies_list')).toEqual([]) // not your own
    const copy = await holo(idFan)
    const fee = list[0]!.services[0]!.fee_cents
    const before = await companyCash()
    const sent = await t.rpc(fan, 'company_order_submit', { p_request_id: rid(), p_copies: [copy], p_company: company, p_service: 'economy' })
    expect(sent.fee_cents).toBe(fee)
    expect((await companyCash()) - before).toBe(fee)
    const order = sent.grading.orders[0]!
    expect(order.grader).toBe(`co:${company}`)
    expect((Date.parse(order.due_at) - Date.parse(order.submitted_at)) / 60000).toBeGreaterThanOrEqual(360)
    expect(await t.sql(`select data ->> 'name' as n from game.notifications where player_id = $1 and kind = 'company_order'`, [idBoss])).toEqual([{ n: 'Kunde' }])
    expect((await t.rpc(boss, 'company_get')).company!.player_orders).toEqual([expect.objectContaining({ customer: 'Kunde', service: 'economy' })])

    await expect(t.rpc(fan, 'company_order_submit', { p_request_id: rid(), p_copies: [await holo(idFan)], p_company: company, p_service: 'express' }))
      .rejects.toThrow('invalid_request') // Express comes with the UG
    await expect(t.rpc(boss, 'company_order_submit', { p_request_id: rid(), p_copies: [await holo(idBoss)], p_company: company, p_service: 'economy' }))
      .rejects.toThrow('invalid_request')

    await t.advance('7 hours')
    const res = await t.rpc(fan, 'grading_reveal', { p_request_id: rid(), p_orders: [order.id] })
    const slab = res.results[0]!.slab
    expect(slab).toMatchObject({ grader: `co:${company}`, company: { id: company, name: 'Slabwerk', label: LABEL } })
    expect(slab.cert_no).toMatch(new RegExp(`^${company}-\\d{7}$`))
    expect([8, 9, 10]).toContain(slab.grade)
    // the same grade at PSA is worth more than at a fresh company
    const psa = await num(`select private.slab_value(card_id, 'psa', $2, false) as v from game.card_copies where id = $1`, [copy, slab.grade])
    expect(res.results[0]!.value_cents).toBeLessThan(psa)
    await t.assertLedgerMatches()
  })

  it('a Gefälligkeitsgutachten adds a grade; a closed company keeps the lowest brand', async () => {
    const copy = await holo(idFan, [7, 7, 7, 7])
    const sent = await t.rpc(fan, 'company_order_submit', { p_request_id: rid(), p_copies: [copy], p_company: company, p_service: 'economy' })
    await t.sql(`update game.grading_orders set bumped = true where id = $1`, [sent.grading.orders[0]!.id])
    await t.sql(`update game.players set ruf = 1000 where id = $1`, [idBoss]) // the top brand, so the closed company falls far
    await t.advance('7 hours')
    const res = await t.rpc(fan, 'grading_reveal', { p_request_id: rid(), p_orders: [sent.grading.orders[0]!.id] })
    expect([7, 8, 9]).toContain(res.results[0]!.slab.grade) // 7, one up for the favour, sometimes one off
    const high = res.results[0]!.value_cents
    await t.sql(`update game.players set reset_at = now() where id = $1`, [idBoss])
    const low = await num(`select private.copy_value($1) as v`, [copy])
    expect(low).toBeLessThan(high)
  })
})

describe('VIP orders', () => {
  const vip = async (q = [8, 9, 7, 10]) =>
    (
      await t.sql<{ id: string }>(
        `insert into game.company_vip (company_id, card_id, q, width, fee_cents, created_at, expires_at)
         values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), $2, 3, 100000, private.now(), private.now() + interval '3 hours')
         returning id`,
        [company, q],
      )
    )[0]!.id

  it('the owner judges the four values: exact pays everything and Ruf, far off pays nothing', async () => {
    const id = await vip()
    const doc = await t.rpc(boss, 'company_get')
    expect(doc.company!.vip).toMatchObject({ id, width: 3, fee_cents: 100000 })
    for (const a of ['centering', 'corners', 'edges', 'surface'] as const) {
      const [lo, hi] = doc.company!.vip!.ranges[a]
      expect(hi - lo).toBe(3)
    }
    const ruf = await num(`select ruf as v from game.players where id = $1`, [idBoss])
    const before = await num(`select cash_cents as v from game.companies where id = $1`, [company])
    const exact = await t.rpc(boss, 'company_vip_grade', { p_request_id: rid(), p_vip: id, p_values: [8, 9, 7, 10] })
    expect(exact.result).toMatchObject({ error: 0, paid_cents: 100000, ruf: 5 })
    expect((await companyCash()) - before).toBe(100000)
    expect(await num(`select ruf as v from game.players where id = $1`, [idBoss])).toBe(ruf + 5)
    await expect(t.rpc(boss, 'company_vip_grade', { p_request_id: rid(), p_vip: id, p_values: [8, 9, 7, 10] })).rejects.toThrow('not_found')

    const far = await t.rpc(boss, 'company_vip_grade', { p_request_id: rid(), p_vip: await vip(), p_values: [1, 1, 1, 1] })
    expect(far.result).toMatchObject({ paid_cents: 0, ruf: -3 })
    await expect(t.rpc(boss, 'company_vip_grade', { p_request_id: rid(), p_vip: await vip(), p_values: [1, 2, 3] })).rejects.toThrow('invalid_request')
    await expect(t.rpc(fan, 'company_vip_grade', { p_request_id: rid(), p_vip: await vip(), p_values: [1, 2, 3, 4] })).rejects.toThrow('not_found')
  })

  it('VIP customers show up now and then and leave after a while', async () => {
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('company.vip_per_hour', '100', now())`)
    await t.advance('20 minutes')
    await t.tick()
    expect((await t.rpc(boss, 'company_get')).company!.vip).not.toBeNull()
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('company.vip_per_hour', '0', now()) on conflict (key) do update set value = excluded.value`)
    await t.advance('4 hours')
    expect((await t.rpc(boss, 'company_get')).company!.vip).toBeNull()
  })
})
