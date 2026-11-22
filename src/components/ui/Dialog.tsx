import { Dialog as Radix } from 'radix-ui'
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { texts } from '@/texts/de.ts'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <Radix.Portal>
        <Radix.Overlay className="fixed inset-0 z-40 bg-ink/80" />
        <Radix.Content className="panel-float fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 p-4 animate-pop">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex-1">
              <Radix.Title className="text-xl leading-tight font-bold tracking-tight">{title}</Radix.Title>
              {description && <Radix.Description className="mt-1 text-sm text-fg-2">{description}</Radix.Description>}
            </div>
            <Radix.Close aria-label={texts.common.close} className="text-fg-3 hover:text-fg">
              <PixelIcon name="close" />
            </Radix.Close>
          </div>
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  )
}
