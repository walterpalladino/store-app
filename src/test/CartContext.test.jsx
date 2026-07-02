import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '../context/CartContext'
import { AuthProvider } from '../context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { makeProduct, makeUser, okEnvelope, mockJsonResponse } from './helpers.jsx'
import cartServiceSingleton from '../services/cartService'

// ── JWT helper ─────────────────────────────────────────────────────────────
function makeJWT(payload) {
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const b = btoa(JSON.stringify(payload))
  return `${h}.${b}.sig`
}
const TOKEN = makeJWT({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 })

function makeLoginData(user) {
  return { ...user, accessToken: TOKEN, refreshToken: TOKEN }
}

// ── wrapper that allows an optional pre-login ──────────────────────────────
function makeWrapper(loggedIn = false) {
  return function Wrapper({ children }) {
    if (loggedIn) {
      // Pre-seed localStorage so AuthProvider rehydrates a session
      const user = makeUser({ id: 42 })
      window.localStorage.setItem('shop_auth', JSON.stringify({
        user,
        accessToken:  TOKEN,
        refreshToken: TOKEN,
      }))
    }
    return (
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </MemoryRouter>
    )
  }
}

const P1 = makeProduct({ id: 1, price: 10, discountPercentage: 0  })
const P2 = makeProduct({ id: 2, price: 50, discountPercentage: 20 })

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
  // Reset singleton cart state so tests don't bleed into each other
  cartServiceSingleton.clearCart(42)
})

// ── unauthenticated ────────────────────────────────────────────────────────
describe('CartContext — unauthenticated', () => {
  it('starts with empty items', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(false) })
    expect(result.current.items).toEqual([])
    expect(result.current.totalQuantity).toBe(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('addItem is a no-op when no user', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(false) })
    act(() => { result.current.addItem(P1, 3) })
    expect(result.current.items).toHaveLength(0)
  })

  it('removeItem is a no-op when no user', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(false) })
    act(() => { result.current.removeItem(1) })
    expect(result.current.items).toHaveLength(0)
  })

  it('clearCart is a no-op when no user', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(false) })
    act(() => { result.current.clearCart() })
    expect(result.current.items).toHaveLength(0)
  })
})

// ── authenticated ──────────────────────────────────────────────────────────
describe('CartContext — authenticated', () => {
  it('addItem adds a product', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 2) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
    expect(result.current.totalQuantity).toBe(2)
  })

  it('addItem increments quantity for duplicate product', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 1) })
    act(() => { result.current.addItem(P1, 3) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(4)
  })

  it('addItem defaults quantity to 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1) })
    expect(result.current.items[0].quantity).toBe(1)
  })

  it('addItem handles multiple distinct products', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 1) })
    act(() => { result.current.addItem(P2, 2) })
    expect(result.current.items).toHaveLength(2)
    expect(result.current.totalQuantity).toBe(3)
  })

  it('setQuantity updates quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 1) })
    act(() => { result.current.setQuantity(P1.id, 5) })
    expect(result.current.items[0].quantity).toBe(5)
  })

  it('setQuantity to 0 removes the item', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 3) })
    act(() => { result.current.setQuantity(P1.id, 0) })
    expect(result.current.items).toHaveLength(0)
  })

  it('removeItem removes a product by id', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 1) })
    act(() => { result.current.addItem(P2, 1) })
    act(() => { result.current.removeItem(P1.id) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe(P2.id)
  })

  it('clearCart empties all items', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 3) })
    act(() => { result.current.addItem(P2, 2) })
    act(() => { result.current.clearCart() })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalQuantity).toBe(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('isInCart returns true for added product', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 1) })
    expect(result.current.isInCart(P1.id)).toBe(true)
    expect(result.current.isInCart(P2.id)).toBe(false)
  })

  it('getQuantity returns correct quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    act(() => { result.current.addItem(P1, 7) })
    expect(result.current.getQuantity(P1.id)).toBe(7)
    expect(result.current.getQuantity(P2.id)).toBe(0)
  })

  it('subtotal respects discountPercentage', () => {
    const { result } = renderHook(() => useCart(), { wrapper: makeWrapper(true) })
    // P1: 10 × 1 = 10 (no discount)
    // P2: 50 × 0.80 × 2 = 80
    act(() => { result.current.addItem(P1, 1) })
    act(() => { result.current.addItem(P2, 2) })
    expect(result.current.subtotal).toBeCloseTo(90)
  })
})

// ── useCart guard ──────────────────────────────────────────────────────────
describe('useCart — guard', () => {
  it('throws when used outside CartProvider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside CartProvider')
  })
})
