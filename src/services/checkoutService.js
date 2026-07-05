import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents, checkoutFromCents } from '../utils/money'

// ---------------------------------------------------------------------------
// checkoutService — places an order via POST /api/checkout.
//
// Checkout is a single backend operation: it registers the order from the
// caller's cart, starts a (mock) Stripe embedded Checkout Session, moves the
// order to "Payment Pending", and clears the cart. Orders are never created
// from the front end anymore — this is what prevents duplicate orders.
// ---------------------------------------------------------------------------

// redirect_status values reported by the embedded checkout on return.
export const REDIRECT_STATUS = {
  SUCCEEDED: 'succeeded',
  FAILED:    'failed',
  CANCELED:  'canceled',
}

/** True when the payment settled successfully. */
export function isSuccess(status) {
  const s = String(status).toLowerCase()
  return s === REDIRECT_STATUS.SUCCEEDED || s === 'complete' || s === 'paid'
}

// A user may have only one order in these states at a time; a new checkout is
// rejected with 409 while one exists. Compared case-insensitively — the backend
// reports `pending_payment` (snake_case), so exact-case matching silently
// failed to find the open order and the 409 resume path dead-ended.
const OPEN_ORDER_STATUSES = ['new', 'pending', 'pending_payment', 'payment pending']

/** Rebuild the embedded-session shape PaymentPage needs from a saved order. */
function checkoutFromOrder(order) {
  const p = order?.payment ?? {}
  return {
    sessionId:    p.sessionId,
    clientSecret: p.clientSecret,
    returnUrl:    p.returnUrl,
    amountTotal:  p.amountTotal,
    currency:     p.currency,
    status:       p.status,
  }
}

/**
 * GET /api/orders — return the caller's current open order (New or Payment
 * Pending), or null. Used to resume an interrupted checkout.
 */
export async function getOpenOrder(authFetch) {
  const res = await authFetch(API.orders.list)
  if (!res.ok) return null
  const { orders } = await readData(res)
  const open = (orders ?? []).find((o) => OPEN_ORDER_STATUSES.includes(String(o.status).toLowerCase()))
  return open ? orderFromCents(open) : null   // money fields cents → units
}

/**
 * POST /api/checkout — empty JSON body. Returns `{ order, checkout }` where
 * `checkout` carries the embedded session ({ sessionId, clientSecret,
 * returnUrl, amountTotal, currency, status }).
 *
 * On 409 the caller already has an unfinished order (a previous checkout that
 * was never paid). Since the backend exposes no way to cancel it, we resume it:
 * fetch that order and hand it back with `resumed: true` so the flow continues
 * to payment instead of dead-ending on an error. Throws on 422 (empty cart) and
 * any other failure.
 */
export async function startCheckout(authFetch) {
  // Send an explicit empty JSON body: authFetch always sets
  // `Content-Type: application/json`, and the backend's body parser 500s on a
  // JSON content-type with an empty body. `{}` keeps the header honest.
  const res = await authFetch(API.checkout, { method: 'POST', body: JSON.stringify({}) })

  if (res.status === 409) {
    // getOpenOrder already returns an order in decimal units, so the session
    // rebuilt from it is in units too — no further conversion here.
    const order = await getOpenOrder(authFetch)
    if (order) return { order, checkout: checkoutFromOrder(order), resumed: true }
  }

  if (!res.ok) throw new Error(await readError(res))
  const data = await readData(res)
  // Order totals and the checkout session amount arrive as integer cents.
  return { ...data, order: orderFromCents(data.order), checkout: checkoutFromCents(data.checkout) }
}
