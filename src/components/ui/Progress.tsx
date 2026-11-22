import clsx from 'clsx'

const TONES = { accent: 'bg-grad', gain: 'bg-gain', gold: 'bg-gold', info: 'bg-info' }

/** Rounded progress bar. `value` 0..1; the fill moves by transform only. */
export function Progress({ value, className, tone = 'accent', label }: { value: number; className?: string; tone?: keyof typeof TONES; label?: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div className={clsx('h-full origin-left rounded-full transition-transform duration-300', TONES[tone])} style={{ transform: `scaleX(${v})` }} />
    </div>
  )
}
