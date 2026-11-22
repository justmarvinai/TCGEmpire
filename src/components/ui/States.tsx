import clsx from 'clsx'
import type { ReactNode } from 'react'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { Button } from './Button.tsx'
import { texts } from '@/texts/de.ts'

/** Loading placeholder in the shape of the content. No bare spinners. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <PixelIcon name={icon} scale={2} className="text-fg-3" />
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-fg-2">{children}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center" role="alert">
      <PixelIcon name="skull" scale={2} className="text-loss" />
      <p className="text-lg font-semibold">{texts.common.errorTitle}</p>
      <p className="max-w-sm text-sm text-fg-2">{message}</p>
      {onRetry && <Button onClick={onRetry}>{texts.common.retry}</Button>}
    </div>
  )
}
