import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { WishlistProvider, useWishlist } from '../context/WishlistContext'
import { AuthProvider } from '../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { makeProduct, makeUser } from './helpers.jsx'

// ── JWT helper ─────────────────────────────────────────────────────────────
function makeJWT(payload = {}) {
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const b = btoa(JSON.stringify({ sub: '42', exp: Math.floor(Date.now() / 1000) + 3600, ...payload }))
  return `${h}.${b}.sig`
}
const TOKEN = makeJWT()

const USER_ID    = 42
const STORE_KEY  = `shop_wishlist_${USER_ID}`

// ── wrapper factories ──────────────────────────────────────────────────────
function makeWrapper(loggedIn = false) {
  return function Wrapper({ children }) {
    if (loggedIn) {
      window.localStorage.setItem('shop_auth', JSON.stringify({
        user: makeUser({ id: USER_ID }),
        accessToken:  TOKEN,
        refreshToken: TOKEN,
      }))
    }
    return (
      <MemoryRouter>
        <AuthProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </AuthProvider>
      </MemoryRouter>
    )
  }
}

const P1 = makeProduct({ id: 10, title: 'Widget', price: 29.99, discountPercentage: 5,  category: 'tools'     })
const P2 = makeProduct({ id: 20, title: 'Gadget', price: 99.99, discountPercentage: 10, category: 'electronics' })

beforeEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
afterEach  (() => { vi.restoreAllMocks() })

// ── unauthenticated ────────────────────────────────────────────────────────
describe('WishlistContext — unauthenticated', () => {
  it('starts with empty items and count 0', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    expect(result.current.items).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('addToWishlist is a no-op', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    act(() => { result.current.addToWishlist(P1) })
    expect(result.current.items).toHaveLength(0)
  })

  it('removeFromWishlist is a no-op', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    act(() => { result.current.removeFromWishlist(P1.id) })
    expect(result.current.items).toHaveLength(0)
  })

  it('clearWishlist is a no-op', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    act(() => { result.current.clearWishlist() })
    expect(result.current.items).toHaveLength(0)
  })

  it('toggleWishlist returns false', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    let ret
    act(() => { ret = result.current.toggleWishlist(P1) })
    expect(ret).toBe(false)
    expect(result.current.items).toHaveLength(0)
  })

  it('isWishlisted always returns false', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(false) })
    expect(result.current.isWishlisted(P1.id)).toBe(false)
  })
})

// ── authenticated ──────────────────────────────────────────────────────────
describe('WishlistContext — authenticated', () => {
  it('addToWishlist adds item and increments count', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.count).toBe(1)
    expect(result.current.items[0].id).toBe(P1.id)
  })

  it('addToWishlist stores the correct fields', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    const item = result.current.items[0]
    expect(item.id).toBe(P1.id)
    expect(item.title).toBe(P1.title)
    expect(item.price).toBe(P1.price)
    expect(item.discountPercentage).toBe(P1.discountPercentage)
    expect(item.thumbnail).toBe(P1.thumbnail)
    expect(item.category).toBe(P1.category)
    expect(typeof item.addedAt).toBe('string')
  })

  it('addToWishlist is idempotent — duplicate is ignored', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    act(() => { result.current.addToWishlist(P1) })
    expect(result.current.items).toHaveLength(1)
  })

  it('addToWishlist handles missing discountPercentage (defaults to 0)', () => {
    const prod = makeProduct({ id: 99, discountPercentage: undefined })
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(prod) })
    expect(result.current.items[0].discountPercentage).toBe(0)
  })

  it('isWishlisted returns true after add', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    expect(result.current.isWishlisted(P1.id)).toBe(true)
    expect(result.current.isWishlisted(P2.id)).toBe(false)
  })

  it('removeFromWishlist removes the item', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    act(() => { result.current.addToWishlist(P2) })
    act(() => { result.current.removeFromWishlist(P1.id) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe(P2.id)
    expect(result.current.isWishlisted(P1.id)).toBe(false)
  })

  it('removeFromWishlist is a no-op for unknown id', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    act(() => { result.current.removeFromWishlist(999) })
    expect(result.current.items).toHaveLength(1)
  })

  it('toggleWishlist adds when not wishlisted and returns true', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    let ret
    act(() => { ret = result.current.toggleWishlist(P1) })
    expect(ret).toBe(true)
    expect(result.current.isWishlisted(P1.id)).toBe(true)
  })

  it('toggleWishlist removes when already wishlisted and returns false', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    let ret
    act(() => { ret = result.current.toggleWishlist(P1) })
    expect(ret).toBe(false)
    expect(result.current.isWishlisted(P1.id)).toBe(false)
  })

  it('clearWishlist empties all items', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    act(() => { result.current.addToWishlist(P2) })
    act(() => { result.current.clearWishlist() })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.count).toBe(0)
  })

  it('persists items to localStorage with user-specific key', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addToWishlist(P1) })
    const stored = JSON.parse(window.localStorage.getItem(STORE_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(P1.id)
  })

  it('loads pre-existing items from localStorage on mount', () => {
    const existing = [{ id: P1.id, title: P1.title, price: P1.price, discountPercentage: 5, thumbnail: '', category: 'tools', addedAt: '2024-01-01' }]
    window.localStorage.setItem(STORE_KEY, JSON.stringify(existing))
    // Also seed auth session
    window.localStorage.setItem('shop_auth', JSON.stringify({
      user: makeUser({ id: USER_ID }), accessToken: TOKEN, refreshToken: TOKEN,
    }))

    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe(P1.id)
  })

  it('handles corrupted localStorage gracefully — defaults to empty', () => {
    window.localStorage.setItem(STORE_KEY, 'not-valid-json')
    window.localStorage.setItem('shop_auth', JSON.stringify({
      user: makeUser({ id: USER_ID }), accessToken: TOKEN, refreshToken: TOKEN,
    }))
    const { result } = renderHook(() => useWishlist(), { wrapper: makeWrapper(true) })
    expect(result.current.items).toEqual([])
  })
})

// ── useWishlist guard ──────────────────────────────────────────────────────
describe('useWishlist — guard', () => {
  it('throws when used outside WishlistProvider', () => {
    expect(() => renderHook(() => useWishlist())).toThrow(
      'useWishlist must be used inside WishlistProvider'
    )
  })
})
