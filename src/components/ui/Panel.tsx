import clsx from 'clsx'
import type { ReactNode } from 'react'
import { InfoTip } from './InfoTip.tsx'

/** The standard container: pixel frame, optional title row with "i". */
export function Panel({
  title,
  tip,
  action,
  className,
  children,
}: {
  title?: string
  tip?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={clsx('px-panel p-3', className)}>
      {title && (
        <header className="mb-3 flex items-center gap-2">
          <h2 className="font-pixel text-lg leading-none tracking-wide text-fg">{title}</h2>
          {tip && <InfoTip>{tip}</InfoTip>}
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
