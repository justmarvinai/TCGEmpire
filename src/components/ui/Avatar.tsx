import clsx from 'clsx'
import { Card } from '@/components/cards/Card.tsx'
import type { Look } from '@/lib/schemas.ts'

/**
 * A player's picture: the artwork of the chosen card cropped into a circle (or the initial), with the bought frame
 * as a ring. The card sprite keeps an integer scale; the circle shows the upper middle of the card.
 */
export function Avatar({ name, look, size = 40, className }: { name: string; look?: Look | null; size?: number; className?: string }) {
  const card = look?.avatar_card
  const scale = Math.max(1, Math.round(size / 56))
  return (
    <span
      className={clsx('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-grad font-bold text-white', look?.frame, className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {card ? (
        <span className="absolute" style={{ left: (size - 80 * scale) / 2, top: -14 * scale }}>
          <Card id={card} scale={scale} foil="none" />
        </span>
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  )
}

/** A player's name in the bought name colour. */
export function PlayerName({ name, look, className }: { name: string; look?: Look | null; className?: string }) {
  return <span className={clsx(look?.name_color, className)}>{name}</span>
}
