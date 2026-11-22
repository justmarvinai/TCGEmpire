import { cardName, SETS, STORES } from '@/lib/catalog.ts'
import { texts } from '@/texts/de.ts'
import { EVENTS } from '../../../content/events.ts'

export const eventDef = (key: string) => EVENTS.find((e) => e.key === key)

/** "Betrifft: Pokémon" — what a market event hit, if anything. */
export function eventTarget(data: Record<string, unknown>): string {
  const T = texts.events.target
  if (typeof data.game === 'string') return T.game((texts.games as Record<string, string>)[data.game] ?? data.game)
  if (typeof data.card_id === 'string') return T.card(cardName(data.card_id))
  if (typeof data.set_id === 'string') return T.set(SETS.find((s) => s.id === data.set_id)?.name ?? data.set_id)
  if (typeof data.store === 'string') return T.store(STORES.find((s) => s.key === data.store)?.name ?? data.store)
  return ''
}

/** "Mittwoch, 20:00 Uhr" in German time. */
export function eventWhen(iso: string): string {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' }).format(d)
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(d)
  return texts.events.at(day, time)
}
