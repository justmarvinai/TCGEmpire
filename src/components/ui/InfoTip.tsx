import { Popover } from 'radix-ui'
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { texts } from '@/texts/de.ts'
import { sfx } from '@/lib/sfx.ts'

/** The "i" next to every panel, stat and price: a short plain-German explanation. A custom trigger
 *  (for example a buff chip) replaces the "i". */
export function InfoTip({
  children,
  label = texts.common.info,
  trigger,
  triggerClassName,
}: {
  children: ReactNode
  label?: string
  trigger?: ReactNode
  /** style of a custom trigger (default: a small chip) */
  triggerClassName?: string
}) {
  return (
    <Popover.Root onOpenChange={(open) => open && sfx('toggle')}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={
            trigger
              ? (triggerClassName ??
                'grid size-11 place-items-center rounded-[0.9rem] border border-line bg-surface-2 text-warn backdrop-blur-xl hover:bg-surface-3 data-[state=open]:bg-surface-3')
              : 'inline-grid size-5 place-items-center text-fg-3 hover:text-accent data-[state=open]:text-accent transition-colors'
          }
        >
          {trigger ?? <PixelIcon name="info" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="panel-float z-50 max-w-72 p-3 text-sm leading-snug text-fg-2 animate-fade-up"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
