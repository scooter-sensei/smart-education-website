import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ToastTone = 'default' | 'green' | 'red'
interface ToastState {
  id: number
  msg: string
  tone: ToastTone
}
interface ToastContextValue {
  toast: (msg: string, tone?: ToastTone) => void
}
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback((msg: string, tone: ToastTone = 'default') => {
    setT({ id: Date.now(), msg, tone })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setT(null), 2600)
  }, [])

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-[100] pointer-events-none">
        <AnimatePresence>
          {t && (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              role="status"
              className={cn(
                'pointer-events-auto max-w-[90vw] rounded-full px-4 py-2.5 text-[14px] font-medium shadow-lg',
                'bg-label text-bg backdrop-blur',
                t.tone === 'green' && 'bg-green text-white',
                t.tone === 'red' && 'bg-red text-white',
              )}
            >
              {t.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
