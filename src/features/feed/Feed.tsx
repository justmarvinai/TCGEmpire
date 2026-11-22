import clsx from 'clsx'
import { slabName } from '@/components/cards/Slab.tsx'
import { HOMES } from '@/lib/catalog.ts'
import { CONSUMABLES, cardName, gameOf, GOALS, itemName, SETS, STORES, type Game } from '@/lib/catalog.ts'
import { formatAgo, formatMoney } from '@/lib/format.ts'
import type { FeedEntry } from '@/lib/schemas.ts'
import { serverNow, useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const DOENER_BASE_CENTS = CONSUMABLES.find((c) => c.key === 'doener')?.priceBaseCents ?? 0

export function feedText(f: FeedEntry, doener: string) {
  if (f.kind === 'player_joined') return texts.feed.player_joined(f.data)
  if (f.kind === 'inflation') return texts.feed.inflation(f.data, doener)
  if (f.kind === 'pull_grail') return texts.feed.pull_grail(f.data, cardName(String(f.data.card_id)), gameOf(String(f.data.card_id)))
  if (f.kind === 'pull_ultra') return texts.feed.pull_ultra(f.data, cardName(String(f.data.card_id)))
  if (f.kind === 'player_reset') return texts.feed.player_reset(f.data)
  if (f.kind === 'overtake') return texts.feed.overtake(f.data)
  if (f.kind === 'set_phase')
    return texts.feed.set_phase(String(f.data.phase), Boolean(f.data.reprint), SETS.find((s) => s.id === f.data.set_id)?.name ?? String(f.data.set_id))
  if (f.kind === 'league') return texts.feed.league(f.data, texts.toplists.percent(Number(f.data.bps)))
  if (f.kind === 'home') {
    const home = HOMES.find((h) => h.key === f.data.home)
    return texts.feed.home(f.data, home?.name ?? String(f.data.home), home?.article ?? 'das')
  }
  if (f.kind === 'bailout') return texts.feed.bailout(f.data, formatMoney(Number(f.data.cents)))
  if (f.kind === 'slab')
    return texts.feed.slab(
      f.data,
      cardName(String(f.data.card_id)),
      slabName({ grader: String(f.data.grader) as 'psa', grade: Number(f.data.grade), black_label: Boolean(f.data.black_label) }),
    )
  if (f.kind === 'goal') return texts.feed.goal(f.data, GOALS.find((g) => g.key === f.data.goal)?.name ?? String(f.data.goal))
  if (f.kind === 'license') return texts.feed.license(f.data, texts.games[f.data.game as Game] ?? String(f.data.game))
  if (f.kind === 'announcement') return texts.feed.announcement(String(f.data.text))
  if (f.kind === 'big_deal') return texts.feed.big_deal(f.data, itemName(String(f.data.item_id)), formatMoney(Number(f.data.cents)))
  if (f.kind === 'price_move') return texts.feed.price_move(Number(f.data.pct), itemName(String(f.data.item_id)))
  const store = STORES.find((s) => s.key === f.data.store)?.name ?? String(f.data.store)
  if (f.kind === 'restock') return texts.feed.restock(store)
  if (f.kind === 'scalper_raid') return texts.feed.scalper_raid(f.data, store)
  return texts.feed.unknown
}

/** KARTEN-BILD: the server's headlines, newest first. */
export function FeedList({ priceLevel, limit, className }: { priceLevel: number; limit?: number; className?: string }) {
  const feed = useWorld((s) => s.feed)
  const doener = formatMoney(Math.round(DOENER_BASE_CENTS * priceLevel))
  const list = [...feed].reverse().slice(0, limit)
  if (list.length === 0) return <p className="py-4 text-center text-sm text-fg-3">{texts.feed.empty}</p>
  return (
    <ul className={clsx('flex flex-col gap-2', className)}>
      {list.map((f) => (
        <li key={f.id} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-snug animate-fade-up">
          {feedText(f, doener)}
          <span className="mt-1 block text-xs text-fg-3">{formatAgo(f.at, serverNow())}</span>
        </li>
      ))}
    </ul>
  )
}
