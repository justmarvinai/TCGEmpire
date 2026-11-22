import { Card } from './Card.tsx'
import { PixelProduct } from '@/components/pixel/PixelSprite.tsx'
import { SLAB, type SlabGrader } from '../../../art/products/slab-geometry.ts'

export type { SlabGrader }

/**
 * A graded card: one reusable frame per grading company, the card sprite inside, and the label
 * written as normal text on top (owner decision: no pixel slab per graded card).
 */
export function Slab({
  grader,
  cardId,
  title,
  subtitle,
  grade,
  gradeWord,
  cert,
  brand,
  scale = 3,
}: {
  grader: SlabGrader
  cardId: string
  title: string
  subtitle: string
  grade: string
  gradeWord: string
  cert: string
  /** name printed in the brand cell; only for player companies (the big graders have their logo) */
  brand?: string
  scale?: number
}) {
  const colors = SLAB.colors[grader]
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
    <div className="relative shrink-0" style={{ width: SLAB.w * scale, height: SLAB.h * scale }} role="img" aria-label={`${title} ${grade}`}>
      <PixelProduct id={`slab-${grader}`} scale={scale} fallback={{ w: SLAB.w, h: SLAB.h }} className="absolute inset-0" />
      <div className="absolute" style={{ left: SLAB.card.x * scale, top: SLAB.card.y * scale }}>
        <Card id={cardId} scale={scale} foil="sweep" />
      </div>
      {zone('title', title.toUpperCase(), colors.ink, 800)}
      {zone('subtitle', subtitle, colors.ink, 600)}
      {zone('cert', cert, colors.accent, 600)}
      {zone('gradeWord', gradeWord, colors.accent, 800)}
      {zone('grade', grade, colors.ink, 800)}
      {brand && zone('brand', brand, colors.onBand, 800)}
    </div>
  )
}
