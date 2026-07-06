import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents } from '../utils/money'

// ---------------------------------------------------------------------------
// orderStatusService — admin-only order status override.
//
// Two endpoints, both requiring an authenticated ADMIN fetcher (`merchantFetch`):
//   GET  /api/orders/status         → the list of valid statuses
//   POST /api/orders/:id/status     → force an order to one of them (emergency
//                                     override, bypassing the normal lifecycle)
// ---------------------------------------------------------------------------

/**
 * GET /api/orders/status — the possible order statuses. Returns `[]` when the
 * request fails so the caller can degrade gracefully instead of throwing.
 *
 * @param {(url: string, opts?: object) => Promise<Response>} merchantFetch
 * @returns {Promise<string[]>}
 */
export async function fetchStatusOptions(merchantFetch) {
  const res = await merchantFetch(API.orders.statusOptions)
  if (!res.ok) return []
  const { statuses } = await readData(res)   // { statuses: [...] }
  return Array.isArray(statuses) ? statuses : []
}

/**
 * POST /api/orders/:id/status — force `order` to `status`. Requires ADMIN.
 *
 * @param {(url: string, opts?: object) => Promise<Response>} merchantFetch
 * @param {number|string} id — the order's internal numeric id
 * @param {string} status — one of the values from fetchStatusOptions
 * @returns {Promise<object>} the updated order (money fields in decimal units)
 *
 * Throws the server message on failure (403 non-admin, 404 no such order,
 * 422 missing/unknown status).
 */
export async function changeOrderStatus(merchantFetch, id, status) {
  const res = await merchantFetch(API.orders.setStatus(id), {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return orderFromCents(await readData(res))   // updated order object
}
