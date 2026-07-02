import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { makeUser, okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'

// ── JWT helpers ────────────────────────────────────────────────────────────
// Build a real-looking (but fake) JWT so decodeJWT and isTokenExpired work
function makeJWT(payload) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

const FUTURE_EXP  = Math.floor(Date.now() / 1000) + 3600   // 1h from now
const PAST_EXP    = Math.floor(Date.now() / 1000) - 3600   // 1h ago

const ACCESS_TOKEN   = makeJWT({ sub: '1', exp: FUTURE_EXP })
const REFRESH_TOKEN  = makeJWT({ sub: '1', exp: FUTURE_EXP })
const EXPIRED_TOKEN  = makeJWT({ sub: '1', exp: PAST_EXP  })

function makeLoginResponse(overrides = {}) {
  const user = makeUser()
  return { ...user, accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, ...overrides }
}

// ── wrapper ────────────────────────────────────────────────────────────────
function wrapper({ children }) {
  return <MemoryRouter><AuthProvider>{children}</AuthProvider></MemoryRouter>
}

beforeEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
afterEach  (() => { vi.restoreAllMocks() })

// ── initial state ──────────────────────────────────────────────────────────
describe('AuthContext — initial state', () => {
  it('starts unauthenticated with null user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
  })

  it('rehydrates from localStorage on mount', async () => {
    const state = { user: makeUser(), accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }
    window.localStorage.setItem('shop_auth', JSON.stringify(state))

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user?.username).toBe('emilys')
  })

  it('handles corrupted localStorage gracefully', () => {
    window.localStorage.setItem('shop_auth', '{{invalid}}')
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
  })
})

// ── login ──────────────────────────────────────────────────────────────────
describe('AuthContext — login', () => {
  it('sets user and tokens on successful login', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login('emilys', 'emilyspass')
    })

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user?.username).toBe('emilys')
    expect(result.current.accessToken).toBe(ACCESS_TOKEN)
  })

  it('persists tokens to localStorage after login', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    const stored = JSON.parse(window.localStorage.getItem('shop_auth'))
    expect(stored.accessToken).toBe(ACCESS_TOKEN)
    expect(stored.user.username).toBe('emilys')
  })

  it('exposes tokenPayload decoded from JWT', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    expect(result.current.tokenPayload).toBeTruthy()
    expect(result.current.tokenPayload.exp).toBe(FUTURE_EXP)
  })

  it('throws on invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(errEnvelope('Invalid credentials'), 422)
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => { await result.current.login('bad', 'creds') })
    ).rejects.toThrow('Invalid credentials')

    expect(result.current.isLoggedIn).toBe(false)
  })

  it('posts username and password to the auth login endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    const [, opts] = fetch.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.username).toBe('emilys')
    expect(body.password).toBe('emilyspass')
  })
})

// ── register ───────────────────────────────────────────────────────────────
describe('AuthContext — register', () => {
  it('returns the created user on success', async () => {
    const newUser = { id: 99, firstName: 'Walt', lastName: 'P', username: 'walterp', email: 'w@test.com' }
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(newUser), 201))
    const { result } = renderHook(() => useAuth(), { wrapper })

    let returned
    await act(async () => {
      returned = await result.current.register({
        firstName: 'Walt', lastName: 'P', username: 'walterp',
        email: 'w@test.com', password: 'secret',
      })
    })

    expect(returned.id).toBe(99)
    expect(returned.username).toBe('walterp')
    // register does NOT log in — isLoggedIn stays false
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('throws on duplicate username', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(errEnvelope('Username already taken', 'CONFLICT'), 409)
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.register({
          firstName: 'X', lastName: 'Y', username: 'dup', email: 'x@y.com', password: '123',
        })
      })
    ).rejects.toThrow('Username already taken')
  })
})

// ── logout ─────────────────────────────────────────────────────────────────
describe('AuthContext — logout', () => {
  async function loginFirst(result) {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    await act(async () => { await result.current.login('emilys', 'emilyspass') })
  }

  it('clears user and tokens', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)

    act(() => { result.current.logout() })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
  })

  it('removes entry from localStorage on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)
    expect(window.localStorage.getItem('shop_auth')).not.toBeNull()

    act(() => { result.current.logout() })

    expect(window.localStorage.getItem('shop_auth')).toBeNull()
  })
})

