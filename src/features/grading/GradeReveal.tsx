import clsx from 'clsx'
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { graderName, SlabOf } from '@/components/cards/Slab.tsx'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Burst } from '@/features/open/OpeningStage.tsx'
import { cardName, type Tier } from '@/lib/catalog.ts'
import { formatFactor, formatMoney } from '@/lib/format.ts'
import type { GradeResult, SlabLabel } from '@/lib/schemas.ts'
import { useSettings } from '@/lib/settings.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { GRADEPACK } from '../../../art/products/gradepack-geometry.ts'
import { SLAB } from '../../../art/products/slab-geometry.ts'

const T = texts.grading

/**
 * sealed: the return pack waits to be torn open · tear: the strip flies off · rise: the slab slides out of the pack ·
 * tension: drum roll, heartbeat, BGS sub-grades one by one, the grade still under the seal sticker · peel: the
 * sticker comes off · shown: the grade slams in with an effect that fits it.
 */
type Phase = 'sealed' | 'tear' | 'rise' | 'tension' | 'peel' | 'shown'
const MS = { tear: 600, rise: 1300, tension: 2700, peel: 650 }
/** Where the slab sits inside the pack box (pack pixels): centred, under the tear line until it rises. */
const SLAB_AT = { x: (GRADEPACK.w - SLAB.w) / 2, y: 8 }
/** The seal sticker covers grade and grade word on the label (slab pixels). */
const STICKER = { x: SLAB.zones.gradeWord.x - 1, y: SLAB.zones.gradeWord.y - 1, w: SLAB.zones.gradeWord.w + 2, h: 14 }

const reducedNow = () => useSettings.getState().reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The finish: a burst like a pull of that tier for the good grades, a thud for the bad ones. */
function burstOf(s: SlabLabel): Tier | null {
  if (s.black_label || s.grade >= 10) return 'grail'
  if (s.grade >= 9) return 'ultra'
  if (s.grade >= 8) return 'holo'
  return null
}

/** Plays the sound that fits a grade. */
function gradeSound(s: SlabLabel) {
  if (s.black_label) sfx('grail')
  else if (s.grade === 10) sfx('ultra')
  else if (s.grade >= 9) sfx('holo')
  else if (s.grade >= 8) sfx('rare')
  else sfx('error')
}

/**
 * The slabs back from the grader, one sealed pack at a time: tear it open, the slab slides out, the drum roll builds
 * up, the seal sticker peels off the grade. A click or Escape skips to the grade; "Sofort aufdecken" skips it all.
 */
