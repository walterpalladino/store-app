import { Navigate, useLocation } from 'react-router-dom'
import { useMerchantAuth } from '../context/MerchantAuthContext'

export default function AdminProtectedRoute({ children }) {
  const { isLoggedIn, isAdmin } = useMerchantAuth()
  const location = useLocation()

  if (!isLoggedIn || !isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  return children
}
