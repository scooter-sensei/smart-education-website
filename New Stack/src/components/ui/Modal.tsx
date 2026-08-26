import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  wide?: boolean
  children: ReactNode
}

/** A centered modal for edit/create forms — Esc + backdrop close, scrollable body. */
export function Modal({ open, onClose, title, description, footer, wide, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn(
              'relative w-full bg-card rounded-[18px] shadow-2xl max-h-[calc(100dvh-48px)] overflow-auto',
              wide ? 'max-w-[560px]' : 'max-w-[440px]',
            )}
          >
            <div className="p-[22px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[18px] font-[650] tracking-[-0.01em] leading-tight">{title}</h3>
                  {description && <div className="text-[14px] text-secondary mt-2 leading-relaxed">{description}</div>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex-none -mr-1 -mt-1 p-1.5 rounded-lg text-secondary hover:bg-fill transition"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="mt-4">{children}</div>
              {footer && <div className="flex justify-end gap-2.5 mt-5">{footer}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
