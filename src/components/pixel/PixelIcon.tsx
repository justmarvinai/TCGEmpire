import { memo } from 'react'
import { ICONS, type IconName } from './icon-data.ts'

export type { IconName }

// Turns a 16x16 character grid into two SVG paths (full ink and half ink), merged per row run.
function buildPaths(grid: readonly string[]) {
  let full = ''
  let half = ''
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch !== '#' && ch !== '+') {
        x++
        continue
      }
      let end = x
      while (row[end] === ch) end++
      const seg = `M${x} ${y}h${end - x}v1h-${end - x}z`
      if (ch === '#') full += seg
      else half += seg
      x = end
    }
  })
  return { full, half }
}

const cache = new Map<IconName, { full: string; half: string }>()

/** Pixel icon in the current text colour. `scale` is an integer: 1 = 16 px, 2 = 32 px. */
export const PixelIcon = memo(function PixelIcon({
  name,
  scale = 1,
  className,
  title,
}: {
  name: IconName
  scale?: 1 | 2 | 3 | 4
  className?: string
  title?: string
}) {
  let paths = cache.get(name)
  if (!paths) {
    paths = buildPaths(ICONS[name])
    cache.set(name, paths)
  }
  return (
    <svg
      viewBox="0 0 16 16"
      width={16 * scale}
      height={16 * scale}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      <path d={paths.full} />
      {paths.half && <path d={paths.half} opacity={0.5} />}
    </svg>
  )
})
