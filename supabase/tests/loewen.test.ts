import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'rot', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Gründerin')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 60 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 500000000, 'admin_grant')`, [id])
})

describe('Höhle der Löwen', () => {
  it('once a week three offers; a deal brings cash for a share that lowers the value and takes its cut of payouts', async () => {
    await expect(t.rpc(me, 'loewen_pitch', { p_request_id: rid() })).rejects.toThrow('no_own_company')
    await t.rpc(me, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
    await t.advance('11 minutes')
    await t.rpc(me, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
    await t.rpc(me, 'company_found', { p_request_id: rid(), p_name: 'Löwenzahn AG', p_slogan: '', p_label: LABEL })
    await t.rpc(me, 'company_money', { p_request_id: rid(), p_cents: 10_000_000, p_payout: false })
    const pitch = await t.rpc(me, 'loewen_pitch', { p_request_id: rid() })
    expect(pitch.pitch!.offers).toHaveLength(3)
    expect(new Set(pitch.pitch!.offers.map((o) => o.lion)).size).toBe(3)
    await expect(t.rpc(me, 'loewen_pitch', { p_request_id: rid() })).rejects.toThrow('already_done')

    const offer = pitch.pitch!.offers[0]!
    const cash = await num(`select cash_cents as v from game.companies where owner_id = $1`, [id])
    const deal = await t.rpc(me, 'loewen_deal', { p_request_id: rid(), p_offer: 0 })
    expect(deal.investor_pct).toBe(offer.share_pct)
    expect(deal.pitch!.chosen).toBe(0)
    expect(await num(`select cash_cents as v from game.companies where owner_id = $1`, [id])).toBe(cash + offer.cents)
    expect(deal.value_cents).toBeLessThan(cash + offer.cents)
    await expect(t.rpc(me, 'loewen_deal', { p_request_id: rid(), p_offer: 1 })).rejects.toThrow('not_found')

    const before = await num(`select cash_cents as v from game.players where id = $1`, [id])
    await t.rpc(me, 'company_money', { p_request_id: rid(), p_cents: 1_000_000, p_payout: true })
    const net = 1_000_000 - (1_000_000 * offer.share_pct) / 100
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBe(before + Math.round(net - (net * 25) / 100))
    await t.advance('7 days')
    expect((await t.rpc(me, 'loewen_get')).pitch).toBeNull()
    await t.assertLedgerMatches()
  })
})
