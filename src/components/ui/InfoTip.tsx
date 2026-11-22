import { Popover } from 'radix-ui'
import type { ReactNode } from 'react'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import { texts } from '@/texts/de.ts'
import { sfx } from '@/lib/sfx.ts'

/** The "i" next to every panel, stat and price: a short plain-German explanation. A custom trigger
 *  (for example a buff chip) replaces the "i". */
export function InfoTip({ children, label = texts.common.info, trigger }: { children: ReactNode; label?: string; trigger?: ReactNode }) {
  return (
    <Popover.Root onOpenChange={(open) => open && sfx('toggle')}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={
            trigger
              ? 'flex items-center bg-surface-3 px-1.5 py-1 text-warn outline-accent hover:outline-2 data-[state=open]:outline-2'
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
          className="px-panel z-50 max-w-72 p-2 text-sm leading-snug text-fg-2 animate-fade-up"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
