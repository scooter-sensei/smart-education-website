import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

const FIELD =
  'w-full min-h-[44px] px-3 py-2.5 bg-fill rounded-[10px] text-[16.5px] text-label placeholder:text-tertiary ' +
  'caret-blue border border-transparent transition-colors duration-150 focus:bg-fill-2 focus:outline-none'
const INVALID = 'border-red/70 bg-tint-red focus:bg-tint-red'

export function Label({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-[13px] font-semibold text-secondary mb-1.5 ml-0.5', className)}>
      {children}
    </label>
  )
}

interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}
/** Label above input, error below — the app's standard field block. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <span className="text-[12.5px] text-secondary mt-1.5 ml-0.5">{hint}</span>}
      {error && (
        <span className="text-[12.5px] font-medium text-red mt-1.5 ml-0.5" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}
export function Input({ invalid, className, ...rest }: InputProps) {
  return <input className={cn(FIELD, invalid && INVALID, className)} aria-invalid={invalid || undefined} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}
export function Textarea({ invalid, className, rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea rows={rows} className={cn(FIELD, 'resize-y leading-normal', invalid && INVALID, className)} aria-invalid={invalid || undefined} {...rest} />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}
export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(FIELD, 'appearance-none pr-9 cursor-pointer', invalid && INVALID, className)} aria-invalid={invalid || undefined} {...rest}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray" />
    </div>
  )
}

/** Responsive form grid: 1 col on phones, `cols` on wider screens. */
export function FormGrid({ cols = 1, className, children }: { cols?: 1 | 2 | 3; className?: string; children: ReactNode }) {
  const map = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' } as const
  return <div className={cn('grid gap-3', map[cols], className)}>{children}</div>
}
