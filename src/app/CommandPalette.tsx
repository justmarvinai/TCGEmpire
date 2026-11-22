import clsx from 'clsx'
import { Dialog as Radix } from 'radix-ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { PixelIcon } from '@/components/pixel/PixelIcon.tsx'
import type { Player } from '@/lib/schemas.ts'
import { sfx } from '@/lib/sfx.ts'
import { useWorld } from '@/lib/world.ts'
import { texts } from '@/texts/de.ts'
import { NAV } from './nav.ts'

const ENTRIES = NAV.flatMap((g) => g.items.map((item) => ({ item, group: texts.nav.groups[g.group], label: texts.nav.items[item.id] })))

/** Strg+K: jump to any page by typing part of its name. Locked pages are listed but cannot be opened. */
export function CommandPalette({ player }: { player: Player }) {
  const open = useWorld((s) => s.paletteOpen)
  const apply = useWorld((s) => s.apply)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        apply({ paletteOpen: !useWorld.getState().paletteOpen })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apply])

  return (
    <Radix.Root open={open} onOpenChange={(o) => apply({ paletteOpen: o })}>
      <Radix.Portal>
        <Radix.Overlay className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm" />
        <Radix.Content
          aria-describedby={undefined}
          className="panel-float fixed top-[14vh] left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden p-0 animate-fade-up"
        >
          <Radix.Title className="sr-only">{texts.palette.title}</Radix.Title>
          {open && <Search level={player.level} onDone={() => apply({ paletteOpen: false })} />}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  )
}

function Search({ level, onDone }: { level: number; onDone: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const q = query.trim().toLowerCase()
  const hits = ENTRIES.filter((e) => !q || e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
  const usable = (e: (typeof ENTRIES)[number]) => level >= e.item.level
  const go = (e: (typeof ENTRIES)[number] | undefined) => {
    if (!e || !usable(e)) return
    sfx('click')
    navigate(e.item.path)
    onDone()
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <PixelIcon name="search" className="text-fg-3" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1))
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            else if (e.key === 'Enter') go(hits[active])
            else return
            e.preventDefault()
          }}
          placeholder={texts.palette.placeholder}
          aria-label={texts.palette.title}
          className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-fg-3"
        />
        <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 text-xs text-fg-3">Esc</kbd>
      </div>
      {hits.length === 0 ? (
        <p className="p-6 text-center text-sm text-fg-3">{texts.palette.empty}</p>
      ) : (
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label={texts.palette.title}>
          {hits.map((e, i) => (
            <li key={e.item.id} role="option" aria-selected={i === active} aria-disabled={!usable(e)}>
              <button
                type="button"
                disabled={!usable(e)}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(e)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                  i === active && usable(e) ? 'bg-grad text-white' : 'text-fg-2',
                  !usable(e) && 'opacity-50',
                )}
              >
                <PixelIcon name={usable(e) ? e.item.icon : 'lock'} />
                <span className="flex-1 font-medium">{e.label}</span>
                <span className={clsx('text-xs', i === active && usable(e) ? 'text-white/80' : 'text-fg-3')}>
                  {usable(e) ? (e.item.built ? e.group : texts.nav.soon) : texts.nav.lockedLevel(e.item.level)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
