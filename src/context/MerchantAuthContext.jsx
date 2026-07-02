import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { unwrap } from '../utils/apiUtils'
import API from '../config/api'

const MerchantAuthContext = createContext(null)
const STORAGE_KEY = 'shop_merchant_auth'

// The backend exposes two roles: 'ADMIN' and 'USER'. Only admins may access
// the merchant/admin section. Compared case-insensitively for robustness.
const ADMIN_ROLE = 'ADMIN'
export function hasAdminRole(role) {
  return String(role ?? '').toUpperCase() === ADMIN_ROLE
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

function isTokenExpired(token) {
  const payload = decodeJWT(token)
  if (!payload?.exp) return false
  return Date.now() / 1000 > payload.exp
}

export function MerchantAuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : { user: null, accessToken: null, refreshToken: null }
    } catch { return { user: null, accessToken: null, refreshToken: null } }
  })

  useEffect(() => {
    if (authState.accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authState))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [authState])

  const logout = useCallback(() => {
    setAuthState({ user: null, accessToken: null, refreshToken: null })
  }, [])

  // Drop a stale/expired session on mount so the route guard sends the user
  // back to the admin login page instead of rendering a broken admin panel.
  useEffect(() => {
    if (authState.accessToken && isTokenExpired(authState.accessToken)) {
      logout()
    }
    // Only needs to run once on mount for the rehydrated session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Response: { success, data: { id, firstName, ..., role, accessToken, refreshToken } }
  const login = useCallback(async (username, password) => {
    const res  = await fetch(API.auth.login, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    })
    const data = await unwrap(res)
    const { accessToken, refreshToken, ...user } = data

    // Reject non-admin accounts before establishing an admin session.
    if (!hasAdminRole(user.role)) {
      throw new Error('This account does not have administrator access.')
    }

    setAuthState({ user, accessToken, refreshToken })
    return { user, accessToken }
  }, [])

  const updateMerchant = useCallback((partial) => {
    setAuthState((prev) => ({ ...prev, user: { ...prev.user, ...partial } }))
  }, [])

  const merchantFetch = useCallback(async (url, options = {}) => {
    const token = authState.accessToken
    if (!token) throw new Error('Not authenticated')

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization:   `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // A rejected token means the admin session is no longer valid — sign out
    // so the route guard redirects to the admin login page.
    if (res.status === 401) {
      logout()
      throw new Error('Session expired. Please log in again.')
    }

    return res
  }, [authState.accessToken, logout])

  const tokenPayload = authState.accessToken ? decodeJWT(authState.accessToken) : null

  // A session backed by an expired access token is treated as logged-out.
  const sessionValid = !!authState.accessToken && !isTokenExpired(authState.accessToken)

  return (
    <MerchantAuthContext.Provider value={{
      user:           authState.user,
      accessToken:    authState.accessToken,
      tokenPayload,
      isLoggedIn:     sessionValid,
      isAdmin:        sessionValid && hasAdminRole(authState.user?.role),
      login,
      logout,
      updateMerchant,
      merchantFetch,
    }}>
      {children}
    </MerchantAuthContext.Provider>
  )
}

export function useMerchantAuth() {
  const ctx = useContext(MerchantAuthContext)
  if (!ctx) throw new Error('useMerchantAuth must be used inside MerchantAuthProvider')
  return ctx
}
