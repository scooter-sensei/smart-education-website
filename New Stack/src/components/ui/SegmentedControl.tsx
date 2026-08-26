import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface SegOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

/** iOS-style segmented filter with a sliding thumb (shared-element via layoutId). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const groupId = useId()
  return (
    <div className={cn('inline-flex flex-none bg-fill rounded-[11px] p-[3px] gap-[2px]', className)} role="tablist">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 active:scale-[0.97]',
              size === 'md' ? 'px-[15px] py-2 text-[13px]' : 'px-3 py-1.5 text-[12.5px]',
              on ? 'text-label' : 'text-secondary hover:text-label',
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-thumb-${groupId}`}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-lg bg-card shadow-[0_1px_2px_rgba(0,0,0,0.10),0_1px_1px_rgba(0,0,0,0.04)]"
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
