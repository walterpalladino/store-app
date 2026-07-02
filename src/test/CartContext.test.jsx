import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { okEnvelope, mockJsonResponse, makeProduct } from './helpers.jsx'

// Mock auth so we control the user and authFetch used for persistence.
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../context/AuthContext'
import { CartProvider, useCart } from '../context/CartContext'

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>

function makeAuthFetch({ get, mutate } = {}) {
  return vi.fn((url, opts = {}) => {
    const method = opts.method || 'GET'
    if (method === 'GET') return Promise.resolve(get ? get() : new Response(null, { status: 404 }))
    return Promise.resolve(mutate ? mutate() : mockJsonResponse(okEnvelope({ id: 1 })))
  })
}

function loginAs(authFetch) {
  useAuth.mockReturnValue({ user: { id: 10 }, authFetch })
}

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

describe('CartContext — logged out', () => {
  it('all mutators are no-ops and nothing is persisted', () => {
    const authFetch = vi.fn()
    useAuth.mockReturnValue({ user: null, authFetch })
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => {
      result.current.addItem(makeProduct({ sku: 'A' }), 1)
      result.current.setQuantity('A', 2)
      result.current.removeItem('A')
      result.current.clearCart()
    })
    expect(result.current.items).toEqual([])
    expect(authFetch).not.toHaveBeenCalled()
  })
})

describe('CartContext — logged in', () => {
  it('starts empty when the backend has no cart yet (404)', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([])
  })

  it('hydrates the cart by refetching products by SKU', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({
        items: [{ sku: 'A', description: 'Widget', unitPrice: 10, discountPrice: 10, qty: 2 }],
      })),
    }))
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ sku: 'A', title: 'Widget', price: 10, discountPercentage: 0, thumbnail: 't', category: 'c' })),
    )

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.totalQuantity).toBe(2))

    expect(result.current.isInCart('A')).toBe(true)
    expect(result.current.getQuantity('A')).toBe(2)
    expect(result.current.subtotal).toBeCloseTo(20)
  })

  it('falls back to the snapshot SKU when the refetched product omits it', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({
        items: [{ sku: 'A', description: 'W', unitPrice: 10, discountPrice: 10, qty: 1 }],
      })),
    }))
    // Refetched product has no `sku` field → context uses the snapshot's.
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ title: 'W', price: 10 })))
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.totalQuantity).toBe(1))
    expect(result.current.isInCart('A')).toBe(true)
  })

  it('adds a product optimistically and persists a denormalised snapshot', async () => {
    const authFetch = makeAuthFetch()
    loginAs(authFetch)
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A', price: 10, discountPercentage: 20 }), 2) })

    expect(result.current.isInCart('A')).toBe(true)
    expect(result.current.totalQuantity).toBe(2)
    const write = authFetch.mock.calls.find(([, o]) => o && o.method && o.method !== 'GET')
    expect(write).toBeTruthy()
    const body = JSON.parse(write[1].body)
    expect(body.items[0]).toMatchObject({ sku: 'A', unitPrice: 10, discountPrice: 8, qty: 2 })
  })

  it('ignores a product without a SKU and defaults quantity to 1', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem({ title: 'No SKU', price: 5 }) }) // no sku → ignored
    expect(result.current.items).toEqual([])

    act(() => { result.current.addItem(makeProduct({ sku: 'A' })) }) // default qty 1
    expect(result.current.getQuantity('A')).toBe(1)
    // lookups for an absent SKU
    expect(result.current.getQuantity('ZZZ')).toBe(0)
    expect(result.current.isInCart('ZZZ')).toBe(false)
  })

  it('setQuantity updates to a positive value', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 1) })
    act(() => { result.current.setQuantity('A', 5) })
    expect(result.current.getQuantity('A')).toBe(5)
  })

  it('rebuilds a free item (unitPrice 0) with 0% discount', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({
        items: [{ sku: 'FREE', description: 'Freebie', unitPrice: 0, discountPrice: 0, qty: 1 }],
      })),
    }))
    global.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.totalQuantity).toBe(1))
    expect(result.current.items[0].product.discountPercentage).toBe(0)
    expect(result.current.subtotal).toBe(0)
  })

  it('setQuantity to 0 removes the item', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 3) })
    expect(result.current.getQuantity('A')).toBe(3)

    act(() => { result.current.setQuantity('A', 0) })
    expect(result.current.isInCart('A')).toBe(false)
  })

  it('removeItem removes by SKU', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 1) })
    act(() => { result.current.removeItem('A') })
    expect(result.current.items).toEqual([])
  })

  it('increments quantity when the same SKU is added again', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 1) })
    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 2) })
    expect(result.current.getQuantity('A')).toBe(3)
    expect(result.current.items).toHaveLength(1)
  })

  it('clearCart empties the cart', async () => {
    loginAs(makeAuthFetch())
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.addItem(makeProduct({ sku: 'A' }), 2) })
    act(() => { result.current.clearCart() })
    expect(result.current.items).toEqual([])
  })

  it('reverts the optimistic add and surfaces an error when persistence fails', async () => {
    const authFetch = makeAuthFetch({ mutate: () => mockJsonResponse(okEnvelope(null), 500) })
    loginAs(authFetch)
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { result.current.addItem(makeProduct({ sku: 'A' }), 1) })
    await waitFor(() => expect(result.current.isInCart('A')).toBe(false)) // reverted
    expect(result.current.error).toBeTruthy()
  })

  it('rebuilds a display item from the snapshot when the product refetch fails', async () => {
    loginAs(makeAuthFetch({
      get: () => mockJsonResponse(okEnvelope({
        items: [{ sku: 'A', description: 'Ghost Widget', unitPrice: 10, discountPrice: 8, qty: 1 }],
      })),
    }))
    global.fetch = vi.fn().mockRejectedValue(new Error('network')) // refetch throws
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.totalQuantity).toBe(1))

    expect(result.current.items[0].product).toMatchObject({ sku: 'A', title: 'Ghost Widget', price: 10 })
    // discountPercentage derived from unit/discount price: (1 - 8/10) * 100 = 20
    expect(result.current.items[0].product.discountPercentage).toBeCloseTo(20)
  })

  it('sets an error when the cart load fails', async () => {
    loginAs(makeAuthFetch({ get: () => mockJsonResponse(okEnvelope(null), 500) }))
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.items).toEqual([])
  })

  it('clearCart is a no-op on an already-empty cart', async () => {
    const authFetch = makeAuthFetch()
    loginAs(authFetch)
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const before = authFetch.mock.calls.length
    act(() => { result.current.clearCart() })
    expect(authFetch.mock.calls.length).toBe(before)
  })
})
