import { describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

// QA pass (24 Nov 2026): regressions for the server bugs found in review (migration 20261124000200_qa_fixes.sql).
const rid = () => crypto.randomUUID()
const LABEL = { bg: 'gruen', fg: 'weiss', emblem: '183c7effff7e3c18' }
const cash = async (t: TestDb, id: string) => Number((await t.sql<{ c: string }>(`select cash_cents as c from game.players where id = $1`, [id]))[0]!.c)

async function two(t: TestDb, a: string, b: string, level = 20) {
  const pa = await t.player(a)
  const pb = await t.player(b)
  const ia = await t.playerId(pa)
  const ib = await t.playerId(pb)
  for (const id of [ia, ib]) {
    await t.sql(`update game.players set level = $2, created_at = private.now() - interval '2 days' where id = $1`, [id, level])
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
  }
  await t.sql(`select private.tick_market()`)
  return { pa, pb, ia, ib }
}

describe('QA fixes', () => {
  it('"Doppelte verkaufen" sells more than 200 different duplicates in one go', async () => {
    const t = await createTestDb()
    const me = await t.player('Sammler')
    const id = await t.playerId(me)
    await t.sql(
      `insert into game.card_stacks (player_id, card_id, qty)
       select $1, c.id, 2 from game.card_defs c join game.set_defs s on s.id = c.set_id
       where c.tier in ('common', 'uncommon', 'rare') and s.phase not in ('announced', 'preorder') order by c.id limit 300`,
      [id],
    )
    const stacks = (await t.sql<{ card_id: string }>(`select card_id from game.card_stacks where player_id = $1`, [id])).map((s) => ({ card_id: s.card_id, qty: 1 }))
    expect(stacks.length).toBe(300)
    expect((await t.rpc(me, 'ankauf_sell', { p_request_id: rid(), p_stacks: stacks, p_copies: [] })).sold).toBe(300)
  })

  it('a finished company order the customer never opens does not block the owner from Prestige', async () => {
    const t = await createTestDb()
    const { pa: boss, pb: fan, ia: idBoss, ib: idFan } = await two(t, 'Firmenchef', 'Kunde', 30)
    await t.rpc(boss, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
    await t.advance('11 minutes')
    await t.rpc(boss, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
    const company = (await t.rpc(boss, 'company_found', { p_request_id: rid(), p_name: 'Slabwerk', p_slogan: '', p_label: LABEL })).company!.id
    const copy = (
      await t.sql<{ id: string }>(
        `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
         values ($1, (select id from game.card_defs where tier = 'holo' order by id limit 1), 9, 9, 9, 9, private.now()) returning id`,
        [idFan],
      )
    )[0]!.id
    await t.rpc(fan, 'company_order_submit', { p_request_id: rid(), p_copies: [copy], p_company: company, p_service: 'economy' })
    const blockers = async () => (await t.sql<{ b: Record<string, number> }>(`select private.prestige_blockers($1) as b`, [idBoss]))[0]!.b
    expect(await blockers()).toMatchObject({ company_orders: 1 }) // still being graded
    await t.advance('30 days')
    expect(await blockers()).not.toHaveProperty('company_orders')
  })

  it('a buyer who resets while a parcel travels: the seller is still paid', async () => {
    const t = await createTestDb()
    const { pa: seller, pb: buyer, ia: idS } = await two(t, 'Verkaeufer', 'Kaeufer')
    const card = (
      await t.sql<{ id: string; v: string }>(
        `select c.id, p.value_cents as v from game.card_defs c join game.prices p on p.item_id = c.id
         where c.tier = 'rare' and c.set_id = 'pokemon-base' order by c.id limit 1`,
      )
    )[0]!
    await t.sql(`select private.stack_add($1, $2, 1)`, [idS, card.id])
    const listed = await t.rpc(seller, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: card.id, p_copy: null, p_qty: 1, p_price: Number(card.v) })
    const before = await cash(t, idS)
    await t.rpc(buyer, 'listing_buy', { p_request_id: rid(), p_listing: listed.mine.listings[0]!.id, p_qty: 1 })
    await t.rpc(buyer, 'account_reset', { p_request_id: rid(), p_confirm: 'kaeufer' })
    expect(await cash(t, idS)).toBeGreaterThan(before) // paid at once, minus the fee
    await t.advance('30 minutes')
    await t.tick()
    await t.assertLedgerMatches()
  })

  it('reset and delete wait for open loans, pack battles and box breaks with other players', async () => {
    const t = await createTestDb()
    const { pa: lender, pb: borrower, ib: idB } = await two(t, 'Verleiher', 'Schuldner')
    await t.rpc(lender, 'loan_offer', { p_request_id: rid(), p_to: idB, p_cents: 20000, p_interest_pct: 10, p_days: 2 })
    const loan = (await t.sql<{ id: string }>(`select id from game.loans`))[0]!.id
    await t.rpc(borrower, 'loan_respond', { p_request_id: rid(), p_loan: Number(loan), p_accept: true })
    await expect(t.rpc(borrower, 'account_reset', { p_request_id: rid(), p_confirm: 'schuldner' })).rejects.toThrow('account_busy')
    await expect(t.rpc(borrower, 'account_delete', { p_request_id: rid(), p_confirm: 'schuldner' })).rejects.toThrow('account_busy')

    const created = await t.rpc(lender, 'battle_create', { p_request_id: rid(), p_mode: 'klassisch', p_product: 'booster-pkm-base', p_packs: 2, p_seats: 3 })
    await t.rpc(borrower, 'battle_join', { p_request_id: rid(), p_battle: created.battle.id })
    await expect(t.rpc(lender, 'account_delete', { p_request_id: rid(), p_confirm: 'verleiher' })).rejects.toThrow('account_busy')
    await t.rpc(lender, 'battle_leave', { p_request_id: rid(), p_battle: created.battle.id }) // the host cancels: everyone refunded
    await t.rpc(lender, 'account_delete', { p_request_id: rid(), p_confirm: 'verleiher' }) // the lender may go
  })

  it('cancelling a pack battle that already runs refunds nobody', async () => {
    const t = await createTestDb()
    const { pa: host, pb: guest, ia: idH, ib: idG } = await two(t, 'Gastgeber', 'Mitspieler')
    const created = await t.rpc(host, 'battle_create', { p_request_id: rid(), p_mode: 'klassisch', p_product: 'booster-pkm-base', p_packs: 1, p_seats: 2 })
    await t.rpc(guest, 'battle_join', { p_request_id: rid(), p_battle: created.battle.id }) // full: it starts
    const before = [await cash(t, idH), await cash(t, idG)]
    await t.sql(`select private.battle_cancel($1)`, [created.battle.id])
    expect([await cash(t, idH), await cash(t, idG)]).toEqual(before)
    expect((await t.sql<{ state: string }>(`select state from game.battles where id = $1`, [created.battle.id]))[0]!.state).toBe('running')
  })

  it('an NPC offer the NPC can no longer pay is declined for good', async () => {
    const t = await createTestDb()
    const me = await t.player('Inserent')
    const id = await t.playerId(me)
    await t.sql(`update game.players set level = 10 where id = $1`, [id])
    await t.sql(`select private.tick_market()`)
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 1)`, [id])
    await t.rpc(me, 'ad_post', { p_request_id: rid(), p_kind: 'sealed', p_item: 'booster-pkm-base', p_copy: null, p_qty: 1, p_price: 500 })
    const ad = (await t.sql<{ id: string }>(`select id from game.ads where seller_id = $1`, [id]))[0]!.id
    const offer = (
      await t.sql<{ id: string }>(
        `insert into game.ad_offers (ad_id, npc_id, price_cents, state, reply_kind, reply_idx, created_at)
         values ($1, 'sabine', 400, 'open', 'fair', 1, private.now()) returning id`,
        [ad],
      )
    )[0]!.id
    await t.sql(`update game.npcs set budget_cents = 10 where id = 'sabine'`)
    const res = await t.rpc(me, 'ad_answer', { p_request_id: rid(), p_offer: Number(offer), p_accept: true })
    expect(res.broke).toBe(true)
    expect((await t.sql<{ state: string }>(`select state from game.ad_offers where id = $1`, [offer]))[0]!.state).toBe('declined')
    expect(await t.sql(`select 1 from game.ads where id = $1`, [ad])).toHaveLength(1) // the ad stays up
  })

  it('the energy mini quest is only offered to players who can pull energy cards', async () => {
    const t = await createTestDb()
    const ygo = await t.playerId(await t.player('Duellant', 'geheim123', 'yugioh'))
    const pkm = await t.playerId(await t.player('Trainer', 'geheim123', 'pokemon'))
    const doable = async (id: string) => (await t.sql<{ d: boolean }>(`select private.quest_doable($1, 'energy_pulled') as d`, [id]))[0]!.d
    expect(await doable(ygo)).toBe(false)
    expect(await doable(pkm)).toBe(true)
    for (let i = 0; i < 15; i++) {
      await t.sql(`delete from game.quests where player_id = $1 and kind = 'mini' and claimed_at is null`, [ygo])
      await t.sql(`select private.quests_fill($1)`, [ygo])
    }
    expect(await t.sql(`select 1 from game.quests where player_id = $1 and event = 'energy_pulled'`, [ygo])).toEqual([])
  })

  it('kiosk snacks stop giving energy for the day once the player is satt', async () => {
    const t = await createTestDb()
    const me = await t.player('Vielfrass')
    const id = await t.playerId(me)
    await t.sql(`select private.money_add($1, 10000000, 'admin_grant')`, [id])
    const mate = () => t.rpc(me, 'consumable_use', { p_request_id: rid(), p_key: 'mate' })
    const drain = () => t.sql(`update game.players set energy = 0, energy_at = private.now() where id = $1`, [id])
    await mate() // a full tank wastes the snack, and it does not count
    expect((await t.rpc(me, 'shop_get')).snack_energy_left).toBe(150)
    // snack.daily_energy = 150: seven Club-Mate give 140, the eighth may go over, the ninth is refused
    for (let i = 0; i < 8; i++) {
      await drain()
      await mate()
    }
    expect((await t.rpc(me, 'shop_get')).snack_energy_left).toBe(0)
    await drain()
    const before = await cash(t, id)
    await expect(mate()).rejects.toThrow('snack_full')
    expect(await cash(t, id)).toBe(before) // nothing charged
    await t.advance('1 day')
    expect((await t.rpc(me, 'shop_get')).snack_energy_left).toBe(150)
    await mate() // hungry again
    await t.assertLedgerMatches()
  })

  it('new-card quests are only offered while ordinary cards are still missing', async () => {
    const t = await createTestDb()
    const id = await t.playerId(await t.player('Komplettist', 'geheim123', 'yugioh'))
    const doable = async () => (await t.sql<{ d: boolean }>(`select private.quest_doable($1, 'card_new') as d`, [id]))[0]!.d
    expect(await doable()).toBe(true)
    // every common, uncommon and rare card the player can pull; only hits are left, which can take days
    await t.sql(
      `insert into game.collection (player_id, card_id, first_at)
       select $1, c.id, private.now() from game.card_defs c join game.set_defs s on s.id = c.set_id
       where c.tier in ('common', 'uncommon', 'rare') and s.phase in ('print', 'last_wave')
       on conflict do nothing`,
      [id],
    )
    expect(await doable()).toBe(false)
    for (let i = 0; i < 10; i++) {
      await t.sql(`delete from game.quests where player_id = $1 and claimed_at is null`, [id])
      await t.sql(`select private.quests_fill($1)`, [id])
    }
    expect(await t.sql(`select 1 from game.quests where player_id = $1 and event = 'card_new'`, [id])).toEqual([])
  })

  it('fifty boosters are bought and opened in one go', async () => {
    const t = await createTestDb()
    const me = await t.player('Grossabnehmer')
    const id = await t.playerId(me)
    await t.sql(`select private.money_add($1, 100000000, 'admin_grant')`, [id])
    await expect(t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 20 })).rejects.toThrow('invalid_request')
    expect((await t.rpc(me, 'store_buy', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 50 })).bought).toBe(50)
    const opened = await t.rpc(me, 'pack_open', { p_request_id: rid(), p_product: 'booster-pkm-base', p_qty: 50 })
    expect(opened.packs).toHaveLength(50)
    await t.assertLedgerMatches()
  })

  it('Adventskalender doors give no cards of a set in Vorbestellung', async () => {
    const t = await createTestDb()
    await t.setConfig({ 'events.enabled': true })
    const me = await t.player('Wichtel')
    const id = await t.playerId(me)
    await t.sql(`update game.set_defs set phase = 'preorder' where id = 'pokemon-fossil'`)
    await t.sql(`update game.server set clock_offset = clock_offset + (timestamptz '2026-12-01 10:00 Europe/Berlin' - private.now()) where id`)
    for (let d = 1; d <= 24; d++) {
      await t.sql(`select private.tick_calendar()`)
      await t.rpc(me, 'advent_open', { p_request_id: rid() })
      await t.advance('1 day')
    }
    const fossil = await t.sql<{ n: string }>(
      `select coalesce(sum(qty), 0) as n from game.card_stacks s join game.card_defs c on c.id = s.card_id
       where s.player_id = $1 and c.set_id = 'pokemon-fossil'`,
      [id],
    )
    expect(Number(fossil[0]!.n)).toBe(0)
  }, 120_000)
})
