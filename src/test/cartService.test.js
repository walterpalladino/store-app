import { describe, it, expect, vi } from 'vitest'
import { toCartItem, fetchCart, saveCart, deleteCart } from '../services/cartService'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'

const USER = 10
const flatError = (message, status) =>
  new Response(JSON.stringify({ message }), { status, headers: { 'Content-Type': 'application/json' } })

// ── toCartItem (snapshot mapping) ────────────────────────────────────────────
// Product prices are in decimal currency units; the API snapshot is integer
// cents ($10 → 1000), so the mapper multiplies out on the way to the backend.
describe('cartService.toCartItem', () => {
  it('builds a denormalised snapshot from a product (prices in cents)', () => {
    const item = toCartItem({ sku: 'A', title: 'Widget', price: 10, discountPercentage: 20 }, 3)
    expect(item).toEqual({ sku: 'A', description: 'Widget', unitPrice: 1000, discountPrice: 800, qty: 3 })
  })

  it('defaults description to sku and discountPrice to unitPrice when no discount', () => {
    const item = toCartItem({ sku: 'B', price: 5 }, 1)
    expect(item.description).toBe('B')
    expect(item.discountPrice).toBe(500)
  })

  it('clamps discountPrice within [0, unitPrice] (cents)', () => {
    expect(toCartItem({ sku: 'C', title: 'X', price: 10, discountPercentage: 0 }, 1).discountPrice).toBe(1000)
    expect(toCartItem({ sku: 'D', title: 'Y', price: 10, discountPercentage: 100 }, 1).discountPrice).toBe(0)
  })
})

// ── fetchCart ────────────────────────────────────────────────────────────────
describe('cartService.fetchCart', () => {
  it('returns the cart on 200 and calls the nested URL', async () => {
    const cart = { id: 7, items: [] }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(cart)))
    expect(await fetchCart(authFetch, USER)).toEqual(cart)
    expect(authFetch).toHaveBeenCalledWith(API.users.cart(USER))
  })

  it('returns null when there is no cart yet (404)', async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await fetchCart(authFetch, USER)).toBeNull()
  })

  it('throws the server message on error (flat { message })', async () => {
    const authFetch = vi.fn().mockResolvedValue(flatError('Boom', 500))
    await expect(fetchCart(authFetch, USER)).rejects.toThrow('Boom')
  })
})

// ── saveCart ─────────────────────────────────────────────────────────────────
describe('cartService.saveCart', () => {
  it('PUTs the item set and returns the updated cart', async () => {
    const cart = { id: 7, items: [{ sku: 'A' }] }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(cart)))
    const res = await saveCart(authFetch, USER, { items: [{ sku: 'A' }] })
    expect(res).toEqual(cart)
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe(API.users.cart(USER))
    expect(opts.method).toBe('PUT')
  })

  it('falls back to POST (create) when there is no cart yet (404)', async () => {
    const cart = { id: 7 }
    const authFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))      // PUT → not found
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope(cart), 201))  // POST → created
    expect(await saveCart(authFetch, USER, { items: [] })).toEqual(cart)
    expect(authFetch.mock.calls[0][1].method).toBe('PUT')
    expect(authFetch.mock.calls[1][1].method).toBe('POST')
  })

  it('throws on a 422 validation error', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('invalid item'), 422))
    await expect(saveCart(authFetch, USER, { items: [] })).rejects.toThrow('invalid item')
  })
})

// ── deleteCart ───────────────────────────────────────────────────────────────
describe('cartService.deleteCart', () => {
  it('returns the deleted cart on 200', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ id: 7 })))
    expect(await deleteCart(authFetch, USER)).toEqual({ id: 7 })
    expect(authFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('returns null when there is nothing to delete (404)', async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await deleteCart(authFetch, USER)).toBeNull()
  })
})
