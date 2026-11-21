import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/lib/settings.ts'

/** A number that counts to its new value instead of jumping. */
export function NumberTicker({
  value,
  format,
  className,
  durationMs = 600,
}: {
  value: number
  format: (n: number) => string
  className?: string
  durationMs?: number
}) {
  const reduced = useSettings((s) => s.reducedMotion)
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(a + (value - a) * eased)
      setShown(current)
      from.current = current
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced, durationMs])

  return <span className={className ?? 'nums'}>{format(shown)}</span>
}
