import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '@/auth/AuthContext'
import { ROLE_LABEL, type Role } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useTheme } from '@/theme/ThemeContext'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/states'
import { NAV } from './nav'

function initials(name: string): string {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Brand({ onNavigate, role }: { onNavigate?: () => void; role: Role | null }) {
  return (
    <NavLink to={homeFor(role)} onClick={onNavigate} className="text-[18px] font-bold tracking-[-0.02em] text-label">
      SmartEdu<b className="text-blue">Track</b>
    </NavLink>
  )
}

function ThemeToggle({ className, label }: { className?: string; label?: boolean }) {
  const { effective, toggle } = useTheme()
  const dark = effective === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'}
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer text-[14px] text-label rounded-[9px] transition active:scale-[0.98]',
        label ? 'w-full min-h-[38px] px-2.5 hover:bg-fill' : 'w-9 h-9 justify-center rounded-full bg-fill',
        className,
      )}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} className="text-secondary flex-none" />
      {label && <span>Appearance</span>}
    </button>
  )
}

function SidebarContent({ role, onNavigate, onLogout }: { role: Role; onNavigate: () => void; onLogout: () => void }) {
  const { session } = useAuth()
  const user = session?.user ?? { name: '—', email: '' }
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-[18px] pt-[18px] pb-2.5">
        <Brand role={role} onNavigate={onNavigate} />
        <span className="text-[10.5px] font-semibold text-secondary bg-fill px-[7px] py-0.5 rounded-md tracking-[0.03em]">
          v1.0
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar" aria-label="Primary">
        {NAV[role].map((g) => (
          <div key={g.group} className="mt-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-secondary px-2.5 pt-1.5 pb-1">
              {g.group}
            </p>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-[11px] min-h-[40px] px-2.5 py-2 rounded-[9px] text-[14.5px] font-medium',
                    'transition-colors duration-150 active:scale-[0.98]',
                    isActive ? 'bg-tint-blue text-blue font-semibold' : 'text-label hover:bg-fill',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('flex-none inline-flex', isActive ? 'text-blue' : 'text-secondary')}>
                      <Icon name={it.icon} size={20} />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{it.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-separator px-3 py-2.5 flex flex-col gap-0.5">
        <ThemeToggle label />
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <span className="w-[30px] h-[30px] rounded-full flex-none bg-blue text-white grid place-items-center text-[12px] font-bold">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex flex-col leading-tight">
            <b className="text-[13.5px] font-semibold truncate">{user.name}</b>
            <span className="text-[11.5px] text-secondary">{ROLE_LABEL[role]}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full min-h-[38px] px-2.5 rounded-[9px] text-[14px] text-label cursor-pointer transition active:scale-[0.98] hover:bg-tint-red hover:text-red [&:hover_svg]:text-red"
        >
          <Icon name="logout" size={18} className="text-secondary flex-none" />
          Log out
        </button>
      </div>
    </>
  )
}

export function AppShell() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // close the drawer on navigation
  useEffect(() => setOpen(false), [location.pathname])

  // lock Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!role) return null

  const doLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg">
      {/* Mobile top bar */}
      <header className="min-[900px]:hidden fixed top-0 inset-x-0 h-[52px] z-[46] flex items-center gap-3 px-3.5 bg-chrome backdrop-blur-xl border-b border-separator">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="p-2 -ml-2 rounded-lg text-label inline-flex cursor-pointer"
        >
          <Icon name="menu" size={22} strokeWidth={2} />
        </button>
        <span className="flex-1">
          <Brand role={role} />
        </span>
        <ThemeToggle />
      </header>

      {/* Sidebar (fixed desktop, off-canvas drawer on mobile) */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 w-[272px] min-[900px]:w-[264px] z-[45] flex flex-col overflow-hidden',
          'bg-card border-r border-separator',
          'transition-transform duration-300 ease-[var(--ease-drawer)] motion-reduce:transition-none',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'min-[900px]:translate-x-0 min-[900px]:shadow-none',
        )}
      >
        <SidebarContent role={role} onNavigate={() => setOpen(false)} onLogout={doLogout} />
      </aside>

      {/* Scrim */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[44] bg-black/40 min-[900px]:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="min-[900px]:pl-[264px] pt-[52px] min-[900px]:pt-0">
        <main className="mx-auto max-w-[960px] px-[clamp(16px,3vw,34px)] pt-[26px] pb-[84px]">
          <Suspense fallback={<div className="flex flex-col gap-4 pt-2"><div className="skel-row !h-9 !w-1/3" /><Skeleton rows={5} /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
