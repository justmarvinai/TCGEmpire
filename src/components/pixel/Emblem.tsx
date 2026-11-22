import clsx from 'clsx'

/**
 * A company emblem: 8×8 pixels in two colours from 16 hex digits (one byte per row, the highest bit on the left),
 * at an integer scale.
 */
export function Emblem({
  bits,
  fg,
  bg,
  scale = 2,
  className,
}: {
  bits: string
  fg: string
  bg: string
  scale?: number
  className?: string
}) {
  const rects: string[] = []
  for (let y = 0; y < 8; y++) {
    const row = parseInt(bits.slice(y * 2, y * 2 + 2), 16) || 0
    for (let x = 0; x < 8; x++) if (row & (0x80 >> x)) rects.push(`M${x} ${y}h1v1h-1z`)
  }
  return (
    <svg
      width={8 * scale}
      height={8 * scale}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      className={clsx('shrink-0', className)}
      aria-hidden
    >
      <rect width="8" height="8" fill={bg} />
      <path d={rects.join('')} fill={fg} />
    </svg>
  )
}

/** Sets or clears one pixel and its mirror image. */
export function toggleEmblem(bits: string, x: number, y: number): string {
  const rows = Array.from({ length: 8 }, (_, i) => parseInt(bits.slice(i * 2, i * 2 + 2), 16) || 0)
  const on = !(rows[y]! & (0x80 >> x))
  for (const px of new Set([x, 7 - x])) rows[y] = on ? rows[y]! | (0x80 >> px) : rows[y]! & ~(0x80 >> px)
  return rows.map((r) => r.toString(16).padStart(2, '0')).join('')
}

/** A symmetric emblem seeded from a text (the same name always gives the same emblem). */
export function emblemFrom(seed: string): string {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rows: number[] = []
  for (let y = 0; y < 8; y++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ y
    const half = (h >>> 8) & 0x0f
    let row = 0
    for (let x = 0; x < 4; x++) if (half & (1 << x)) row |= (0x80 >> x) | (0x01 << x)
    rows.push(row)
  }
  return rows.map((r) => r.toString(16).padStart(2, '0')).join('')
}
