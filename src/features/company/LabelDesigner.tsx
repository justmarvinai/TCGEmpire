import clsx from 'clsx'
import { Emblem, emblemFrom, toggleEmblem } from '@/components/pixel/Emblem.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { InfoTip } from '@/components/ui/InfoTip.tsx'
import type { CompanyLabel } from '@/lib/schemas.ts'
import { texts } from '@/texts/de.ts'
import { LABEL_COLORS } from '../../../content/company.ts'

const T = texts.company
const COLOR_KEYS = Object.keys(LABEL_COLORS)
export const labelColor = (key: string) => LABEL_COLORS[key] ?? LABEL_COLORS.weiss!

/** The printed label of the company's slabs: colour, emblem, name and slogan. */
export function LabelPreview({
  label,
  name,
  slogan,
  className,
}: {
  label: CompanyLabel
  name: string
  slogan?: string
  className?: string
}) {
  const bg = labelColor(label.bg)
  const fg = labelColor(label.fg)
  return (
    <div
      className={clsx('flex items-center gap-3 rounded-lg px-3 py-2 shadow-inner', className)}
      style={{ background: bg, color: fg }}
    >
      <Emblem bits={label.emblem} fg={fg} bg={bg} scale={4} />
      <span className="min-w-0">
        <span className="block truncate text-lg leading-tight font-extrabold tracking-wide uppercase">
          {name || T.namePlaceholder}
        </span>
        {slogan !== undefined && (
          <span className="block truncate text-xs font-semibold opacity-80">
            {slogan || T.sloganPlaceholder}
          </span>
        )}
      </span>
    </div>
  )
}

/** Two colours and an 8×8 emblem with mirror symmetry. */
export function LabelDesigner({
  value,
  onChange,
  seed,
}: {
  value: CompanyLabel
  onChange: (v: CompanyLabel) => void
  seed: string
}) {
  const rows = Array.from({ length: 8 }, (_, y) => parseInt(value.emblem.slice(y * 2, y * 2 + 2), 16) || 0)
  return (
    <div className="flex flex-wrap gap-5">
      <div className="flex flex-col gap-3">
        {(['bg', 'fg'] as const).map((k) => (
          <fieldset key={k} className="flex flex-col gap-1">
            <legend className="mb-1 text-sm text-fg-3">{k === 'bg' ? T.bg : T.fg}</legend>
            <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={k === 'bg' ? T.bg : T.fg}>
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={value[k] === c}
                  aria-label={c}
                  onClick={() => onChange({ ...value, [k]: c })}
                  className={clsx(
                    'size-7 rounded-md outline-2 outline-offset-2 transition-transform hover:scale-110 focus-visible:outline-accent',
                    value[k] === c ? 'outline-fg' : 'outline-transparent',
                  )}
                  style={{ background: labelColor(c) }}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 flex items-center gap-1 text-sm text-fg-3">
          {T.emblem} <InfoTip>{T.emblemTip}</InfoTip>
        </legend>
        <div
          className="grid w-max grid-cols-8 gap-px rounded-md bg-line p-px"
          style={{ background: labelColor(value.bg) }}
        >
          {rows.map((row, y) =>
            Array.from({ length: 8 }, (_, x) => {
              const on = (row & (0x80 >> x)) !== 0
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  aria-label={`${x + 1}/${y + 1}`}
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, emblem: toggleEmblem(value.emblem, x, y) })}
                  className="size-5 focus-visible:outline-2 focus-visible:outline-accent"
                  style={{ background: on ? labelColor(value.fg) : 'transparent' }}
                />
              )
            }),
          )}
        </div>
        <Button
          size="sm"
          className="mt-2 self-start"
          onClick={() => onChange({ ...value, emblem: emblemFrom(`${seed}${Date.now()}`) })}
        >
          {T.random}
        </Button>
      </fieldset>
    </div>
  )
}
