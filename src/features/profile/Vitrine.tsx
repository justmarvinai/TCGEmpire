import clsx from 'clsx'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/cards/Card.tsx'
import { SlabOf, slabName } from '@/components/cards/Slab.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { Panel } from '@/components/ui/Panel.tsx'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States.tsx'
import { toast } from '@/components/ui/toast.tsx'
import { useAct, useGrading } from '@/lib/actions.ts'
import { cardName, UNLOCKS } from '@/lib/catalog.ts'
import { formatMoney } from '@/lib/format.ts'
import { errorText, rpc } from '@/lib/rpc.ts'
import type { Profile, SlabLabel } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { texts } from '@/texts/de.ts'

const T = texts.profile

/** A player's public profile (own profile without an id). */
export const useProfile = (id: string | null) =>
  useQuery({ queryKey: ['profile', id ?? 'me'], queryFn: () => rpc('profile_get', { p_player: id }) })

interface Piece {
  copy_id: string
  card_id: string
  slab: SlabLabel | null
  value_cents: number
}

/** One exhibit: a slab, or a raw hit standing on its own. */
function Exhibit({ p }: { p: Piece }) {
  return (
    <figure className="flex flex-col items-center gap-1.5">
      {p.slab ? <SlabOf cardId={p.card_id} slab={p.slab} scale={2} /> : <Card id={p.card_id} scale={2} foil="sweep" />}
      <figcaption className="text-center text-xs">
        <span className="block font-semibold">{p.slab ? slabName(p.slab) : cardName(p.card_id)}</span>
        <span className="nums text-gold">{formatMoney(p.value_cents)}</span>
      </figcaption>
    </figure>
  )
}

/** The glass shelf: every place, filled or empty. */
function Shelf({ items, slots }: { items: Piece[]; slots: number }) {
  return (
    <div className="panel-inset flex flex-wrap items-end justify-center gap-6 p-5">
      {items.map((p) => (
        <Exhibit key={p.copy_id} p={p} />
      ))}
      {Array.from({ length: Math.max(0, slots - items.length) }, (_, i) => (
        <div key={i} className="grid h-[304px] w-[192px] place-items-center rounded-xl border-2 border-dashed border-line text-sm text-fg-3">
          {T.emptySlot}
        </div>
      ))}
    </div>
  )
}

export function VitrinePanel({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false)
  if (!profile.unlocked) {
    return (
      <Panel title={T.vitrine} tip={T.vitrineTip} className="xl:col-span-2">
        <EmptyState icon="lock" title={T.vitrineLocked(UNLOCKS.grading)} />
      </Panel>
    )
  }
  return (
    <Panel title={T.vitrine} tip={T.vitrineTip} className="xl:col-span-2">
      {profile.vitrine.length === 0 && !profile.me ? (
        <EmptyState icon="slab" title={T.vitrineEmptyOther} />
      ) : (
        <Shelf items={profile.vitrine} slots={profile.me ? profile.slots : profile.vitrine.length} />
      )}
      {profile.me && (
        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" onClick={() => setEditing(true)}>
            {T.vitrineEdit}
          </Button>
          {profile.vitrine.length === 0 && <span className="text-sm text-fg-3">{T.vitrineEmpty}</span>}
        </div>
      )}
      {editing && <VitrineEditor profile={profile} onClose={() => setEditing(false)} />}
    </Panel>
  )
}

/** Pick up to `slots` slabs or raw hits; the order of picking is the order on the shelf. */
function VitrineEditor({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const grading = useGrading()
  const act = useAct()
  const client = useQueryClient()
  const [picked, setPicked] = useState<string[]>(profile.vitrine.map((v) => v.copy_id))
  const [busy, setBusy] = useState(false)

  const candidates: Piece[] = [
    ...profile.vitrine,
    ...(grading.data?.slabs ?? [])
      .filter((s) => s.location === 'inventory')
      .map((s) => ({ copy_id: s.copy_id, card_id: s.card_id, slab: s.slab, value_cents: s.value_cents })),
    ...(grading.data?.copies ?? []).map((c) => ({ copy_id: c.copy_id, card_id: c.card_id, slab: null, value_cents: c.value_cents })),
  ]
  const full = picked.length >= profile.slots
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : full ? p : [...p, id]))

  const save = async () => {
    setBusy(true)
    const res = await act('vitrine_set', { p_copies: picked }, ['grading', 'binder'])
    setBusy(false)
    if (res) {
      client.setQueryData(['profile', 'me'], { ...profile, vitrine: res.vitrine, slots: res.slots })
      sfx('success')
      toast('success', T.vitrineSaved)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.vitrineEdit} description={T.vitrinePick(picked.length, profile.slots)}>
      {grading.isPending ? (
        <Skeleton className="h-60 w-full" />
      ) : grading.isError ? (
        <ErrorState message={errorText(grading.error)} onRetry={() => void grading.refetch()} />
      ) : candidates.length === 0 ? (
        <EmptyState icon="card" title={T.vitrineNothing} />
      ) : (
        <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-1">
          {candidates.map((c) => {
            const pos = picked.indexOf(c.copy_id)
            return (
              <li key={c.copy_id}>
                <label
                  className={clsx(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    pos >= 0 ? 'bg-surface-3' : 'bg-surface-2 hover:bg-surface-3',
                    pos < 0 && full && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input type="checkbox" checked={pos >= 0} disabled={pos < 0 && full} onChange={() => toggle(c.copy_id)} className="size-4 accent-accent" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{cardName(c.card_id)}</span>
                  {c.slab && <span className="rounded-md bg-surface-2 px-1.5 text-xs font-bold">{slabName(c.slab)}</span>}
                  <span className="nums text-xs text-gold">{formatMoney(c.value_cents)}</span>
                  {pos >= 0 && <span className="nums w-5 text-center font-pixel text-accent">{pos + 1}</span>}
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button variant="primary" loading={busy} onClick={() => void save()}>
          {T.vitrineSave}
        </Button>
      </div>
    </Dialog>
  )
}
