import { animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface CountUpProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

/** Animated number count-up. Snaps to the target immediately when the tab is
    hidden or reduced-motion is on (rAF is throttled/paused there), so the figure
    is always correct even without the animation. */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 0.9, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || document.hidden) {
      el.textContent = format(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => {
        el.textContent = format(v)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
