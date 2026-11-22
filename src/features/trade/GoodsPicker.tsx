import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { ItemTier, centsToEuros, eurosToCents } from '@/features/cardmarket/common.tsx'
import { itemName } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import type { Goods, GoodsItem, TradeDoc, TradeInventory } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'

const T = texts.trade

export const NO_GOODS: Goods = { money_cents: 0, items: [] }
const key = (i: GoodsItem) => `${i.kind}:${i.item_id}:${i.copy_id ?? ''}`

/** A value that settles after the user stops typing or clicking (one quote request, not ten). */
export function useSettled<V>(value: V, ms = 300) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

/** Money plus items from one player's inventory; quantities never above what is there. */
export function GoodsPicker({ items, value, onChange }: { items: TradeInventory['items']; value: Goods; onChange: (g: Goods) => void }) {
  const [search, setSearch] = useState('')
  const [money, setMoney] = useState(value.money_cents ? centsToEuros(value.money_cents) : '')
  const chosen = useMemo(() => new Map(value.items.map((i) => [key(i), i.qty])), [value.items])
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return items.filter((i) => !s || itemName(i.item_id).toLowerCase().includes(s))
  }, [items, search])

  const setQty = (item: TradeInventory['items'][number], qty: number) => {
    const rest = value.items.filter((i) => key(i) !== key(item))
    const next = qty > 0 ? [...rest, { kind: item.kind, item_id: item.item_id, copy_id: item.copy_id ?? null, qty }] : rest
    onChange({ ...value, items: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-fg-2">
        {T.money}
        <input
          value={money}
          inputMode="decimal"
          placeholder="0,00"
          onChange={(e) => {
            setMoney(e.target.value)
            const c = eurosToCents(e.target.value || '0')
            onChange({ ...value, money_cents: Number.isFinite(c) && c > 0 ? c : 0 })
          }}
          className="panel-inset mt-1 block h-10 w-full bg-transparent px-3 text-fg placeholder:text-fg-3"
        />
      </label>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={T.search}
        aria-label={T.search}
        className="panel-inset h-9 w-full bg-transparent px-3 text-sm placeholder:text-fg-3"
      />
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-3">{T.noItems}</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {rows.map((i) => {
            const n = chosen.get(key(i)) ?? 0
            return (
              <li key={key(i)} className={clsx('flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm', n > 0 ? 'bg-surface-3' : 'bg-surface-2')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{itemName(i.item_id)}</span>
                  <span className="text-xs">
                    {i.kind === 'sealed' ? <span className="text-fg-3">{T.sealed}</span> : <ItemTier id={i.item_id} />}
                    {i.kind === 'copy' && <span className="text-fg-3"> · {T.hit}</span>}
                    <span className="nums text-fg-3"> · {formatMoney(i.value_cents)}</span>
                  </span>
                </span>
                {i.kind === 'copy' ? (
                  <button
                    type="button"
                    aria-pressed={n > 0}
                    onClick={() => setQty(i, n > 0 ? 0 : 1)}
                    className={clsx('btn min-h-8 px-3 text-xs font-semibold', n > 0 ? 'btn-primary' : 'btn-neutral')}
                  >
                    {n > 0 ? '✓' : '+'}
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label="−" disabled={n === 0} onClick={() => setQty(i, n - 1)} className="btn btn-neutral size-8 text-sm">
                      −
                    </button>
                    <span className="nums w-12 text-center text-xs">
                      {n}/{i.qty}
                    </span>
                    <button type="button" aria-label="+" disabled={n >= i.qty} onClick={() => setQty(i, n + 1)} className="btn btn-neutral size-8 text-sm">
                      +
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {value.items.length > 0 && <p className="text-xs text-fg-3">{T.selected(value.items.reduce((s, i) => s + i.qty, 0))}</p>}
    </div>
  )
}

/** One side of an offer in words: "2× Pikachu, Glurak, 20,00 €". */
export function GoodsList({ goods }: { goods: TradeDoc['give'] }) {
  if (goods.money_cents === 0 && goods.items.length === 0) return <p className="text-sm text-fg-3">{T.nothing}</p>
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {goods.money_cents > 0 && <li className="nums font-semibold text-gold">{formatMoney(goods.money_cents)}</li>}
      {goods.items.map((i) => (
        <li key={key(i)} className="flex items-baseline gap-2">
          <span className="nums text-fg-3">{i.qty}×</span>
          <span className="min-w-0 flex-1">{itemName(i.item_id)}</span>
          <span className="nums text-xs text-fg-3">{formatMoney(i.value_cents * i.qty)}</span>
        </li>
      ))}
    </ul>
  )
}
