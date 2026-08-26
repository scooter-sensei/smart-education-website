import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapClassName?: string
}
/** Search field with a leading magnifier. */
export function SearchInput({ wrapClassName, className, placeholder = 'Search', ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative flex-1 min-w-[190px]', wrapClassName)}>
      <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary" />
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'w-full min-h-[44px] pl-[39px] pr-3 bg-fill rounded-[10px] text-[16px] text-label placeholder:text-tertiary',
          'border border-transparent transition-colors duration-150 focus:bg-fill-2 focus:outline-none',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...rest}
      />
    </div>
  )
}
