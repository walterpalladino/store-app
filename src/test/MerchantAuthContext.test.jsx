import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MerchantAuthProvider, useMerchantAuth } from '../context/MerchantAuthContext'
import { MemoryRouter } from 'react-router-dom'
import { makeUser, okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'

function makeJWT(payload) {
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const b = btoa(JSON.stringify(payload))
  return `${h}.${b}.sig`
}
const TOKEN         = makeJWT({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 })
const REFRESH_TOKEN = makeJWT({ sub: '1', exp: Math.floor(Date.now() / 1000) + 7200 })
const EXPIRED_TOKEN = makeJWT({ sub: '1', exp: Math.floor(Date.now() / 1000) - 60 })

function makeLoginData(overrides = {}) {
  return { ...makeUser(), role: 'ADMIN', accessToken: TOKEN, refreshToken: REFRESH_TOKEN, ...overrides }
}

function wrapper({ children }) {
  return <MemoryRouter><MerchantAuthProvider>{children}</MerchantAuthProvider></MemoryRouter>
}

const STORAGE_KEY = 'shop_merchant_auth'

beforeEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
afterEach  (() => { vi.restoreAllMocks() })

// ── initial state ──────────────────────────────────────────────────────────
describe('MerchantAuthContext — initial state', () => {
  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
  })

  it('rehydrates from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: makeUser(), accessToken: TOKEN, refreshToken: REFRESH_TOKEN,
    }))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user?.username).toBe('emilys')
  })

  it('handles corrupted localStorage gracefully', () => {
    window.localStorage.setItem(STORAGE_KEY, '{{bad}}')
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('decodes tokenPayload from JWT', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: makeUser(), accessToken: TOKEN, refreshToken: REFRESH_TOKEN,
    }))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    expect(result.current.tokenPayload).toBeTruthy()
    expect(result.current.tokenPayload.sub).toBe('1')
  })

  it('treats an expired persisted token as logged-out', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: { ...makeUser(), role: 'ADMIN' }, accessToken: EXPIRED_TOKEN, refreshToken: REFRESH_TOKEN,
    }))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isAdmin).toBe(false)
    // stale session is cleared from storage on mount
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

// ── login ──────────────────────────────────────────────────────────────────
describe('MerchantAuthContext — login', () => {
  it('sets user and token on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.user?.username).toBe('emilys')
    expect(result.current.accessToken).toBe(TOKEN)
  })

  it('rejects a non-admin (USER) account and does not establish a session', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope(makeLoginData({ role: 'USER' })))
    )
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await expect(
      act(async () => { await result.current.login('emilys', 'emilyspass') })
    ).rejects.toThrow('administrator access')

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isAdmin).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('accepts the admin role case-insensitively', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope(makeLoginData({ role: 'admin' })))
    )
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })
    expect(result.current.isAdmin).toBe(true)
  })

  it('persists to localStorage under merchant key', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect(stored.accessToken).toBe(TOKEN)
  })

  it('uses a different storage key than the customer auth', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    // Merchant stores under 'shop_merchant_auth', never 'shop_auth'
    expect(window.localStorage.getItem('shop_merchant_auth')).not.toBeNull()
    expect(window.localStorage.getItem('shop_auth')).toBeNull()
  })

  it('throws on invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(errEnvelope('Invalid credentials'), 422)
    )
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    await expect(
      act(async () => { await result.current.login('bad', 'creds') })
    ).rejects.toThrow('Invalid credentials')
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('returns user and accessToken from login', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })

    let ret
    await act(async () => { ret = await result.current.login('emilys', 'emilyspass') })
    expect(ret.user.username).toBe('emilys')
    expect(ret.accessToken).toBe(TOKEN)
  })
})

// ── logout ─────────────────────────────────────────────────────────────────
describe('MerchantAuthContext — logout', () => {
  async function loginFirst(result) {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    await act(async () => { await result.current.login('emilys', 'emilyspass') })
  }

  it('clears user and tokens', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)
    act(() => { result.current.logout() })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('removes entry from localStorage', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)
    act(() => { result.current.logout() })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

// ── updateMerchant ─────────────────────────────────────────────────────────
describe('MerchantAuthContext — updateMerchant', () => {
  it('merges partial fields into user', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await act(async () => { await result.current.login('emilys', 'emilyspass') })

    act(() => { result.current.updateMerchant({ firstName: 'Merchant' }) })

    expect(result.current.user.firstName).toBe('Merchant')
    expect(result.current.user.username).toBe('emilys')   // unchanged
    expect(result.current.accessToken).toBe(TOKEN)         // token preserved
  })
})

// ── merchantFetch ──────────────────────────────────────────────────────────
describe('MerchantAuthContext — merchantFetch', () => {
  async function loginFirst(result) {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(makeLoginData())))
    await act(async () => { await result.current.login('emilys', 'emilyspass') })
  }

  it('throws when not authenticated', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await expect(
      act(async () => { await result.current.merchantFetch('http://test/api') })
    ).rejects.toThrow('Not authenticated')
  })

  it('injects Bearer token header', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await act(async () => { await result.current.merchantFetch('http://test/api/me') })

    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('merges caller headers with auth header', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await act(async () => {
      await result.current.merchantFetch('http://test/api', {
        headers: { 'X-Custom': 'yes' },
      })
    })

    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers['X-Custom']).toBe('yes')
    expect(opts.headers.Authorization).toContain('Bearer')
  })

  it('logs out on a 401 so the guard can redirect to admin login', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    let err
    await act(async () => {
      try { await result.current.merchantFetch('http://test/api/me') }
      catch (e) { err = e }
    })

    expect(err?.message).toMatch(/Session expired/)
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isAdmin).toBe(false)
  })

  it('passes method and body through', async () => {
    const { result } = renderHook(() => useMerchantAuth(), { wrapper })
    await loginFirst(result)

    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await act(async () => {
      await result.current.merchantFetch('http://test/api/users/1', {
        method: 'PATCH',
        body:   JSON.stringify({ firstName: 'New' }),
      })
    })

    const [, opts] = fetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
    expect(JSON.parse(opts.body).firstName).toBe('New')
  })
})

// ── useMerchantAuth guard ──────────────────────────────────────────────────
describe('useMerchantAuth — guard', () => {
  it('throws when used outside MerchantAuthProvider', () => {
    expect(() => renderHook(() => useMerchantAuth())).toThrow(
      'useMerchantAuth must be used inside MerchantAuthProvider'
    )
  })
})
