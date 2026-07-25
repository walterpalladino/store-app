import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents, centsToUnits } from '../utils/money'

// ---------------------------------------------------------------------------
// refundService — starts a refund on a paid order (admin-only).
//
// Refunding is a standalone operation, separate from the read-only orders
// resource: POST /api/refund { orderId } hands off to Stripe and moves the
// order's settled **payment** to `refundStatus: "pending"`. The refund then
// settles asynchronously via a server-to-server webhook (`amountRefunded` /
// `refundedOn` land on the payment later, and the order's `paymentStatus` rolls
// up), so the response we get back reports the *pending* state — not the final
// one. The order's fulfilment `orderStatus` is never changed by a refund.
// ---------------------------------------------------------------------------

/**
 * POST /api/refund — start a refund for a paid order. Requires an authenticated
 * ADMIN fetcher (`merchantFetch`).
 *
 * @param {(url: string, opts?: object) => Promise<Response>} merchantFetch
 * @param {number|string} orderId
 * @returns {Promise<{ order: object, refund: object }>} — money fields already
 *   converted from integer cents to decimal currency units.
 *
 * Throws the server message on failure (403 non-admin, 404 no such order,
 * 409 the order's `paymentStatus` is not `paid`, it has no settled payment, or
 * a refund already exists).
 */
export async function startRefund(merchantFetch, orderId) {
  const res = await merchantFetch(API.refund, {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  })
  if (!res.ok) throw new Error(await readError(res))

  const data = await readData(res)   // { order, refund }
  return {
    ...data,
    order: orderFromCents(data.order),
    refund: data.refund && typeof data.refund === 'object'
      ? { ...data.refund, amount: centsToUnits(data.refund.amount) }
      : data.refund,
  }
}
