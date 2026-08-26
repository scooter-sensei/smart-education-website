/* Low-level session store (localStorage) — the front-end auth seam. Shared by the
   React auth context and by the mock API (which scopes teacher views to the
   signed-in email). The real backend is the true authority; this is convenience. */
import type { Role } from './constants'
import type { AuthUser } from './types'

const KEY = 'set-session'

export interface Session {
  token: string
  role: Role
  user: AuthUser
}

export function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
export function writeSession(s: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
