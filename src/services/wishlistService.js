import API from '../config/api'
import { readError, readData } from './httpEnvelope'

// ---------------------------------------------------------------------------
// wishlistService — backend CRUD for the per-user wishlist singleton
// (`/api/users/:id/wishlist`, auth required). The backend persists only SKUs;
// the caller is responsible for rebuilding display data (refetch by SKU).
// ---------------------------------------------------------------------------

/** GET the user's wishlist, or `null` when none exists yet (404). */
export async function fetchWishlist(authFetch, userId) {
  const res = await authFetch(API.users.wishlist(userId))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}

/**
 * Create or replace the wishlist. Tries PUT (replace) first and falls back to
 * POST (create) when there is no wishlist yet (404).
 * @param {{ name: string, skus: string[] }} data
 */
export async function saveWishlist(authFetch, userId, { name, skus }) {
  const body = JSON.stringify({ name, items: skus })
  let res = await authFetch(API.users.wishlist(userId), { method: 'PUT', body })
  if (res.status === 404) {
    res = await authFetch(API.users.wishlist(userId), { method: 'POST', body })
  }
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}

/** DELETE the wishlist. Returns `null` when there was nothing to delete (404). */
export async function deleteWishlist(authFetch, userId) {
  const res = await authFetch(API.users.wishlist(userId), { method: 'DELETE' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}
