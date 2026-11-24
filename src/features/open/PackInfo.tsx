// What a booster or display holds and how often each card comes, opened by clicking a pack image. Shown from the same
// content and config the server rolls with (decision 122), without luck bonuses, Doppel-Hit, God Pack and Pech-Schutz.
import clsx from 'clsx'
import { useState } from 'react'
import { Card } from '@/components/cards/Card.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { ProductArt } from '@/components/pixel/ProductArt.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { productById, SETS, TIER_LABEL, TIER_TEXT, TIERS, type CardData, type Tier } from '@/lib/catalog.ts'
import { formatNumber, formatShare } from '@/lib/format.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'
import { hitOdds, isEnergy } from '../../../content/catalog.ts'
import { config } from '../../../content/config.ts'
import type { ProductData, SetData } from '../../../content/types.ts'

const T = texts.packInfo

export const oneIn = (p: number) => `1 : ${formatNumber(Math.round(1 / p))}`

/** One tile per tier: the base tier shows its share ("der Rest"), every other tier "1 : N". */
export function RateTiles({ rows, base }: { rows: [Tier, number][]; base: Tier }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {rows.map(([tier, ppm]) => (
        <li key={tier} className="rounded-xl bg-surface-2 px-3 py-2">
          <p className={clsx('text-sm font-semibold', TIER_TEXT[tier])}>{TIER_LABEL[tier]}</p>
          {/* the base tier is what is left over: a share says more than "1 : 1" */}
          <p className="nums text-lg font-bold">{tier === base ? formatShare(ppm / 1_000_000) : oneIn(ppm / 1_000_000)}</p>
          <p className="nums text-xs text-fg-3">{tier === base ? texts.open.pullRest : formatShare(ppm / 1_000_000)}</p>
        </li>
      ))}
    </ul>
  )
}

/** The hit slot's tiers in ppm, the base tier (what is left) first. */
export function hitRows(set: SetData): { base: Tier; rows: [Tier, number][] } {
  const { base, odds } = hitOdds(set)
  const hits = Object.entries(odds) as [Tier, number][]
  return { base, rows: [[base, 1_000_000 - hits.reduce((s, [, ppm]) => s + ppm, 0)], ...hits] }
}

const poolOf = (c: CardData) => (c.tier === 'common' ? (isEnergy(c) ? 'energy' : 'common') : c.tier)

/** Chance per booster to find each card: n of the pool's cards from its fixed slots, plus its tier's share of the hit slot. */
function cardChances(product: ProductData, set: SetData): Map<string, number> {
  const size = new Map<string, number>()
  for (const c of set.cards) size.set(poolOf(c), (size.get(poolOf(c)) ?? 0) + 1)
  const hit = new Map(hitRows(set).rows.map(([t, ppm]) => [t as string, ppm / 1_000_000]))
  const slots = new Map<string, number>(product.slots.map((g) => [g.pool, g.n]))
  const hitN = slots.get('hit') ?? 0
  return new Map(
    set.cards.map((c) => {
      const pool = poolOf(c)
      const n = size.get(pool) ?? 1
      const fromHit = pool === 'energy' ? 0 : (hitN * (hit.get(pool) ?? 0)) / n
      return [c.id, Math.min(1, Math.min(n, slots.get(pool) ?? 0) / n + fromHit)]
    }),
  )
}

const chanceText = (p: number) => (p >= 0.01 ? formatShare(p) : oneIn(p))

export function PackInfoDialog({ productId, onClose }: { productId: string; onClose: () => void }) {
  const product = productById.get(productId)
  const booster = product?.kind === 'display' ? productById.get(product.contains?.product ?? '') : product
  const set = SETS.find((s) => s.id === booster?.set)
  if (!product || !booster || !set) return null
  const chances = cardChances(booster, set)
  const { base, rows } = hitRows(set)
  const tiers = [...TIERS].reverse().filter((t) => set.cards.some((c) => c.tier === t))
  const slotName = (pool: string) =>
    pool === 'hit'
      ? set.house
        ? T.hitHouse
        : T.hitNormal
      : pool === 'energy'
        ? set.cards.some((c) => c.kind === 'rune')
          ? T.rune
          : T.energy
        : TIER_LABEL[pool as Tier]
  return (
    <Dialog open wide onOpenChange={(o) => !o && onClose()} title={product.name} description={T.description}>
      <div className="flex flex-wrap items-start gap-6">
        <ProductArt id={productId} scale={2} />
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <section>
            <h3 className="text-sm font-bold">{T.contents}</h3>
            <ul className="nums mt-1 flex flex-col gap-0.5 text-sm text-fg-2">
              {product.kind === 'display' && product.contains && <li>{T.boosters(product.contains.qty, booster.name)}</li>}
              {booster.slots.map((g) => (
                <li key={g.pool}>
                  {product.kind === 'display' ? T.perBooster(g.n, slotName(g.pool)) : `${g.n}× ${slotName(g.pool)}`}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-bold">{T.hitTitle}</h3>
            <RateTiles base={base} rows={rows} />
            <p className="mt-2 text-xs text-fg-3">
              {set.house ? T.houseNote : T.extras(oneIn(config['pack.double_hit_ppm'] / 1_000_000), oneIn(config['pack.god_pack_ppm'] / 1_000_000))}
            </p>
          </section>
        </div>
      </div>
      {tiers.map((t) => {
        const cards = set.cards.filter((c) => c.tier === t)
        return (
          <section key={t} className="mt-5">
            <h3 className={clsx('mb-2 text-sm font-bold', TIER_TEXT[t])}>
              {TIER_LABEL[t]} <span className="font-normal text-fg-3">· {T.cards(cards.length)}</span>
            </h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
              {cards.map((c) => (
                <li key={c.id} className="flex flex-col items-center gap-1 text-center">
                  <Card id={c.id} scale={1} foil="none" />
                  <span className="w-22 truncate text-xs" title={c.name}>
                    {c.name}
                  </span>
                  <span className="nums text-xs text-fg-3" title={T.perCard}>
                    {chanceText(chances.get(c.id) ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Dialog>
  )
}

/** A pack image you can click to see what is in it. */
export function PackArt({ id, scale, className, artClassName }: { id: string; scale?: number; className?: string; artClassName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          sfx('click')
          setOpen(true)
        }}
        className={clsx('group relative shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-accent', className)}
        aria-label={T.open(productById.get(id)?.name ?? id)}
        title={T.hint}
      >
        <ProductArt id={id} scale={scale} className={clsx('transition-transform duration-150 group-hover:-translate-y-1', artClassName)} />
        <span className="pointer-events-none absolute right-1 bottom-1 grid size-7 place-items-center rounded-full bg-ink/85 text-fg opacity-70 transition-opacity group-hover:opacity-100">
          <PixelIcon name="loupe" />
        </span>
      </button>
      {open && <PackInfoDialog productId={id} onClose={() => setOpen(false)} />}
    </>
  )
}
