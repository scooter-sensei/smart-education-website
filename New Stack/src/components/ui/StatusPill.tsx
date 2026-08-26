import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { statusChip, type Tone } from '@/lib/constants'
import { Icon, type IconName } from './Icon'

/** The canonical status pill — the label carries meaning, tone reinforces it. */
export function StatusPill({ kind, value, className }: { kind: string; value: string; className?: string }) {
  const c = statusChip(kind, value)
  return (
    <span className={cn('pill', `pill-${c.tone}`, className)} data-status={value}>
      {c.label}
    </span>
  )
}

/** Active / Inactive pill for the reusable masters (classes, subjects, …). */
export function ActivePill({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn('pill', active ? 'pill-green' : 'pill-gray', className)}>{active ? 'Active' : 'Inactive'}</span>
  )
}

/** A free-form tinted chip when there is no status vocabulary to draw on. */
export function Chip({ tone = 'gray', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn('chip', `chip-${tone}`, className)}>{children}</span>
}

const IB_BG: Record<string, string> = {
  blue: 'bg-blue',
  red: 'bg-red',
  green: 'bg-green',
  teal: 'bg-teal',
  indigo: 'bg-indigo',
  orange: 'bg-orange',
  gray: 'bg-gray',
}

/** Small rounded-square icon badge on a solid tint — leading media for rows. */
export function IconBadge({ icon, color = 'blue', className }: { icon: IconName; color?: keyof typeof IB_BG; className?: string }) {
  return (
    <span
      className={cn('w-[29px] h-[29px] rounded-[7px] flex-none text-white inline-flex items-center justify-center', IB_BG[color], className)}
    >
      <Icon name={icon} size={17} />
    </span>
  )
}
