import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Monospace-feel code chip for entity identifiers (teacher_code, subject code). */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block text-[12.5px] font-semibold text-secondary bg-fill px-2 py-[3px] rounded-md tracking-[0.02em] tnum whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}

function initials(name: string): string {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Circular initials avatar. */
export function Avatar({ name, className, tone = 'blue' }: { name: string; className?: string; tone?: 'blue' | 'lime' }) {
  return (
    <span
      className={cn(
        'w-[38px] h-[38px] rounded-full flex-none grid place-items-center text-[13px] font-bold',
        tone === 'lime' ? 'bg-lime text-lime-ink' : 'bg-blue text-white',
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