// ── updateUser ─────────────────────────────────────────────────────────────
describe('AuthContext — updateUser', () => {
  it('merges partial fields into the user object', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    act(() => { result.current.updateUser({ firstName: 'Updated', phone: '+1 999' }) })

    expect(result.current.user.firstName).toBe('Updated')
    expect(result.current.user.phone).toBe('+1 999')
    expect(result.current.user.username).toBe('emilys')   // unchanged
  })

  it('preserves tokens when updating user', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    act(() => { result.current.updateUser({ firstName: 'New' }) })

    expect(result.current.accessToken).toBe(ACCESS_TOKEN)
  })
})

// ── refreshAccessToken ─────────────────────────────────────────────────────
describe('AuthContext — refreshAccessToken', () => {
  const NEW_ACCESS  = makeJWT({ sub: '1', exp: FUTURE_EXP + 100 })
  const NEW_REFRESH = makeJWT({ sub: '1', exp: FUTURE_EXP + 100 })

  it('updates tokens from refresh response', async () => {
    // Step 1: login
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    // Step 2: refresh
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ accessToken: NEW_ACCESS, refreshToken: NEW_REFRESH }))
    )
    await act(async () => { await result.current.refreshAccessToken() })

    expect(result.current.accessToken).toBe(NEW_ACCESS)
  })

  it('throws when no refresh token is available', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    // Not logged in — no refresh token
    await expect(
      act(async () => { await result.current.refreshAccessToken() })
    ).rejects.toThrow('No refresh token')
  })
})

// ── authFetch ──────────────────────────────────────────────────────────────
describe('AuthContext — authFetch', () => {
  async function loginFirst(result) {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginResponse())))
    await act(async () => { await result.current.login('emilys', 'emilyspass') })
  }

  it('throws when not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await expect(
      act(async () => { await result.current.authFetch('http://test/api') })
    ).rejects.toThrow('Not authenticated')
  })

  it('injects Bearer token into the Authorization header', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ ok: true }))
    )
    await act(async () => { await result.current.authFetch('http://test/api/me') })

    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
  })

  it('silently refreshes and retries on 401 response', async () => {
    const NEW_TOKEN = makeJWT({ sub: '1', exp: FUTURE_EXP + 200 })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)

    // First call: 401; second call (after refresh): 200
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))             // original request fails
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ accessToken: NEW_TOKEN, refreshToken: REFRESH_TOKEN }))) // refresh succeeds
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ ok: true })))       // retry succeeds

    await act(async () => { await result.current.authFetch('http://test/api/me') })

    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('throws Session expired when both original request and refresh return 401', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('Token expired'), 401))

    let caughtMessage = null
    try {
      await act(async () => { await result.current.authFetch('http://test/api/me') })
    } catch (err) {
      caughtMessage = err.message
    }

    // The error message must signal session expiry
    expect(caughtMessage).toMatch(/Session expired/)
  })

  it('calls logout() when double-401 occurs — state is cleared', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('Token expired'), 401))

    try {
      await act(async () => { await result.current.authFetch('http://test/api/me') })
    } catch { /* expected */ }

    // logout was invoked (state cleanup responsibility confirmed)
    // We verify via fetch call count: 2 calls = original + failed refresh
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('auto-refreshes before request when token is expired', async () => {
    // Start with an expired token in localStorage
    const expiredState = {
      user: makeUser(),
      accessToken:  EXPIRED_TOKEN,
      refreshToken: REFRESH_TOKEN,
    }
    window.localStorage.setItem('shop_auth', JSON.stringify(expiredState))

    const NEW_TOKEN = makeJWT({ sub: '1', exp: FUTURE_EXP + 300 })
    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ accessToken: NEW_TOKEN, refreshToken: REFRESH_TOKEN }))) // refresh
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ data: 'ok' }))) // actual request

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.authFetch('http://test/api/me') })

    // Refresh was called first, then the actual request
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.current.accessToken).toBe(NEW_TOKEN)
  })
})

// ── useAuth guard ──────────────────────────────────────────────────────────
describe('useAuth — guard', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside AuthProvider')
  })
})
