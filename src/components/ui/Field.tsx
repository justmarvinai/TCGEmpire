import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, className, ...rest }: Props) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg-2">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
        className="panel-inset w-full bg-transparent px-2 py-1 text-fg placeholder:text-fg-3 focus-visible:outline-accent"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-fg-3">
          {hint}
        </p>
      )}
    </div>
  )
}
