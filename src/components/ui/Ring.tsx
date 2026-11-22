import { useId, type ReactNode } from 'react'

const STOPS = { gold: ['var(--color-gold)', 'var(--color-warn)'], accent: ['var(--color-accent-lo)', 'var(--color-accent-hi)'] }

/** Round progress (`value` 0..1) with something in the middle, e.g. a percentage. */
export function Ring({ value, size = 84, stroke = 10, tone = 'gold', label, children }: {
  value: number
  size?: number
  stroke?: number
  tone?: keyof typeof STOPS
  label?: string
  children?: ReactNode
}) {
  const id = useId()
  const v = Math.max(0, Math.min(1, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id}>
            <stop offset="0" stopColor={STOPS[tone][0]} />
            <stop offset="1" stopColor={STOPS[tone][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        {v > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />}
      </svg>
      <span className="nums absolute inset-0 grid place-items-center text-sm font-bold">{children}</span>
    </div>
  )
}
