import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'
import { sfx } from '@/lib/sfx.ts'

type Variant = 'primary' | 'neutral' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 text-sm min-h-8',
  md: 'px-4 min-h-10',
  lg: 'px-6 text-lg min-h-12 rounded-[0.9rem]',
}

export function Button({ variant = 'neutral', size = 'md', loading, disabled, className, children, onClick, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        sfx('click')
        onClick?.(e)
      }}
      className={clsx(
        'btn inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap',
        `btn-${variant}`,
        SIZES[size],
        className,
      )}
    >
      {loading ? (
        <span className="loading-dots" aria-label="Lädt">
          <i />
          <i />
          <i />
        </span>
      ) : (
        children
      )}
    </button>
  )
}
