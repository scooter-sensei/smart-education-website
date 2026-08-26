import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BannerTone = 'green' | 'blue' | 'red'

const TONES: Record<BannerTone, string> = {
  green: 'bg-tint-green text-green',
  blue: 'bg-tint-blue text-blue',
  red: 'bg-tint-red text-red',
}

/** Inline feedback banner. Text-only content (no markup injected through it). */
export function Banner({ tone, children, className }: { tone: BannerTone; children: ReactNode; className?: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[14.5px] font-medium leading-snug', TONES[tone], className)}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </svg>
      <span className="min-w-0">{children}</span>
    </motion.div>
  )
}
