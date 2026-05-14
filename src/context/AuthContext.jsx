import API from '../config/api'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'shop_auth'

// ---------------------------------------------------------------------------
// Tiny JWT helper — decode payload without a library (no signature verification
// needed; this is a mock API so we just need the claims for display).
// ---------------------------------------------------------------------------
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    // Base64url → Base64 → JSON
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJWT(token)
  if (!payload?.exp) return false
  return Date.now() / 1000 > payload.exp
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { user: null, accessToken: null, refreshToken: null }
      const parsed = JSON.parse(stored)
      // Don't auto-logout on load even if expired — let the API call fail
      return parsed
    } catch {
      return { user: null, accessToken: null, refreshToken: null }
    }
  })

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (authState.accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authState))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [authState])

  // -------------------------------------------------------------------------
  // Login — calls DummyJSON /auth/login
  // -------------------------------------------------------------------------
  const login = useCallback(async (username, password, expiresInMins = 60) => {
    const res = await fetch(API.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, expiresInMins }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Invalid credentials')
    }

    // data = { id, username, email, firstName, lastName, gender, image,
    //          accessToken, refreshToken }
    const { accessToken, refreshToken, ...user } = data

    setAuthState({ user, accessToken, refreshToken })
    return { user, accessToken, refreshToken }
  }, [])

  // -------------------------------------------------------------------------
  // Register — DummyJSON doesn't persist new users, but we can POST to
  // /users/add to simulate the call, then auto-login with a known test account.
  // We return the "created" user object so the UI can confirm registration.
  // -------------------------------------------------------------------------
  const register = useCallback(async ({ firstName, lastName, username, email, password }) => {
    const res = await fetch(API.users.add, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, username, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed')
    }

    // data has { id, firstName, lastName, ... } — no token yet.
    // Since DummyJSON can't actually store the user, we return the mock data
    // and let the caller decide to redirect to login.
    return data
  }, [])

  // -------------------------------------------------------------------------
  // Refresh access token
  // -------------------------------------------------------------------------
  const refreshAccessToken = useCallback(async () => {
    if (!authState.refreshToken) throw new Error('No refresh token')

    const res = await fetch(API.auth.refresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: authState.refreshToken,
        expiresInMins: 60,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Token refresh failed')

    setAuthState((prev) => ({
      ...prev,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }))

    return data.accessToken
  }, [authState.refreshToken])

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    setAuthState({ user: null, accessToken: null, refreshToken: null })
  }, [])

  // -------------------------------------------------------------------------
  // authFetch — a fetch wrapper that injects the Bearer token and handles
  // 401 by attempting a refresh once before giving up.
  // -------------------------------------------------------------------------
  const authFetch = useCallback(
    async (url, options = {}) => {
      let token = authState.accessToken

      if (!token) throw new Error('Not authenticated')

      // If token is expired, try to refresh first
      if (isTokenExpired(token)) {
        token = await refreshAccessToken()
      }

      const makeRequest = (t) =>
        fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${t}`,
            'Content-Type': 'application/json',
          },
        })

      let res = await makeRequest(token)

      // One silent retry after refresh on 401
      if (res.status === 401) {
        try {
          token = await refreshAccessToken()
          res = await makeRequest(token)
        } catch {
          logout()
          throw new Error('Session expired. Please log in again.')
        }
      }

      return res
    },
    [authState.accessToken, refreshAccessToken, logout]
  )

  // updateUser — merge partial fields into the cached user (e.g. after PATCH)
  const updateUser = useCallback((partial) => {
    setAuthState((prev) => ({
      ...prev,
      user: { ...prev.user, ...partial },
    }))
  }, [])

  const tokenPayload = authState.accessToken ? decodeJWT(authState.accessToken) : null

  const value = {
    user: authState.user,
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
    tokenPayload,
    isLoggedIn: !!authState.accessToken,
    login,
    register,
    logout,
    authFetch,
    refreshAccessToken,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
