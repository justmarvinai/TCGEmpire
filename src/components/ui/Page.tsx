import type { ReactNode } from 'react'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { InfoTip } from './InfoTip.tsx'

/** Every page sits in this frame: pixel title, one-sentence explanation, optional "i". */
export function Page({
  icon,
  title,
  subtitle,
  tip,
  children,
}: {
  icon: IconName
  title: string
  subtitle?: string
  tip?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="animate-fade-up">
      <header className="mb-5 flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center bg-surface-2 text-accent outline-2 outline-line">
          <PixelIcon name={icon} scale={2} />
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-pixel text-3xl leading-none">
            {title}
            {tip && <InfoTip>{tip}</InfoTip>}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-fg-2">{subtitle}</p>}
        </div>
      </header>
      {children}
    </div>
  )
}
