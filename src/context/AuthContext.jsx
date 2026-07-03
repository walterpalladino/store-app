import API from '../config/api'
import { unwrap } from '../utils/apiUtils'
import logger from '../utils/logger'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'shop_auth'

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

export function AuthProvider({ children }) {
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

  // ── Login ─────────────────────────────────────────────────────────────────
  // Response: { success, data: { id, firstName, ..., address, bank, accessToken, refreshToken } }
  const login = useCallback(async (username, password) => {
    const res = await fetch(API.auth.login, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    })
    const data = await unwrap(res)      // throws on success:false

    const { accessToken, refreshToken, ...user } = data
    setAuthState({ user, accessToken, refreshToken })
    return { user, accessToken, refreshToken }
  }, [])

  // ── Register ──────────────────────────────────────────────────────────────
  // Response: { success, data: { id, firstName, lastName, username, email } }
  const register = useCallback(async ({ firstName, lastName, username, email, password }) => {
    const res = await fetch(API.users.add, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ firstName, lastName, username, email, password }),
    })
    return unwrap(res)    // returns data; caller redirects to login
  }, [])

  // ── Refresh access token ──────────────────────────────────────────────────
  // Response: { success, data: { accessToken, refreshToken } }
  const refreshAccessToken = useCallback(async () => {
    if (!authState.refreshToken) throw new Error('No refresh token')
    const res = await fetch(API.auth.refresh, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: authState.refreshToken }),
    })
    const data = await unwrap(res)
    // A refresh can "succeed" (2xx) yet return no usable token, or an error
    // response can slip past unwrap without `success:false`. Read the values
    // up front and bail loudly — never queue a state updater that closes over
    // an undefined `data`, since React replays updaters during render and a
    // throw there crashes the whole AuthProvider subtree.
    const newAccessToken  = data?.accessToken
    const newRefreshToken = data?.refreshToken
    if (!newAccessToken) throw new Error('Session refresh failed')
    setAuthState((prev) => ({
      ...prev,
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken ?? prev.refreshToken,
    }))
    return newAccessToken
  }, [authState.refreshToken])

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setAuthState({ user: null, accessToken: null, refreshToken: null })
  }, [])

  // ── authFetch — Bearer token injection + auto-refresh on 401 ─────────────
  const authFetch = useCallback(async (url, options = {}) => {
    let token = authState.accessToken
    if (!token) throw new Error('Not authenticated')

    if (isTokenExpired(token)) {
      try {
        token = await refreshAccessToken()
      } catch (err) {
        logger.warn('authFetch: token refresh failed, logging out.', err.message ?? err)
        logout()
        throw new Error('Session expired. Please log in again.')
      }
    }

    const makeRequest = (t) => fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization:   `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
    })

    let res = await makeRequest(token)

    // Silent retry on 401
    if (res.status === 401) {
      try {
        token = await refreshAccessToken()
        res   = await makeRequest(token)
      } catch (err) {
        logger.warn('authFetch: refresh after 401 failed, logging out.', err.message ?? err)
        logout()
        throw new Error('Session expired. Please log in again.')
      }
    }

    return res
  }, [authState.accessToken, refreshAccessToken, logout])

  // ── updateUser — merge partial fields into cached user ────────────────────
  const updateUser = useCallback((partial) => {
    setAuthState((prev) => ({ ...prev, user: { ...prev.user, ...partial } }))
  }, [])

  const tokenPayload = authState.accessToken ? decodeJWT(authState.accessToken) : null

  return (
    <AuthContext.Provider value={{
      user:               authState.user,
      accessToken:        authState.accessToken,
      refreshToken:       authState.refreshToken,
      tokenPayload,
      isLoggedIn:         !!authState.accessToken,
      login,
      register,
      logout,
      authFetch,
      refreshAccessToken,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
