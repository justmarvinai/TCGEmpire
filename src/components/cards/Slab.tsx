import clsx from 'clsx'
import { Card } from './Card.tsx'
import { Emblem } from '@/components/pixel/Emblem.tsx'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { cardById, setOfCard, SETS } from '@/lib/catalog.ts'
import type { SlabLabel } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'
import { SLAB, type SlabStyle } from '../../../art/products/slab-geometry.ts'
import { LABEL_COLORS } from '../../../content/company.ts'

export type { SlabStyle }

/**
 * A graded card: one reusable frame per label style, the card sprite inside, and the label written
 * as normal text on top (owner decision: no pixel slab per graded card).
 */
export function Slab({
  variant,
  cardId,
  title,
  subtitle,
  grade,
  gradeWord,
  cert,
  brand,
  company,
  scale = 3,
  className,
}: {
  variant: SlabStyle
  cardId: string
  title: string
  subtitle: string
  grade: string
  gradeWord: string
  cert: string
  /** name printed in the brand cell; only for player companies (the big graders have their logo) */
  brand?: string
  /** a player company's label: its colours and emblem are printed over the plain company frame */
  company?: { name: string; label: { bg: string; fg: string; emblem: string } }
  scale?: number
  className?: string
}) {
  const bg = company && (LABEL_COLORS[company.label.bg] ?? LABEL_COLORS.weiss!)
  const fg = company && (LABEL_COLORS[company.label.fg] ?? LABEL_COLORS.schwarz!)
  const colors = company ? { ink: fg!, accent: fg!, onBand: fg! } : SLAB.colors[variant]
  const zone = (z: keyof typeof SLAB.zones, text: string, color: string, weight = 700) => {
    const r = SLAB.zones[z]
    return (
      <span
        className="absolute overflow-hidden leading-none whitespace-nowrap"
        style={{
          left: r.x * scale,
          top: r.y * scale,
          width: r.w * scale,
          height: r.h * scale,
          fontSize: r.h * scale * 0.86,
          fontWeight: weight,
          color,
          textAlign: r.align,
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </span>
    )
  }
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: SLAB.w * scale, height: SLAB.h * scale }} role="img" aria-label={`${title} ${grade}`}>
      <PixelProduct id={`slab-${variant}`} scale={scale} fallback={{ w: SLAB.w, h: SLAB.h }} className="absolute inset-0" />
      <div className="absolute" style={{ left: SLAB.card.x * scale, top: SLAB.card.y * scale }}>
        <Card id={cardId} scale={scale} foil="sweep" />
      </div>
      {company && (
        <div
          className="absolute"
          style={{ left: SLAB.label.x * scale, top: SLAB.label.y * scale, width: SLAB.label.w * scale, height: SLAB.label.h * scale, background: bg }}
        >
          {/* the emblem sits in the brand cell, where the big graders print their logo */}
          <Emblem
            bits={company.label.emblem}
            fg={fg!}
            bg={bg!}
            scale={scale}
            className="absolute"
            style={{ left: (SLAB.zones.brand.x - SLAB.label.x + (SLAB.zones.brand.w - 8) / 2) * scale, top: (SLAB.zones.brand.y - SLAB.label.y) * scale }}
          />
        </div>
      )}
      {zone('title', title.toUpperCase(), colors.ink, 800)}
      {zone('subtitle', subtitle, colors.ink, 600)}
      {zone('cert', company ? `${company.name} · ${cert}` : cert, colors.accent, 600)}
      {zone('gradeWord', gradeWord, colors.accent, 800)}
      {zone('grade', grade, colors.ink, 800)}
      {brand && !company && zone('brand', brand, colors.onBand, 800)}
    </div>
  )
}

const T = texts.grading

/** Label style of a slab: BGS gold from 9.5, silver below, black for the Black Label. */
export function slabStyleOf(s: Pick<SlabLabel, 'grader' | 'grade' | 'black_label'>): SlabStyle {
  if (s.grader.startsWith('co:')) return 'company'
  if (s.grader !== 'bgs') return s.grader as SlabStyle
  return s.black_label ? 'bgs-black' : s.grade >= 9.5 ? 'bgs' : 'bgs-silver'
}

/** "10", "9.5" as printed on a label. */
export const labelGrade = (g: number) => (Number.isInteger(g) ? String(g) : g.toFixed(1))

/** "PSA 10", "BGS 9,5", "BGS Black Label 10" for running German text. */
export function slabName(s: Pick<SlabLabel, 'grader' | 'grade' | 'black_label'> & { company?: SlabLabel['company'] }) {
  const g = labelGrade(s.grade).replace('.', ',')
  return `${graderName(s.grader, s.company?.name)} ${s.black_label ? `${T.blackLabel} ` : ''}${g}`
}

/** "PSA", "BGS", "CGC" or the company's name. */
export function graderName(grader: string, companyName?: string | null) {
  return grader.startsWith('co:') ? (companyName ?? T.companySlab) : grader.toUpperCase()
}

function gradeWord(s: Pick<SlabLabel, 'grader' | 'grade'>) {
  const words = T.words[s.grader.startsWith('co:') ? 'psa' : s.grader] ?? {}
  return words[s.grade] ?? words[Math.floor(s.grade)] ?? ''
}

/** Set name and number, e.g. "Basis-Set · 090". */
function setLine(cardId: string) {
  const card = cardById.get(cardId)
  const set = SETS.find((x) => x.id === setOfCard(cardId))
  return `${set?.name ?? ''} · ${String(card?.no ?? 0).padStart(3, '0')}`
}

/**
 * The slab of a graded copy, straight from the server's label. BGS prints the four sub-grades where the
 * others print set and number. `hidden` covers the grade (for the reveal).
 */
export function SlabOf({ cardId, slab, scale = 2, hidden, className }: { cardId: string; slab: SlabLabel; scale?: number; hidden?: boolean; className?: string }) {
  const subtitle =
    slab.grader === 'bgs' && slab.subgrades
      ? slab.subgrades.map((g, i) => `${T.subLetters[i]} ${labelGrade(g)}`).join(' · ')
      : setLine(cardId)
  return (
    <Slab
      variant={hidden ? (slab.grader === 'bgs' ? 'bgs' : slabStyleOf(slab)) : slabStyleOf(slab)}
      cardId={cardId}
      title={cardById.get(cardId)?.name ?? cardId}
      subtitle={hidden ? setLine(cardId) : subtitle}
      grade={hidden ? '?' : labelGrade(slab.grade)}
      gradeWord={hidden ? '' : gradeWord(slab)}
      cert={slab.cert_no}
      company={slab.company ?? undefined}
      scale={scale}
      className={className}
    />
  )
}
