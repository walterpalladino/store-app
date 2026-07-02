import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { unwrap } from '../utils/apiUtils'
import API from '../config/api'

const MerchantAuthContext = createContext(null)
const STORAGE_KEY = 'shop_merchant_auth'

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
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

  // Response: { success, data: { id, firstName, ..., accessToken, refreshToken } }
  const login = useCallback(async (username, password) => {
    const res  = await fetch(API.auth.login, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    })
    const data = await unwrap(res)
    const { accessToken, refreshToken, ...user } = data
    setAuthState({ user, accessToken, refreshToken })
    return { user, accessToken }
  }, [])

  const logout = useCallback(() => {
    setAuthState({ user: null, accessToken: null, refreshToken: null })
  }, [])

  const updateMerchant = useCallback((partial) => {
    setAuthState((prev) => ({ ...prev, user: { ...prev.user, ...partial } }))
  }, [])

  const merchantFetch = useCallback(async (url, options = {}) => {
    const token = authState.accessToken
    if (!token) throw new Error('Not authenticated')
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization:   `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }, [authState.accessToken])

  const tokenPayload = authState.accessToken ? decodeJWT(authState.accessToken) : null

  return (
    <MerchantAuthContext.Provider value={{
      user:           authState.user,
      accessToken:    authState.accessToken,
      tokenPayload,
      isLoggedIn:     !!authState.accessToken,
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
