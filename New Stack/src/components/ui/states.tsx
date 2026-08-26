import { AnimatePresence, motion } from 'framer-motion'
import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

/** Shimmering skeleton rows sized to the layout they replace. */
export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel-row" />
      ))}
    </div>
  )
}

/** Composed empty state — icon, title, one line on how to populate it. */
export function EmptyState({ icon = 'box', title, sub }: { icon?: IconName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
      <span className="w-11 h-11 rounded-full bg-fill text-secondary flex items-center justify-center">
        <Icon name={icon} size={22} />
      </span>
      <b className="text-[16px] font-semibold text-label">{title}</b>
      {sub && <p className="text-[14px] text-secondary max-w-[42ch]">{sub}</p>}
    </div>
  )
}

/** Load-failure state with a retry affordance. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-tint-red/60 p-4">
      <span className="text-red flex-none mt-0.5">
        <Icon name="warn" size={20} />
      </span>
      <div className="min-w-0">
        <b className="text-[15px] font-semibold text-label">Couldn’t load this</b>
        <p className="text-[13.5px] text-secondary mt-0.5">Something went wrong. Try again.</p>
        {onRetry && (
          <Button variant="gray" size="xs" className="mt-2.5" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

/* Minimal query shape so Async doesn't couple to a specific version's generics. */
interface QueryLike<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  refetch: () => void
}

interface AsyncProps<T> {
  query: QueryLike<T>
  children: (data: T) => ReactNode
  skeletonRows?: number
  isEmpty?: (data: T) => boolean
  empty?: { icon?: IconName; title: string; sub?: string }
}
/** Renders loading / error / empty / ready around a query result. */
export function Async<T>({ query, children, skeletonRows = 4, isEmpty, empty }: AsyncProps<T>) {
  if (query.isPending) return <Skeleton rows={skeletonRows} />
  if (query.isError || query.data === undefined) return <ErrorState onRetry={query.refetch} />
  if (empty && isEmpty && isEmpty(query.data)) return <EmptyState {...empty} />
  return <>{children(query.data)}</>
}

/* ---- Staggered entrance + slide-off removal for lists / grids ----
   Each item animates itself with an index-derived delay, rather than relying on
   parent-orchestrated variants — that pattern stalls when a sibling state update
   re-renders mid-stagger, leaving rows stuck at opacity 0. Self-animating items
   settle at their target regardless, and skip the animation entirely when the tab
   is hidden or reduced-motion is on.

   When a keyed row leaves the list (a mutation refetches without it), it slides
   off to the left and the rows below spring up to close the gap (AnimatePresence
   `popLayout` + per-item `layout`). Reduced-motion callers get a plain fade — the
   app-level <MotionConfig reducedMotion="user"> strips the transform + layout. */
export function Stagger({ className, children }: { className?: string; children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <div className={className}>
      <AnimatePresence initial mode="popLayout">
        {items.map((child, i) => (isValidElement(child) ? cloneElement(child as ReactElement<StaggerItemProps>, { _index: i }) : child))}
      </AnimatePresence>
    </div>
  )
}

interface StaggerItemProps {
  className?: string
  children: ReactNode
  _index?: number
}
export function StaggerItem({ className, children, _index = 0 }: StaggerItemProps) {
  const [instant] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden,
  )
  return (
    <motion.div
      layout
      className={className}
      initial={instant ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '-55%', scale: 0.98, transition: { duration: 0.26, ease: [0.23, 1, 0.32, 1] } }}
      transition={{
        // entrance (opacity/y) keeps the per-index stagger; reflow (layout) must
        // be fast and delay-free, or popLayout's pop-to-absolute inherits the
        // delayed spring and the exiting row lingers for seconds.
        default: { type: 'spring', stiffness: 320, damping: 30, delay: Math.min(_index, 14) * 0.035 },
        layout: { type: 'spring', stiffness: 500, damping: 42 },
      }}
    >
      {children}
    </motion.div>
  )
}
