import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}
export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>
type Resolver = (v: boolean) => void

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}
const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<Resolver | null>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }, [])

  useEffect(() => {
    if (!opts) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opts, settle])

  return (
    <ConfirmContext value={{ confirm }}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => settle(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={opts.title}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-[400px] bg-card rounded-2xl p-5 shadow-2xl"
            >
              <h3 className="text-[19px] font-bold tracking-[-0.01em] text-balance">{opts.title}</h3>
              {opts.body && <p className="text-[14.5px] text-secondary mt-2 leading-relaxed">{opts.body}</p>}
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="gray" size="sm" onClick={() => settle(false)}>
                  {opts.cancelLabel || 'Cancel'}
                </Button>
                <Button
                  ref={okRef}
                  variant={opts.tone === 'danger' ? 'red-tinted' : 'filled'}
                  size="sm"
                  onClick={() => settle(true)}
                >
                  {opts.confirmLabel || 'Confirm'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return ctx.confirm
}
