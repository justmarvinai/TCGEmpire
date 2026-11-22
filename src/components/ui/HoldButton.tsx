import clsx from 'clsx'
import { useRef, useState } from 'react'

/** For irreversible actions: fires only after being held for `ms`. */
export function HoldButton({
  onHold,
  disabled,
  children,
  ms = 1500,
}: {
  onHold: () => void
  disabled?: boolean
  children: React.ReactNode
  ms?: number
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const start = () => {
    if (disabled) return
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      onHold()
    }, ms)
  }
  const stop = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && start()}
      onKeyUp={stop}
      className="btn btn-danger relative min-h-10 overflow-hidden px-3 font-semibold"
    >
      <span
        aria-hidden
        className={clsx('absolute inset-0 origin-left bg-ink/35', holding ? 'scale-x-100' : 'scale-x-0')}
        style={{ transition: holding ? `transform ${ms}ms linear` : 'transform 120ms ease-out' }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}