export function GradeReveal({ results, onClose }: { results: GradeResult[]; onClose: () => void }) {
  const instant = useSettings((s) => s.instantReveal)
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>(instant ? 'shown' : 'sealed')
  const [subs, setSubs] = useState(0)
  const [amp, setAmp] = useState(1)
  const r = results[i]
  const scale = typeof window !== 'undefined' && (window.innerWidth < 640 || window.innerHeight < 760) ? 2 : 3

  // Level-ups and other overlays wait until the last slab is shown (like the pack opening).
  useEffect(() => {
    useWorld.getState().apply({ stageOpen: true })
    return () => useWorld.getState().apply({ stageOpen: false })
  }, [])

  // the phase machine: each phase starts its sound and hands over to the next one
  useEffect(() => {
    if (!r) return
    const timers: number[] = []
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, reducedNow() ? Math.min(ms, 200) : ms))
    let beats = 0
    if (phase === 'tear') {
      sfx('tear')
      later(MS.tear, () => setPhase('rise'))
    } else if (phase === 'rise') {
      later(MS.rise, () => setPhase('tension'))
    } else if (phase === 'tension') {
      sfx('drumroll')
      sfx('heartbeat')
      beats = window.setInterval(() => sfx('heartbeat'), 640)
      later(900, () => setAmp(2))
      later(1800, () => setAmp(3.5))
      if (r.slab.grader === 'bgs' && r.slab.subgrades) {
        for (let k = 1; k <= 4; k++) later(300 + k * 480, () => (setSubs(k), sfx('flip')))
      }
      later(MS.tension, () => setPhase('peel'))
    } else if (phase === 'peel') {
      sfx('peel')
      later(MS.peel, () => setPhase('shown'))
    } else if (phase === 'shown') {
      sfx('slam')
      later(150, () => gradeSound(r.slab))
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(beats)
    }
  }, [phase, i, r])

  // Space or Enter tears the pack open, Escape skips to the grade (and closes once it is shown)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && phase === 'sealed') {
        e.preventDefault()
        setPhase('tear')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (phase === 'shown') onClose()
        else setPhase('shown')
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [phase, onClose])

  if (!r) return null
  const last = i === results.length - 1
  const next = () => {
    if (last) onClose()
    else {
      setI(i + 1)
      setSubs(0)
      setAmp(1)
      setPhase(instant ? 'shown' : 'sealed')
    }
  }
  const px = (n: number) => n * scale
  const pack = `gradepack-${r.slab.grader.startsWith('co:') ? 'company' : r.slab.grader}`
  const burst = burstOf(r.slab)
  const inPack = phase === 'sealed' || phase === 'tear' || phase === 'rise'
  const covered = phase !== 'peel' && phase !== 'shown'
  const suspense = phase === 'tension' || phase === 'peel'
  const grader = graderName(r.slab.grader, r.slab.company?.name)

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden bg-ink/90 p-4 backdrop-blur-xl" role="dialog" aria-modal aria-label={T.revealTitle}>
      <header className="absolute top-4 right-4 left-4 flex items-center justify-between gap-3">
        <p className="font-pixel text-lg">
          {T.revealTitle} <span className="text-fg-3">· {results.length > 1 ? `${i + 1} / ${results.length} · ` : ''}{cardName(r.card_id)}</span>
        </p>
        {phase !== 'sealed' && phase !== 'shown' && (
          <Button size="sm" onClick={() => setPhase('shown')} aria-label={T.skip}>
            {T.skipShort}
          </Button>
        )}
      </header>

      <div
        className={clsx('relative', phase === 'sealed' && 'cursor-pointer')}
        style={{ width: px(GRADEPACK.w), height: px(GRADEPACK.h) }}
        onClick={() => (phase === 'sealed' ? setPhase('tear') : phase !== 'shown' && setPhase('shown'))}
      >
        {suspense && (
          <div className="pointer-events-none absolute inset-0 gp-charge">
            <div className="glow" style={{ '--glow': 'rgb(255 255 255 / 0.22)' } as CSSProperties} />
          </div>
        )}
        {phase === 'shown' && burst && <Burst tier={burst} />}

        {/* while in the pack the slab is cut off at the pack's bottom edge: it can only show above the torn opening */}
        <div className="absolute inset-0" style={inPack ? { clipPath: 'inset(-200% -50% 0 -50%)' } : undefined}>
          <div
            className={clsx('absolute', (phase === 'sealed' || phase === 'tear') && 'gp-slab-hidden', phase === 'rise' && 'gp-slab-rise')}
            style={{ left: px(SLAB_AT.x), top: px(SLAB_AT.y) }}
          >
            <div className={clsx(suspense && 'anim-heartbeat', phase === 'shown' && (burst ? 'gp-slam' : 'gp-thud'))}>
              <div className={clsx('relative', phase === 'tension' && 'anim-rattle')} style={{ '--amp': `${amp}px` } as CSSProperties}>
                <SlabOf cardId={r.card_id} slab={r.slab} scale={scale} hidden={covered} subs={subs} />
                {phase !== 'shown' && (
                  <span
                    className={clsx('gp-sticker', phase === 'peel' && 'gp-peel')}
                    style={{ left: px(STICKER.x), top: px(STICKER.y), width: px(STICKER.w), height: px(STICKER.h), fontSize: px(9) }}
                    aria-hidden
                  >
                    ?
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {inPack && (
          <div className={clsx('absolute inset-0', phase === 'sealed' && 'anim-bob')}>
            <div className={clsx('absolute inset-0', phase === 'rise' && 'gp-pack-drop')} style={{ clipPath: `inset(${px(GRADEPACK.tear)}px 0 0 0)` }}>
              <PixelProduct id={pack} scale={scale} fallback={GRADEPACK} />
            </div>
            {phase === 'sealed' && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${px(GRADEPACK.h - GRADEPACK.tear)}px 0)` }}>
                <PixelProduct id={pack} scale={scale} fallback={GRADEPACK} />
              </div>
            )}
            {phase === 'tear' && (
              <div className="absolute inset-0 anim-strip-off" style={{ clipPath: `inset(0 0 ${px(GRADEPACK.h - GRADEPACK.tear)}px 0)` }}>
                <PixelProduct id={pack} scale={scale} fallback={GRADEPACK} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-28 flex-col items-center gap-2 text-center" aria-live="polite">
        {phase === 'sealed' && (
          <>
            <p className="font-semibold">{T.parcel(grader)}</p>
            <Button variant="primary" autoFocus onClick={() => setPhase('tear')}>
              {T.open}
            </Button>
            <p className="text-xs text-fg-3">{T.sealedHint}</p>
          </>
        )}
        {(phase === 'tear' || phase === 'rise') && <p className="font-semibold text-fg-2">{T.sliding}</p>}
        {suspense && <p className="font-pixel text-2xl anim-heartbeat">{T.drum}</p>}
        {phase === 'shown' && (
          <>
            <p className={clsx('text-lg font-bold anim-stamp', burst ? 'text-gold' : 'text-fg-2')}>{T.verdict(r.slab.grade, r.slab.black_label)}</p>
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
    </div>,
    document.body,
  )
}
