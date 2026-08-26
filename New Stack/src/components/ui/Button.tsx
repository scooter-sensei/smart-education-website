import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant =
  | 'filled'
  | 'green'
  | 'tinted'
  | 'green-tinted'
  | 'red-tinted'
  | 'gray'
  | 'lime'
export type ButtonSize = 'md' | 'sm' | 'xs'

const VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-blue text-white',
  green: 'bg-green text-white',
  tinted: 'bg-tint-blue text-blue',
  'green-tinted': 'bg-tint-green text-green',
  'red-tinted': 'bg-tint-red text-red',
  gray: 'bg-fill text-label',
  lime: 'bg-lime text-lime-ink',
}
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-[50px] px-5 text-[17px] rounded-xl gap-2',
  sm: 'min-h-[38px] px-3.5 text-[15px] rounded-[10px] gap-1.5',
  xs: 'min-h-[32px] px-3 text-[13px] rounded-lg gap-1.5',
}

/** Shared class string, so links can wear the same button skin. */
export function buttonClasses(
  variant: ButtonVariant = 'filled',
  size: ButtonSize = 'md',
  block = false,
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center font-semibold tracking-[-0.01em] cursor-pointer select-none',
    'transition duration-150 ease-[var(--ease-out)] active:scale-[0.97] hover:brightness-[1.06]',
    'disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-blue',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  ref?: Ref<HTMLButtonElement>
  children: ReactNode
}

export function Button({ variant, size, block, className, type = 'button', ref, children, ...rest }: ButtonProps) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, block, className)} {...rest}>
      {children}
    </button>
  )
}
