import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { bonusText, SLOT_ICON } from '@/features/housing/HousingPage.tsx'
import { useAct } from '@/lib/actions.ts'
import { FURNISHING_SLOTS, FURNITURE, HOMES } from '@/lib/catalog.ts'
import { formatAgo, formatNumber } from '@/lib/format.ts'
import { useNow } from '@/lib/pure.ts'
import type { Profile } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.housing

/** Where a player lives: home, Wohnwert and what stands in it. */
export function HomeCard({ p }: { p: Profile }) {
  const home = HOMES[p.home.tier]!
  const items = FURNISHING_SLOTS.map((s) => ({ slot: s, item: FURNITURE.find((f) => f.key === p.home.furnishings[s.key]) })).filter((x) => x.item)
  return (
    <Panel title={p.me ? T.current : T.theirs} tip={T.currentTip}>
      <p className="flex items-center gap-2 text-xl font-bold">
        <PixelIcon name="house" className="text-accent" /> {home.name}
      </p>
      <p className="mt-1 text-sm text-fg-2">{home.text}</p>
      <p className="nums mt-2 text-sm">
        {T.wohnwert} <b>{formatNumber(p.home.wohnwert)}</b>
      </p>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {items.map(({ slot, item }) => (
            <li key={slot.key} className="flex items-center gap-2">
              <PixelIcon name={SLOT_ICON[slot.key]!} className="text-fg-3" />
              <span className="min-w-0 flex-1 truncate">{item!.name}</span>
              <span className="text-xs text-fg-3">{bonusText(item!)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Visitors write once a day; the host can delete entries in their own Gästebuch. */
export function Guestbook({ p }: { p: Profile }) {
  const act = useAct()
  const client = useQueryClient()
  const now = useNow()
  const offset = useWorld((s) => s.clockOffsetMs)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const key = ['profile', p.me ? 'me' : p.id]
  const put = (guestbook: Profile['guestbook'], signed = p.signed_today) => client.setQueryData(key, { ...p, guestbook, signed_today: signed })

  const sign = async () => {
    setBusy('sign')
    const res = await act('guestbook_sign', { p_host: p.id, p_body: text })
    setBusy(null)
    if (res) {
      put(res.guestbook, true)
      setText('')
      sfx('success')
      toast('success', T.signed)
    }
  }
  const remove = async (entry: number) => {
    setBusy(`d${entry}`)
    const res = await act('guestbook_delete', { p_entry: entry })
    setBusy(null)
    if (res) {
      put(res.guestbook)
      toast('info', T.removed)
    }
  }

  return (
    <Panel title={T.guestbook} tip={T.guestbookTip} className="xl:col-span-2">
      {!p.me && (
        <div className="mb-4 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder={T.guestbookPlaceholder}
            aria-label={T.guestbookPlaceholder}
            disabled={p.signed_today}
            rows={2}
            className="panel-inset w-full resize-none bg-transparent px-3 py-2 text-sm placeholder:text-fg-3"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" variant="primary" loading={busy === 'sign'} disabled={p.signed_today || !text.trim() || busy !== null} onClick={() => void sign()}>
              {T.sign}
            </Button>
            {p.signed_today && <span className="text-xs text-fg-3">{T.signedToday}</span>}
          </div>
        </div>
      )}
      {p.guestbook.length === 0 ? (
        <p className="text-sm text-fg-3">{T.guestbookEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {p.guestbook.map((g) => (
            <li key={g.id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <p className="flex items-center gap-2 text-xs text-fg-3">
                <b className="text-fg-2">{g.name ?? T.deleted}</b>
                {now > 0 && formatAgo(g.at, now + offset)}
                {p.me && (
                  <button type="button" className="ml-auto font-semibold hover:text-loss" disabled={busy !== null} onClick={() => void remove(g.id)}>
                    {T.remove}
                  </button>
                )}
              </p>
              <p className="mt-1 break-words">{g.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
