import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { ALL_ITEMS, NAV } from '@/app/nav.ts'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { texts } from '@/texts/de.ts'
import { InfoTip } from './InfoTip.tsx'

/** Every page sits in this frame: breadcrumb, big title, one-sentence explanation, optional "i". */
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
  const { pathname } = useLocation()
  const item = ALL_ITEMS.find((i) => i.path === pathname)
  const group = item && NAV.find((g) => g.items.includes(item))
  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <p className="flex items-center gap-1.5 text-sm text-fg-3">
          <PixelIcon name={icon} className="text-accent" />
          {group && <span>{texts.nav.groups[group.group]} /</span>}
          <span className="font-semibold text-fg-2">{item ? texts.nav.items[item.id] : title}</span>
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-4xl leading-none font-bold tracking-tight max-md:text-3xl">
          {title}
          {tip && <InfoTip>{tip}</InfoTip>}
        </h1>
        {subtitle && <p className="mt-2.5 text-fg-2">{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}
