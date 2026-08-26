import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const KEY = 'se-theme'
type Stored = 'light' | 'dark' | null
type Effective = 'light' | 'dark'

function readStored(): Stored {
  try {
    const s = localStorage.getItem(KEY)
    return s === 'light' || s === 'dark' ? s : null
  } catch {
    return null
  }
}
function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
function computeEffective(stored: Stored): Effective {
  return stored ?? (systemDark() ? 'dark' : 'light')
}

/** Reflect the stored choice onto <html> and the theme-color meta. Leaving the
    attribute off for "system" lets the CSS media query govern (matches the app). */
function apply(stored: Stored) {
  const root = document.documentElement
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored)
  else root.removeAttribute('data-theme')
  const dark = computeEffective(stored) === 'dark'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0c0e0a' : '#F2F2F7')
}

interface ThemeContextValue {
  effective: Effective
  toggle: () => void
}
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(() => readStored())

  // keep the DOM + meta in sync with the stored choice
  useEffect(() => {
    apply(stored)
  }, [stored])

  // when in "system" mode, follow OS changes
  useEffect(() => {
    if (stored) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply(null)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [stored])

  const toggle = useCallback(() => {
    const next: Effective = computeEffective(readStored()) === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
    const commit = () => setStored(next)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // A deliberate action — earns a full-document cross-fade where supported.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished?: Promise<unknown>; ready?: Promise<unknown>; updateCallbackDone?: Promise<unknown> }
    }
    if (doc.startViewTransition && !reduce) {
      const vt = doc.startViewTransition(commit)
      ;['finished', 'ready', 'updateCallbackDone'].forEach((k) => {
        const p = vt?.[k as keyof typeof vt] as Promise<unknown> | undefined
        p?.catch?.(() => {})
      })
    } else {
      commit()
    }
  }, [])

  const effective = computeEffective(stored)
  const value = useMemo<ThemeContextValue>(() => ({ effective, toggle }), [effective, toggle])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
