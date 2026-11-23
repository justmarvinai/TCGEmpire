import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './harness.ts'

const rid = () => crypto.randomUUID()
const LABEL = { bg: 'rot', fg: 'weiss', emblem: '183c7effff7e3c18' }
let t: TestDb
let me: string
let id: string

const num = async (q: string, params: unknown[] = []) => Number((await t.sql<{ v: string }>(q, params))[0]!.v)
const exit = () => t.rpc(me, 'prestige_exit', { p_request_id: rid(), p_confirm: 'Aussteiger' })

beforeEach(async () => {
  t = await createTestDb()
  me = await t.player('Aussteiger')
  id = await t.playerId(me)
  await t.sql(`update game.players set level = 100, ruf = 800 where id = $1`, [id])
  await t.sql(`select private.money_add($1, 500000000, 'admin_grant')`, [id])
})

describe('Der Exit', () => {
  it('sells the empire for Sterne; the collection goes to Omas Dachboden; the rest starts over', async () => {
    await t.tick() // market prices
    await t.rpc(me, 'company_found_step', { p_request_id: rid(), p_step: 'antrag' })
    await t.advance('11 minutes')
    await t.rpc(me, 'company_found_step', { p_request_id: rid(), p_step: 'a38' })
    await t.rpc(me, 'company_found', { p_request_id: rid(), p_name: 'Exit GmbH', p_slogan: '', p_label: LABEL })
    await t.rpc(me, 'upgrade_buy', { p_request_id: rid(), p_key: 'fleiss' })
    await t.rpc(me, 'bunker_get')
    await t.sql(`insert into game.card_stacks (player_id, card_id, qty) select $1, id, 3 from game.card_defs where tier = 'common' order by id limit 2`, [id])
    await t.sql(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at, location)
       select $1, id, 8, 8, 8, 8, private.now(), case when row_number() over () = 1 then 'vitrine' else 'inventory' end
       from game.card_defs where tier = 'holo' order by id limit 2`,
      [id],
    )
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 4)`, [id])
    const doc = await t.rpc(me, 'prestige_get')
    expect(doc.blockers).toEqual({})
    const unit = doc.preview.unit_cents
    expect(doc.preview.stars).toBe(10 + Math.floor(Math.sqrt(doc.preview.value_cents / unit)))
    const worthBefore = await num(`select private.net_worth($1) as v`, [id])

    await expect(t.rpc(me, 'prestige_exit', { p_request_id: rid(), p_confirm: 'falsch' })).rejects.toThrow('confirm_wrong')
    const res = await exit()
    expect(res.player.level).toBe(1)
    expect(res.player.prestige).toBe(1)
    expect(res.player.stars).toBe(doc.preview.stars)
    expect(res.player.ruf).toBe(650)
    expect(res.player.cash_cents).toBe(await num(`select private.eur(40000) as v`))
    expect(res.history).toEqual([expect.objectContaining({ n: 1, stars: doc.preview.stars })])
    // the collection is on the attic and still counts
    expect(res.attic.items.map((i) => [i.kind, i.qty])).toEqual([
      ['card', 3],
      ['card', 3],
      ['sealed', 4],
    ])
    expect(res.attic.copies).toHaveLength(2)
    expect(await num(`select count(*) as v from game.card_stacks where player_id = $1`, [id])).toBe(0)
    expect(await num(`select private.net_worth($1) as v`, [id])).toBeLessThan(worthBefore)
    expect(await num(`select private.net_worth($1) as v`, [id])).toBeGreaterThan(res.player.cash_cents)
    // the empire is gone
    for (const table of ['companies where owner_id', 'upgrades_owned where player_id', 'bunker where player_id', 'homes where player_id'])
      expect(await num(`select count(*) as v from game.${table} = $1`, [id])).toBe(0)
    expect(await num(`select count(*) as v from game.modifiers where player_id = $1 and source like 'upgrade:%'`, [id])).toBe(0)
    expect(await num(`select count(*) as v from game.quests where player_id = $1`, [id])).toBeGreaterThan(0)
    expect(await t.sql(`select data ->> 'name' as n from game.feed where kind = 'prestige'`)).toEqual([{ n: 'Aussteiger' }])
    await expect(exit()).rejects.toThrow('locked')
    await t.assertLedgerMatches()
  })

  it('open business blocks the exit; below level 100 it is locked', async () => {
    await t.tick()
    await t.sql(`insert into game.card_stacks (player_id, card_id, qty) select $1, id, 5 from game.card_defs where tier = 'common' order by id limit 1`, [id])
    await t.sql(`update game.players set level = 99 where id = $1`, [id])
    await expect(exit()).rejects.toThrow('locked')
    await t.sql(`update game.players set level = 100 where id = $1`, [id])
    const card = (await t.sql<{ card_id: string }>(`select card_id from game.card_stacks where player_id = $1`, [id]))[0]!.card_id
    await t.rpc(me, 'listing_create', { p_request_id: rid(), p_kind: 'card', p_item: card, p_copy: null, p_qty: 1, p_price: 100 })
    expect((await t.rpc(me, 'prestige_get')).blockers).toEqual({ listings: 1 })
    await expect(exit()).rejects.toThrow('prestige_busy')
  })

  it('perks cost Sterne, grow in price, and survive the next exit', async () => {
    await t.sql(`update game.players set stars = 10 where id = $1`, [id])
    let doc = await t.rpc(me, 'perk_buy', { p_request_id: rid(), p_key: 'lohn' })
    expect(doc.perks.lohn).toEqual({ level: 1, cost: 4 })
    expect(doc.stars).toBe(7)
    doc = await t.rpc(me, 'perk_buy', { p_request_id: rid(), p_key: 'lohn' })
    expect(doc.stars).toBe(3)
    expect(await num(`select private.stat($1, 'wage_pct', 0) as v`, [id])).toBe(10)
    await expect(t.rpc(me, 'perk_buy', { p_request_id: rid(), p_key: 'lohn' })).rejects.toThrow('not_enough_stars')
    await t.rpc(me, 'perk_buy', { p_request_id: rid(), p_key: 'erbe' })
    await exit()
    expect(await num(`select private.stat($1, 'wage_pct', 0) as v`, [id])).toBe(10)
    expect(await num(`select cash_cents as v from game.players where id = $1`, [id])).toBe(await num(`select private.eur(40000 + 250000) as v`))
    await expect(t.rpc(me, 'perk_buy', { p_request_id: rid(), p_key: 'gibtsnicht' })).rejects.toThrow('invalid_request')
  })

  it('Oma gives back a day’s worth of value; the first thing of a day may be worth more', async () => {
    await t.tick()
    await t.sql(
      `insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
       select $1, id, 9, 9, 9, 9, private.now() from game.card_defs where tier = 'ultra' order by id limit 2`,
      [id],
    )
    await t.sql(`insert into game.card_stacks (player_id, card_id, qty) select $1, id, 50 from game.card_defs where tier = 'common' order by id limit 1`, [id])
    await t.sql(`select private.sealed_add($1, 'booster-pkm-base', 3)`, [id])
    const doc = await exit()
    const [first, second] = doc.attic.copies
    // make the limit small: a few euros
    await t.sql(`insert into game.config_overrides (key, value, updated_at) values ('attic.daily_minutes', '1', now())`)
    let after = await t.rpc(me, 'attic_retrieve', { p_request_id: rid(), p_kind: 'copy', p_item: null, p_copy: first!.copy_id, p_qty: null })
    expect(after.attic.used_cents).toBe(first!.value_cents)
    await expect(t.rpc(me, 'attic_retrieve', { p_request_id: rid(), p_kind: 'copy', p_item: null, p_copy: second!.copy_id, p_qty: null })).rejects.toThrow(
      'attic_limit',
    )
    expect(await num(`select count(*) as v from game.card_copies where id = $1 and location = 'inventory'`, [first!.copy_id])).toBe(1)
    await t.advance('1 day')
    const card = doc.attic.items.find((i) => i.kind === 'card')!
    after = await t.rpc(me, 'attic_retrieve', { p_request_id: rid(), p_kind: 'card', p_item: card.item_id, p_copy: null, p_qty: 10 })
    expect(after.attic.items.find((i) => i.kind === 'card')!.qty).toBe(40)
    expect(await num(`select qty as v from game.card_stacks where player_id = $1 and card_id = $2`, [id, card.item_id])).toBe(10)
    await expect(t.rpc(me, 'attic_retrieve', { p_request_id: rid(), p_kind: 'sealed', p_item: 'booster-pkm-base', p_copy: null, p_qty: 9 })).rejects.toThrow(
      'not_owned',
    )
    await t.assertLedgerMatches()
  })
})
