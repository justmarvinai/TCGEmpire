import { describe, expect, it } from 'vitest'
import { createTestDb } from './harness.ts'

const rid = () => crypto.randomUUID()

describe('Realtime pokes', () => {
  it('pokes the world on chat and headlines and the player on notifications, each on its own topic', async () => {
    const t = await createTestDb()
    const seen: { topic: string; event: string; payload: { area?: string } }[] = []
    await t.db.listen('realtime', (raw) => seen.push(JSON.parse(raw)))
    const me = await t.player('Funker')
    const id = await t.playerId(me)
    const topics = await t.rpc(me, 'realtime_get')
    expect(topics.world).toBe('world')
    expect(topics.player).toMatch(/^player:[0-9a-f-]{36}$/)
    const other = await t.rpc(await t.player('Lauscher'), 'realtime_get')
    expect(other.player).not.toBe(topics.player)

    seen.length = 0
    await t.rpc(me, 'chat_send', { p_request_id: rid(), p_body: 'Hallo Welt', p_item: null })
    await t.sql(`select private.notify($1, 'admin_grant', '{"cents": 1}')`, [id])
    await t.sql(`select private.feed_add('announcement', '{"text": "Test"}')`)
    await new Promise((r) => setTimeout(r, 50))
    expect(seen).toEqual(
      expect.arrayContaining([
        { topic: 'world', event: 'poke', payload: { area: 'chat' } },
        { topic: topics.player, event: 'poke', payload: { area: 'notifications' } },
        { topic: 'world', event: 'poke', payload: { area: 'feed' } },
      ]),
    )
    // Pokes carry no game data.
    expect(seen.every((m) => Object.keys(m.payload).every((k) => k === 'area'))).toBe(true)
  })
})
