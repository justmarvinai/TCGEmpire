import { create } from 'zustand'
import clsx from 'clsx'
import { PixelIcon, type IconName } from '@/components/pixel/PixelIcon.tsx'
import { sfx } from '@/lib/sfx.ts'

type Kind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: Kind
  text: string
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }))
let nextId = 1

/** Short feedback in the corner. Errors say what to do next. */
export function toast(kind: Kind, text: string) {
  const id = nextId++
  useToasts.setState((s) => ({ items: [...s.items, { id, kind, text }].slice(-4) }))
  sfx(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'notify', true)
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4500)
}

const ICON: Record<Kind, IconName> = { success: 'check', error: 'close', info: 'info' }
const COLOR: Record<Kind, string> = { success: 'text-gain', error: 'text-loss', info: 'text-info' }

export function ToastViewport() {
  const items = useToasts((s) => s.items)
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-60 flex w-80 flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="panel-float pointer-events-auto flex items-start gap-2 p-2 text-sm animate-fade-up">
          <PixelIcon name={ICON[t.kind]} className={clsx('mt-0.5', COLOR[t.kind])} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
