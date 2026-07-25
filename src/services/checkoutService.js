import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents, checkoutFromCents } from '../utils/money'
import { isOpenOrder } from '../utils/orders'

// ---------------------------------------------------------------------------
// checkoutService — places an order via POST /api/checkout.
//
// Checkout is a single backend operation: it registers the order from the
// caller's cart as `pending` / `unpaid`, starts a Stripe **hosted** Checkout
// Session, records a `pending` payment for it, and clears the cart. Orders are
// never created from the front end — this is what prevents duplicate orders.
//
// Hosted (not embedded) flow: the front end POSTs the success/cancel callback
// URLs, then redirects the browser to `checkout.url` (Stripe's hosted page).
// Stripe collects payment and redirects back to `successUrl` (with
// `?session_id=…`) or `cancelUrl`. Payment settles asynchronously via the
// checkout webhook — so the front end's job ends at the callback; the backend
// owns the payment settlement and the order's status rollup.
// ---------------------------------------------------------------------------

/**
 * True when a **status word** reports a settled payment. Kept for the payment
 * and checkout-session status strings; for an order, prefer `isOrderPaid`,
 * which reads the order's `paymentStatus` axis.
 */
export function isSuccess(status) {
  const s = String(status).toLowerCase()
  return s === 'succeeded' || s === 'complete' || s === 'completed' ||
    s === 'paid' || s === 'fulfilled' || s === 'payment completed'
}

/**
 * GET /api/orders — return the caller's current open order (still awaiting
 * payment, not cancelled), or null. Used to detect an interrupted checkout.
 *
 * "Open" is now read from the order's money axis (`paymentStatus` `unpaid` /
 * `partially_paid`) rather than the old single `status` field — see
 * `isOpenOrder` in utils/orders.
 */
export async function getOpenOrder(authFetch) {
  const res = await authFetch(API.orders.list)
  if (!res.ok) return null
  const { orders } = await readData(res)
  const open = (orders ?? []).find(isOpenOrder)
  return open ? orderFromCents(open) : null   // money fields cents → units
}

/**
 * GET /api/orders — find the caller's order for a Stripe checkout session. The
 * hosted success callback only carries `?session_id=…` in the URL (page state is
 * lost across the external redirect), so the return page has nothing else to go
 * on.
 *
 * **The session id is no longer matchable.** It used to be exposed as
 * `order.payment.sessionId`; with payments split out of the order it is a
 * processor identifier that the API never returns — not on the order, not on the
 * payment. So we fall back to the caller's newest order, which is the one
 * checkout just created (the list is newest first). The legacy match is kept for
 * older/demo payloads that still carry the field. Returns null on failure.
 */
export async function getOrderBySession(authFetch, sessionId) {
  const res = await authFetch(API.orders.list)
  if (!res.ok) return null
  const { orders } = await readData(res)
  const list = orders ?? []                                   // newest first
  const match = sessionId ? list.find((o) => o?.payment?.sessionId === sessionId) : null
  const order = match ?? list[0] ?? null
  return order ? orderFromCents(order) : null                 // money cents → units
}

/**
 * POST /api/checkout — body `{ successUrl, cancelUrl }` (both required by the
 * backend). Returns `{ order, checkout }` where `checkout.url` is the Stripe
 * hosted page to redirect the browser to.
 *
 * On 409 the caller already has an unfinished order (a previous checkout that
 * was never paid). The hosted session URL is ephemeral and not stored, so it
 * cannot be resumed by redirect; we hand the open order back with
 * `resumed: true` (and no `checkout`) so the caller can inform the user instead
 * of dead-ending. Throws on 422 (missing URLs / empty cart) and other failures.
 */
export async function startCheckout(authFetch, { successUrl, cancelUrl } = {}) {
  const res = await authFetch(API.checkout, {
    method: 'POST',
    body: JSON.stringify({ successUrl, cancelUrl }),
  })

  if (res.status === 409) {
    const order = await getOpenOrder(authFetch)
    if (order) return { order, checkout: null, resumed: true }
  }

  if (!res.ok) throw new Error(await readError(res))
  const data = await readData(res)
  // Order totals and the checkout session amount arrive as integer cents;
  // checkoutFromCents converts amountTotal and preserves `url`.
  return { ...data, order: orderFromCents(data.order), checkout: checkoutFromCents(data.checkout) }
}
