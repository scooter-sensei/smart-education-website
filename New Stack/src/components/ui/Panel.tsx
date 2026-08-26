import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  title?: ReactNode
  count?: number | string | null
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}
/** A grouped surface with an optional header (title + count pill + actions). */
export function Panel({ title, count, actions, className, bodyClassName, children }: PanelProps) {
  return (
    <section className={cn('bg-card rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-24px_rgba(0,0,0,0.35)]', className)}>
      {(title || actions || count != null) && (
        <header className="flex items-center justify-between gap-3 px-[18px] pt-[15px] pb-[13px] border-b border-separator">
          <div className="flex items-center gap-2.5 min-w-0">
            {title && <h2 className="text-[16px] font-[650] tracking-[-0.01em] truncate">{title}</h2>}
            {count != null && (
              <span className="text-[12px] font-semibold text-secondary bg-fill px-2.5 py-[3px] rounded-full tnum">
                {count}
              </span>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
        </header>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}

/** Hairline-divided KPI grid — one grouped surface, not N boxed cards. */
export function KpiStrip({ cols = 4, className, children }: { cols?: 3 | 4; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden grid gap-px bg-separator',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-24px_rgba(0,0,0,0.35)]',
        cols === 4
          ? 'grid-cols-2 min-[720px]:grid-cols-4 max-[400px]:grid-cols-1'
          : 'grid-cols-1 min-[560px]:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface KpiProps {
  label: ReactNode
  value: ReactNode
  foot?: ReactNode
  footTone?: 'default' | 'pos' | 'warn'
}
export function Kpi({ label, value, foot, footTone = 'default' }: KpiProps) {
  return (
    <div className="bg-card px-[18px] py-[15px]">
      <div className="text-[12px] font-semibold text-secondary">{label}</div>
      <div className="text-[26px] font-bold tracking-[-0.02em] mt-1.5 leading-[1.05] tnum">{value}</div>
      {foot != null && (
        <div
          className={cn(
            'text-[12px] mt-1',
            footTone === 'pos' && 'text-green font-semibold',
            footTone === 'warn' && 'text-orange font-semibold',
            footTone === 'default' && 'text-secondary',
          )}
        >
          {foot}
        </div>
      )}
    </div>
  )
}
