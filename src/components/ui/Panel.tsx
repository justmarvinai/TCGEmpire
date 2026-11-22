import clsx from 'clsx'
import type { ReactNode } from 'react'
import { InfoTip } from './InfoTip.tsx'

/** The standard container: a glass tile with an optional small caps title and "i". */
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
    <section className={clsx('panel p-5', className)}>
      {title && (
        <header className="mb-4 flex min-h-5 items-center gap-1.5">
          <h2 className="eyebrow">{title}</h2>
          {tip && <InfoTip>{tip}</InfoTip>}
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
