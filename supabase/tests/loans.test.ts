import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
let t: TestDb
let bank: string
let debtor: string
let idBank: string
let idDebtor: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const cash = (id: string) => num(`select cash_cents as v from game.players where id = $1`, [id])
const worth = (id: string) => num(`select private.net_worth($1) as v`, [id])
const offer = (cents: number, pct = 10, days = 3, from = bank, to = idDebtor) =>
  t.rpc(from, 'loan_offer', { p_request_id: rid(), p_to: to, p_cents: cents, p_interest_pct: pct, p_days: days })
const respond = (loan: number, accept: boolean) => t.rpc(debtor, 'loan_respond', { p_request_id: rid(), p_loan: loan, p_accept: accept })

beforeEach(async () => {
  t = await createTestDb()
  bank = await t.player('Kredithai')
  debtor = await t.player('Pleitegeier')
  idBank = await t.playerId(bank)
  idDebtor = await t.playerId(debtor)
  for (const id of [idBank, idDebtor]) await t.sql(`update game.players set level = 12 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [idBank])
})

describe('Privatkredit', () => {
  it('offer, accept, repay with interest: a kept deal; net worth counts the open loan', async () => {
    const [bankBefore, debtorBefore] = [await cash(idBank), await cash(idDebtor)]
    const [worthBank, worthDebtor] = [await worth(idBank), await worth(idDebtor)]
    const loan = (await offer(100_000)).loans.loans[0]!
    expect(loan).toMatchObject({ state: 'offered', role: 'lender', due_cents: 110_000 })
    expect(await cash(idBank)).toBe(bankBefore) // nothing moves before the answer

    const accepted = await respond(loan.id, true)
    expect(accepted.loans.loans[0]).toMatchObject({ state: 'active', role: 'borrower' })
    expect(bankBefore - (await cash(idBank))).toBe(100_000)
    expect((await cash(idDebtor)) - debtorBefore).toBe(100_000)
    // a loan is no gain and no loss
    expect(await worth(idBank)).toBe(worthBank)
    expect(await worth(idDebtor)).toBe(worthDebtor)

    await t.sql(`select private.money_add($1, 10000, 'admin_grant')`, [idDebtor])
    const repaid = await t.rpc(debtor, 'loan_repay', { p_request_id: rid(), p_loan: loan.id })
    expect(repaid.loans.loans[0]).toMatchObject({ state: 'repaid' })
    expect((await cash(idBank)) - bankBefore).toBe(10_000)
    expect(repaid.loans.honor).toMatchObject({ kept: 1, broken: 0 })
    expect(await t.sql(`select kind from game.notifications where player_id = $1 and kind like 'loan_%' order by id`, [idBank]))
      .toEqual([{ kind: 'loan_accepted' }, { kind: 'loan_repaid' }])
    await t.assertLedgerMatches()
  })

  it('collects on the due date when the money is there, otherwise the loan bursts', async () => {
    const first = (await offer(50_000, 0, 1)).loans.loans[0]!
    await respond(first.id, true)
    await t.advance('20 hours')
    await t.tick()
    expect(await t.sql(`select 1 from game.notifications where player_id = $1 and kind = 'loan_due'`, [idDebtor])).toHaveLength(1)
    await t.advance('5 hours')
    await t.tick()
    expect((await t.rpc(bank, 'loans_get')).loans.find((l) => l.id === first.id)!.state).toBe('repaid')

    const second = (await offer(80_000, 20, 2)).loans.loans.find((l) => l.state === 'offered')!
    await respond(second.id, true)
    await t.sql(`select private.money_add($1, -(select cash_cents from game.players where id = $1), 'test')`, [idDebtor])
    const [bankBefore, rufBefore] = [await cash(idBank), await num(`select ruf as v from game.players where id = $1`, [idDebtor])]
    await t.advance('49 hours')
    await t.tick()
    const doc = await t.rpc(debtor, 'loans_get')
    expect(doc.loans.find((l) => l.id === second.id)!.state).toBe('defaulted')
    expect(doc.honor).toMatchObject({ kept: 1, broken: 1, title: 'schlitzohr' })
    expect(doc.honor.schufa_until).not.toBeNull()
    expect(await cash(idBank)).toBe(bankBefore)
    expect(await num(`select ruf as v from game.players where id = $1`, [idDebtor])).toBe(rufBefore - 100)
    expect(await t.sql(`select 1 from game.feed where kind = 'loan_defaulted'`)).toHaveLength(1)
    // Schufa: no new loans
    await expect(offer(20_000)).rejects.toThrow('schufa')
    expect((await t.rpc(bank, 'profile_get', { p_player: idDebtor })).honor.title).toBe('schlitzohr')
    await t.assertLedgerMatches()
  })

  it('declining, withdrawing and the rules', async () => {
    await expect(offer(100)).rejects.toThrow('invalid_request') // below the smallest loan
    await expect(offer(100_000, 31)).rejects.toThrow('invalid_request')
    await expect(offer(100_000, 10, 15)).rejects.toThrow('invalid_request')
    await expect(offer(100_000, 10, 3, bank, idBank)).rejects.toThrow('invalid_request')
    await expect(offer(100_000, 10, 3, debtor, idBank)).rejects.toThrow('not_enough_money')
    await t.sql(`update game.players set level = 9 where id = $1`, [idDebtor])
    await expect(offer(100_000)).rejects.toThrow('partner_locked')
    await t.sql(`update game.players set level = 12 where id = $1`, [idDebtor])

    const a = (await offer(100_000)).loans.loans[0]!
    await respond(a.id, false)
    await expect(respond(a.id, true)).rejects.toThrow('not_found')
    const b = (await offer(100_000)).loans.loans.find((l) => l.state === 'offered')!
    await t.rpc(bank, 'loan_cancel', { p_request_id: rid(), p_loan: b.id })
    await expect(respond(b.id, true)).rejects.toThrow('not_found')

    // the lender spent the money meanwhile
    const c = (await offer(100_000)).loans.loans.find((l) => l.state === 'offered')!
    await t.sql(`select private.money_add($1, -(select cash_cents from game.players where id = $1), 'test')`, [idBank])
    await expect(respond(c.id, true)).rejects.toThrow('lender_broke')
    await t.assertLedgerMatches()
  })
})
