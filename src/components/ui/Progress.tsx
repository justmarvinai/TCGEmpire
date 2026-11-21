import clsx from 'clsx'

/** Pixel progress bar. `value` 0..1. */
export function Progress({ value, className, tone = 'accent', label }: { value: number; className?: string; tone?: 'accent' | 'gain' | 'gold' | 'info'; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const tones = { accent: 'bg-accent', gain: 'bg-gain', gold: 'bg-gold', info: 'bg-info' }
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('h-2 w-full bg-ink outline-2 outline-line', className)}
    >
      <div className={clsx('h-full transition-[width] duration-300', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}
