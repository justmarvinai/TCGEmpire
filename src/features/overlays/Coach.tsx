// Mutti's guide: dims the page, cuts a spotlight around the element a step points at ([data-tour="…"]) and shows her
// message beside it. While it marks something (or has nothing to mark but must be read), clicks elsewhere are
// blocked. Used by the tutorial and the first-visit tours of unlocked features.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '@/lib/settings.ts'

type Rect = { x: number; y: number; w: number; h: number }
/** rect: where the target is now; anchor: where the bubble sits, moved only when the target really moved */
export type Spot = { id: string; rect: Rect; anchor: Rect }

const moved = (a: Rect, b: Rect) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)) > 32

const PAD = 6
const GAP = 14
const BUBBLE_W = 352

const topDialog = () => {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"]')
  return all.length ? all[all.length - 1]! : null
}

/** The button that opens the menu drawer on phones (data-tour in the Shell header). */
export const MENU_BUTTON = 'nav-menu'

/**
 * The element `id` marks: on screen, inside the open dialog if there is one, and clickable if asked. A closed menu
 * drawer lies beside the screen, so its entries do not count; `nav:` entries are then reached through MENU_BUTTON.
 */
function findTarget(id: string, enabled: boolean): [string, HTMLElement] | null {
  const scope: ParentNode = topDialog() ?? document
  for (const el of scope.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    const r = el.getBoundingClientRect()
    const onScreen = r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth
    if (onScreen && !(enabled && el.matches(':disabled, [aria-disabled="true"]'))) return [id, el]
  }
  return id.startsWith('nav:') ? findTarget(MENU_BUTTON, enabled) : null
}

/**
 * Which of `ids` is on screen right now, the last one winning (later steps of a task come later in the list),
 * and whether a dialog is open. Checked a few times a second, so it follows navigation, loading and scrolling.
 * `enabled`: only mark what can be clicked (the tutorial waits for a click; a tour only shows).
 */
export function useSpot(ids: readonly string[], enabled = false) {
  const key = ids.join('|')
  const reduced = useSettings((s) => s.reducedMotion)
  const [state, setState] = useState<{ spot: Spot | null; dialog: boolean }>({ spot: null, dialog: false })
  useEffect(() => {
    const list = key ? key.split('|') : []
    let last = ''
    let lastId = ''
    let anchor: Rect | null = null
    const tick = () => {
      let spot: Spot | null = null
      for (let i = list.length - 1; i >= 0 && !spot; i--) {
        const found = findTarget(list[i]!, enabled)
        if (!found) continue
        const [id, el] = found
        const r = el.getBoundingClientRect()
        const rect = { x: r.left, y: r.top, w: r.width, h: r.height }
        if (!anchor || id !== lastId || moved(anchor, rect)) anchor = rect
        spot = { id, rect, anchor }
        if (id !== lastId && (r.top < 0 || r.bottom > window.innerHeight)) {
          el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
        }
      }
      lastId = spot?.id ?? ''
      const dialog = topDialog() !== null
      const r = spot?.rect
      const sig = `${dialog}|${spot?.id ?? ''}|${r ? [r.x, r.y, r.w, r.h].map(Math.round).join(',') : ''}`
      if (sig !== last) {
        last = sig
        setState({ spot, dialog })
      }
    }
    tick()
    const timer = window.setInterval(tick, 150)
    window.addEventListener('scroll', tick, true)
    window.addEventListener('resize', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', tick, true)
      window.removeEventListener('resize', tick)
    }
  }, [key, reduced, enabled])
  return state
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Beside a target in the left menu, else below or above it (where there is room, the nearer half first), else at
 * the bottom of the screen over a target too tall to sit next to. Always fully on screen, so its buttons can be clicked.
 */
function bubbleStyle(r: Rect | null, block: boolean, h: number): CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(BUBBLE_W, vw - 32)
  const fit = (top: number) => clamp(top, 16, Math.max(16, vh - h - 16))
  if (!r) return { left: (vw - w) / 2, top: block ? fit((vh - h) / 2) : fit(vh - h - 24), width: w }
  if (r.x + r.w < vw * 0.3 && r.x + r.w + GAP + w + 16 < vw) {
    return { left: r.x + r.w + PAD + GAP, top: fit(r.y - 12), width: w }
  }
  const left = clamp(r.x + r.w / 2 - w / 2, 16, vw - w - 16)
  const below = r.y + r.h + PAD + GAP
  const above = r.y - PAD - GAP - h
  const inView = (top: number) => top >= 16 && top + h <= vh - 16
  const top = (r.y + r.h / 2 < vh / 2 ? [below, above] : [above, below]).find(inView)
  return { left, top: top ?? fit(vh - h - 16), width: w }
}

/** Swallows a click on the dimmed area. */
const stop = (e: SyntheticEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

function Dim({ style }: { style: CSSProperties }) {
  return <div className="fixed z-55 bg-ink/65" style={style} onPointerDown={stop} onClick={stop} aria-hidden />
}

export function Coach({
  spot,
  block,
  label,
  head,
  text,
  hint,
  actions,
}: {
  spot: Spot | null
  /** dim and block everything outside the spot (everything, when there is no spot) */
  block: boolean
  label: string
  head: ReactNode
  text: string
  hint?: string
  actions?: ReactNode
}) {
  const r = spot?.rect ?? null
  const hole = r && { x0: r.x - PAD, y0: r.y - PAD, x1: r.x + r.w + PAD, y1: r.y + r.h + PAD }
  const bubble = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(160)
  useLayoutEffect(() => {
    const el = bubble.current
    if (!el) return
    const watch = new ResizeObserver(() => setHeight(el.offsetHeight))
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  return createPortal(
    <>
      {block &&
        (hole ? (
          <>
            <Dim style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.y0) }} />
            <Dim style={{ left: 0, top: hole.y1, right: 0, bottom: 0 }} />
            <Dim style={{ left: 0, top: hole.y0, width: Math.max(0, hole.x0), height: hole.y1 - hole.y0 }} />
            <Dim style={{ left: hole.x1, top: hole.y0, right: 0, height: hole.y1 - hole.y0 }} />
          </>
        ) : (
          <Dim style={{ inset: 0 }} />
        ))}
      {hole && <div className="coach-ring z-56" style={{ left: hole.x0, top: hole.y0, width: hole.x1 - hole.x0, height: hole.y1 - hole.y0 }} aria-hidden />}
      <aside
        className="panel-float fixed z-57 flex gap-3 p-4 animate-fade-up"
        ref={bubble}
        style={bubbleStyle(spot?.anchor ?? null, block, height)}
        aria-live="polite"
        aria-label={label}
        data-coach
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tier-grail font-pixel text-xl text-accent-fg">M</span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs text-fg-3">{head}</p>
          <p className="text-sm leading-snug">{text}</p>
          {hint && <p className="text-sm font-semibold text-accent">→ {hint}</p>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </aside>
    </>,
    document.body,
  )
}
