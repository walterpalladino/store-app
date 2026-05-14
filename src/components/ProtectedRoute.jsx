import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wrap any route element with this to require authentication.
 * Unauthenticated users are sent to /login with the attempted path
 * stored in location.state.from so they can be redirected back after login.
 */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  return children
}
