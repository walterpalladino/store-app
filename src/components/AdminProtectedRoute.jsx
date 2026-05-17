import { Navigate, useLocation } from 'react-router-dom'
import { useMerchantAuth } from '../context/MerchantAuthContext'

export default function AdminProtectedRoute({ children }) {
  const { isLoggedIn } = useMerchantAuth()
  const location = useLocation()

  if (!isLoggedIn) {
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
