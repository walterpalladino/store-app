import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents } from '../utils/money'

// ---------------------------------------------------------------------------
// orderStatusService — admin-only override of an order's **fulfilment** status.
//
// An order has two independent status axes: `orderStatus` (fulfilment) and
// `paymentStatus` (money, rolled up from the order's payments). Only the
// fulfilment axis is settable — the money axis follows the Payments resource.
//
// Two endpoints, both requiring an authenticated ADMIN fetcher (`merchantFetch`):
//   GET  /api/orders/status         → the valid `orderStatus` values
//   POST /api/orders/:id/status     → force an order to one of them (emergency
//                                     override, bypassing the normal lifecycle)
// ---------------------------------------------------------------------------

/**
 * GET /api/orders/status — the possible **fulfilment** statuses. Returns `[]`
 * when the request fails so the caller can degrade gracefully instead of
 * throwing (utils/orders exports ORDER_STATUSES as the fallback list).
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
 * POST /api/orders/:id/status — force the order's `orderStatus` to `status`.
 * Requires ADMIN. The order's `paymentStatus` is not touched.
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
