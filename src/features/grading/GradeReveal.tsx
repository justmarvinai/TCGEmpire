import { useEffect, useState } from 'react'
import { Card } from '@/components/cards/Card.tsx'
import { graderName, SlabOf } from '@/components/cards/Slab.tsx'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Dialog } from '@/components/ui/Dialog.tsx'
import { cardName } from '@/lib/catalog.ts'
import { formatFactor, formatMoney } from '@/lib/format.ts'
import type { GradeResult } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'

const T = texts.grading
type Phase = 'parcel' | 'drum' | 'shown'

/** Plays the sound that fits a grade. */
function gradeSound(r: GradeResult) {
  if (r.slab.black_label) sfx('grail')
  else if (r.slab.grade === 10) sfx('ultra')
  else if (r.slab.grade >= 9) sfx('holo')
  else if (r.slab.grade >= 8) sfx('rare')
  else sfx('error')
}

/**
 * The parcels from the grader, one at a time: tear it open, drum roll, then the grade with its value.
 * A click skips the drum roll; "Sofort aufdecken" in the settings skips parcel and drum roll.
 */
export function GradeReveal({ results, onClose }: { results: GradeResult[]; onClose: () => void }) {
  const instant = useSettings((s) => s.instantReveal)
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>(instant ? 'shown' : 'parcel')
  const r = results[i]
  const scale = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3

  // Level-ups and other overlays wait until the last slab is shown (like the pack opening).
  useEffect(() => {
    useWorld.getState().apply({ stageOpen: true })
    return () => useWorld.getState().apply({ stageOpen: false })
  }, [])

  useEffect(() => {
    if (phase !== 'drum') return
    sfx('charge')
    const timer = setTimeout(() => setPhase('shown'), 1400)
    return () => clearTimeout(timer)
  }, [phase, i])

  useEffect(() => {
    if (phase === 'shown' && r) gradeSound(r)
  }, [phase, r])

  if (!r) return null
  const last = i === results.length - 1
  const next = () => {
    if (last) onClose()
    else {
      setI(i + 1)
      setPhase(instant ? 'shown' : 'parcel')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={T.revealTitle} description={`${i + 1} / ${results.length} · ${cardName(r.card_id)}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        {phase === 'parcel' && (
          <>
            <div className="relative grid place-items-center rounded-2xl bg-surface-2 p-6 anim-bob">
              <Card id={r.card_id} scale={1} className="opacity-40 blur-[1px]" />
              <PixelIcon name="gift" className="absolute size-16 text-accent" />
            </div>
            <p className="font-semibold">{T.parcel(graderName(r.slab.grader, r.slab.company?.name))}</p>
            <Button variant="primary" autoFocus onClick={() => setPhase('drum')}>
              {T.open}
            </Button>
          </>
        )}
        {phase === 'drum' && (
          <button type="button" onClick={() => setPhase('shown')} className="flex flex-col items-center gap-3" aria-label={T.skip}>
            <div className="anim-rattle">
              <SlabOf cardId={r.card_id} slab={r.slab} scale={scale} hidden />
            </div>
            <p className="font-pixel text-2xl anim-heartbeat">{T.drum}</p>
            <p className="text-xs text-fg-3">{T.skip}</p>
          </button>
        )}
        {phase === 'shown' && (
          <>
            <div className="animate-pop">
              <SlabOf cardId={r.card_id} slab={r.slab} scale={scale} />
            </div>
            <p className="font-semibold">{T.verdict(r.slab.grade, r.slab.black_label)}</p>
            <p className="nums text-sm text-fg-2">
              {T.rawToSlab(formatMoney(r.raw_cents), formatMoney(r.value_cents))}{' '}
              <b className={r.value_cents >= r.raw_cents ? 'text-gain' : 'text-loss'}>{formatFactor(r.value_cents / Math.max(1, r.raw_cents))}</b>
            </p>
            <p className="nums text-xs text-fg-3">
              {T.fee(formatMoney(r.fee_cents))} · {T.pop(r.slab.pop, r.slab.pop_higher)}
            </p>
            <Button variant="primary" autoFocus onClick={next}>
              {last ? T.done : T.next}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  )
}
