import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { okEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock auth so we control the user and authFetch used for persistence.
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../context/AuthContext'
import { WishlistProvider, useWishlist } from '../context/WishlistContext'

const wrapper = ({ children }) => <WishlistProvider>{children}</WishlistProvider>

// authFetch stub: routes by HTTP method. `get`/`mutate` are factories so each
// call gets a fresh (single-use) Response.
function makeAuthFetch({ get, mutate } = {}) {
  return vi.fn((url, opts = {}) => {
    const method = opts.method || 'GET'
    if (method === 'GET') return Promise.resolve(get ? get() : new Response(null, { status: 404 }))
    return Promise.resolve(mutate ? mutate() : mockJsonResponse(okEnvelope({ id: 1 })))
  })
}

function loginAs(authFetch) {
  useAuth.mockReturnValue({ user: { id: 10 }, isLoggedIn: true, authFetch })
}

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

describe('WishlistContext — logged out', () => {
  it('is empty and cannot be used', () => {
    useAuth.mockReturnValue({ user: null, isLoggedIn: false, authFetch: vi.fn() })
    const { result } = renderHook(() => useWishlist(), { wrapper })
    expect(result.current.items).toEqual([])
    expect(result.current.canUse).toBe(false)
  })

  it('toggleWishlist returns false and does not persist when logged out', () => {
    const authFetch = vi.fn()
    useAuth.mockReturnValue({ user: null, isLoggedIn: false, authFetch })
    const { result } = renderHook(() => useWishlist(), { wrapper })
    let ret
    act(() => { ret = result.current.toggleWishlist({ sku: 'A' }) })
    expect(ret).toBe(false)
    expect(authFetch).not.toHaveBeenCalled()
  })
})

describe('WishlistContext — logged in', () => {
  it('starts empty when the backend has no wishlist yet (404)', async () => {
    loginAs(makeAuthFetch()) // GET → 404
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([])
  })

  it('hydrates items by refetching each SKU', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({ name: 'Ideas', items: [{ sku: 'RCH45Q1A' }] })),
    }))
    // product-by-sku lookup (public endpoint) — note: no `id`
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ sku: 'RCH45Q1A', title: 'Mascara', price: 9.99, thumbnail: 't', category: 'beauty' })),
    )

    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))

    expect(result.current.isWishlisted('RCH45Q1A')).toBe(true)
    expect(result.current.items[0]).toMatchObject({ sku: 'RCH45Q1A', title: 'Mascara' })
  })

  it('adds a product optimistically and persists the SKU set', async () => {
    const authFetch = makeAuthFetch() // GET → 404, mutate → ok
    loginAs(authFetch)
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addToWishlist({ sku: 'A', id: 1, title: 'X', price: 5 }) })

    expect(result.current.isWishlisted('A')).toBe(true)
    const write = authFetch.mock.calls.find(([, o]) => o && o.method && o.method !== 'GET')
    expect(write).toBeTruthy()
    expect(JSON.parse(write[1].body).items).toContain('A')
  })

  it('removes an item by SKU', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({ name: 'Ideas', items: [{ sku: 'A' }] })),
    }))
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ sku: 'A', title: 'X', price: 5 })))
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))

    act(() => { result.current.removeFromWishlist('A') })
    expect(result.current.isWishlisted('A')).toBe(false)
    expect(result.current.count).toBe(0)
  })

  it('toggleWishlist adds then removes', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { expect(result.current.toggleWishlist({ sku: 'A', title: 'X', price: 5 })).toBe(true) })
    expect(result.current.isWishlisted('A')).toBe(true)
    act(() => { expect(result.current.toggleWishlist({ sku: 'A', title: 'X', price: 5 })).toBe(false) })
    expect(result.current.isWishlisted('A')).toBe(false)
  })

  it('clearWishlist empties the list', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({ name: 'Ideas', items: [{ sku: 'A' }] })),
    }))
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ sku: 'A', title: 'X', price: 5 })))
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))

    act(() => { result.current.clearWishlist() })
    expect(result.current.count).toBe(0)
  })

  it('reverts the optimistic add and surfaces an error when persistence fails', async () => {
    const authFetch = makeAuthFetch({ mutate: () => mockJsonResponse(okEnvelope(null), 500) })
    loginAs(authFetch)
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { result.current.addToWishlist({ sku: 'A', title: 'X', price: 5 }) })
    await waitFor(() => expect(result.current.isWishlisted('A')).toBe(false)) // reverted
    expect(result.current.error).toBeTruthy()
  })

  it('keeps a bare { sku } item when the product refetch fails (network error)', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({ name: 'Ideas', items: [{ sku: 'GHOST' }] })),
    }))
    global.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    expect(result.current.items[0]).toEqual({ sku: 'GHOST' })
  })

  it('clearWishlist is a no-op on an already-empty list', async () => {
    const authFetch = makeAuthFetch()
    loginAs(authFetch)
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const before = authFetch.mock.calls.length
    act(() => { result.current.clearWishlist() })
    expect(authFetch.mock.calls.length).toBe(before) // nothing persisted
  })

  it('sets an error when the wishlist load fails', async () => {
    loginAs(makeAuthFetch({ get: () => mockJsonResponse(okEnvelope(null), 500) }))
    const { result } = renderHook(() => useWishlist(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.items).toEqual([])
  })
})
