import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ROLE, type Role } from '@/lib/constants'
import { clearSession, readSession, writeSession, type Session } from '@/lib/session'
import type { LoginResult } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  role: Role | null
  isAuthed: boolean
  login: (result: LoginResult) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession())

  const login = useCallback((result: LoginResult) => {
    const s: Session = { token: result.token, role: result.role, user: result.user }
    writeSession(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, role: session?.role ?? null, isAuthed: !!session?.token, login, logout }),
    [session, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** Where a role lands after login. */
// eslint-disable-next-line react-refresh/only-export-components
export function homeFor(role: Role | null): string {
  return role === ROLE.SUPER_ADMIN ? '/admin/dashboard' : '/teacher/dashboard'
}
