import clsx from 'clsx'
import { Dialog as Radix } from 'radix-ui'
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { texts } from '@/texts/de.ts'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  wide,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** room for card grids: wider, and scrolls inside when it is taller than the screen */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <Radix.Portal>
        <Radix.Overlay className="fixed inset-0 z-40 bg-ink/80" />
        <Radix.Content
          className={clsx(
            'panel-float fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 p-4 animate-pop',
            wide ? 'max-h-[88vh] w-[min(94vw,58rem)] overflow-y-auto' : 'w-[min(92vw,30rem)]',
          )}
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex-1">
              <Radix.Title className="text-xl leading-tight font-bold tracking-tight">{title}</Radix.Title>
              {description && <Radix.Description className="mt-1 text-sm text-fg-2">{description}</Radix.Description>}
            </div>
            {/* a finger-sized target (the icon alone is 16 px) */}
            <Radix.Close
              aria-label={texts.common.close}
              className="-m-2 grid size-10 shrink-0 place-items-center rounded-lg text-fg-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <PixelIcon name="close" />
            </Radix.Close>
          </div>
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  )
}
