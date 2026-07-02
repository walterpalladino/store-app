import API from '../config/api'
import { readError, readData } from './httpEnvelope'

// ---------------------------------------------------------------------------
// cartService — backend CRUD for the per-user cart singleton
// (`/api/users/:id/cart`, auth required). The backend stores a denormalised
// snapshot per item (sku, description, unitPrice, discountPrice, qty); callers
// rebuild richer display data by refetching products by SKU.
// ---------------------------------------------------------------------------

/**
 * Build the denormalised cart-item snapshot the API expects from a product +
 * quantity. `discountPrice` is the discounted unit price, clamped to unitPrice.
 */
export function toCartItem(product, qty) {
  const unitPrice = Number(product.price) || 0
  const discountPrice = +(unitPrice * (1 - (product.discountPercentage ?? 0) / 100)).toFixed(2)
  return {
    sku:           product.sku,
    description:   product.title ?? product.description ?? product.sku,
    unitPrice,
    discountPrice: Math.min(Math.max(discountPrice, 0), unitPrice),
    qty,
  }
}

/** GET the user's cart, or `null` when none exists yet (404). */
export async function fetchCart(authFetch, userId) {
  const res = await authFetch(API.users.cart(userId))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}

/**
 * Create or replace the cart. Tries PUT (replace) first and falls back to
 * POST (create) when there is no cart yet (404).
 * @param {{ items: Array }} data — full denormalised item set
 */
export async function saveCart(authFetch, userId, { items }) {
  const body = JSON.stringify({ items })
  let res = await authFetch(API.users.cart(userId), { method: 'PUT', body })
  if (res.status === 404) {
    res = await authFetch(API.users.cart(userId), { method: 'POST', body })
  }
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}

/** DELETE the cart. Returns `null` when there was nothing to delete (404). */
export async function deleteCart(authFetch, userId) {
  const res = await authFetch(API.users.cart(userId), { method: 'DELETE' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}
