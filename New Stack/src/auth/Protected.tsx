import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/lib/constants'
import { homeFor, useAuth } from './AuthContext'

/** Route guard. Redirects to login without a session, or to the role's home when
    the session's role doesn't match the required one. Wraps nested routes. */
export function Protected({ role }: { role?: Role }) {
  const { isAuthed, role: current } = useAuth()
  const location = useLocation()

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (role && current !== role) {
    return <Navigate to={homeFor(current)} replace />
  }
  return <Outlet />
}
