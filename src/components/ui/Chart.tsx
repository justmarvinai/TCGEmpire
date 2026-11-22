import { useId } from 'react'

const TONES = { accent: 'var(--color-accent)', gain: 'var(--color-gain)', loss: 'var(--color-loss)' }

/** Area chart of a value over time. `points` are [unix seconds, value]; numbers are shown around it. */
export function Chart({ points, height = 96, tone = 'accent', label }: {
  points: readonly (readonly [number, number])[]
  height?: number
  tone?: keyof typeof TONES
  label?: string
}) {
  const id = useId()
  if (points.length < 2) return null
  const W = 400
  const t0 = points[0]![0]
  const t1 = points[points.length - 1]![0]
  const ys = points.map((p) => p[1])
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (hi === lo) {
    hi += 1
    lo -= 1
  }
  const pad = (hi - lo) * 0.12
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W
  const y = (v: number) => height - ((v - lo + pad) / (hi - lo + 2 * pad)) * height
  const line = points.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join('')
  const color = TONES[tone]
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W} ${height}L0 ${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
