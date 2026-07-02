import { describe, it, expect, vi } from 'vitest'
import { fetchWishlist, saveWishlist, deleteWishlist } from '../services/wishlistService'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'

const USER = 10

describe('wishlistService.fetchWishlist', () => {
  it('returns the wishlist on 200', async () => {
    const wl = { id: 5, name: 'Ideas', items: [{ sku: 'A' }] }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(wl)))
    expect(await fetchWishlist(authFetch, USER)).toEqual(wl)
    expect(authFetch).toHaveBeenCalledWith(API.users.wishlist(USER))
  })

  it('returns null when there is no wishlist yet (404)', async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await fetchWishlist(authFetch, USER)).toBeNull()
  })

  it('throws the server message on error', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('nope'), 500))
    await expect(fetchWishlist(authFetch, USER)).rejects.toThrow('nope')
  })
})

describe('wishlistService.saveWishlist', () => {
  it('PUTs { name, items } and returns the wishlist', async () => {
    const wl = { id: 5, name: 'Ideas', items: [{ sku: 'A' }] }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(wl)))
    const res = await saveWishlist(authFetch, USER, { name: 'Ideas', skus: ['A'] })
    expect(res).toEqual(wl)
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe(API.users.wishlist(USER))
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ name: 'Ideas', items: ['A'] })
  })

  it('falls back to POST (create) when there is no wishlist yet (404)', async () => {
    const wl = { id: 5 }
    const authFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))     // PUT
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope(wl), 201))   // POST
    expect(await saveWishlist(authFetch, USER, { name: 'Ideas', skus: [] })).toEqual(wl)
    expect(authFetch.mock.calls[1][1].method).toBe('POST')
  })

  it('throws on a 409 conflict', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('exists'), 409))
    await expect(saveWishlist(authFetch, USER, { name: 'x', skus: [] })).rejects.toThrow('exists')
  })
})

describe('wishlistService.deleteWishlist', () => {
  it('returns the deleted wishlist on 200', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ id: 5 })))
    expect(await deleteWishlist(authFetch, USER)).toEqual({ id: 5 })
    expect(authFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('returns null when there is nothing to delete (404)', async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await deleteWishlist(authFetch, USER)).toBeNull()
  })
})
