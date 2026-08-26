import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Grouped surface (rounded 14px, card background). */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-card rounded-[14px] overflow-hidden', className)} {...rest}>
      {children}
    </div>
  )
}

/** Padded surface for free-form content. */
export function CardPad({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-card rounded-[14px] p-4', className)} {...rest}>
      {children}
    </div>
  )
}

/** Hairline-separated list of rows. */
export function Rows({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('divide-y divide-separator', className)} {...rest}>
      {children}
    </div>
  )
}

interface RowProps extends HTMLAttributes<HTMLDivElement> {
  tappable?: boolean
}
/** A single list row: leading media, main content, trailing accessory. */
export function Row({ tappable, className, children, ...rest }: RowProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 min-h-[46px] px-4 py-[11px]',
        tappable && 'cursor-pointer transition-colors duration-150 hover:bg-fill active:bg-fill',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function RowMain({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex-1 min-w-0', className)}>{children}</div>
}
export function RowTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-[16.5px] font-[590] tracking-[-0.01em] leading-tight truncate', className)}>{children}</div>
}
export function RowSub({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-[13.5px] text-secondary mt-0.5 leading-snug', className)}>{children}</div>
}

/** Uppercase section label above a group. */
export function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[13px] font-semibold uppercase tracking-[0.05em] text-secondary px-4 pt-6 pb-2', className)}>
      {children}
    </p>
  )
}
export function SectionNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[13px] text-secondary px-4 pt-2 leading-relaxed', className)}>{children}</p>
}

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}
/** Large screen title with optional subtitle and trailing actions. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-[clamp(28px,4vw,34px)] font-bold tracking-[-0.022em] leading-[1.12] text-balance">
          {title}
        </h1>
        {subtitle && <p className="text-[15px] text-secondary mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
