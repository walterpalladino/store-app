import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { orderFromCents, checkoutFromCents } from '../utils/money'

// ---------------------------------------------------------------------------
// checkoutService — places an order via POST /api/checkout.
//
// Checkout is a single backend operation: it registers the order from the
// caller's cart, starts a Stripe **hosted** Checkout Session, moves the order to
// "Payment Pending", and clears the cart. Orders are never created from the
// front end — this is what prevents duplicate orders.
//
// Hosted (not embedded) flow: the front end POSTs the success/cancel callback
// URLs, then redirects the browser to `checkout.url` (Stripe's hosted page).
// Stripe collects payment and redirects back to `successUrl` (with
// `?session_id=…`) or `cancelUrl`. Payment settles asynchronously via the
// checkout webhook — so the front end's job ends at the callback; the backend
// owns the order-status transitions.
// ---------------------------------------------------------------------------

/** True when the order/payment has settled successfully. */
export function isSuccess(status) {
  const s = String(status).toLowerCase()
  return s === 'succeeded' || s === 'complete' || s === 'completed' ||
    s === 'paid' || s === 'fulfilled' || s === 'payment completed'
}

// A user may have only one order in these states at a time; a new checkout is
// rejected with 409 while one exists. Compared case-insensitively — the backend
// reports `pending_payment` (snake_case).
const OPEN_ORDER_STATUSES = ['new', 'pending', 'draft', 'pending_payment', 'payment pending']

/**
 * GET /api/orders — return the caller's current open order (draft / pending
 * payment), or null. Used to detect an interrupted checkout.
 */
export async function getOpenOrder(authFetch) {
  const res = await authFetch(API.orders.list)
  if (!res.ok) return null
  const { orders } = await readData(res)
  const open = (orders ?? []).find((o) => OPEN_ORDER_STATUSES.includes(String(o.status).toLowerCase()))
  return open ? orderFromCents(open) : null   // money fields cents → units
}

/**
 * GET /api/orders — find the caller's order for a Stripe checkout session,
 * matched on the session id the order stored at checkout. The hosted success
 * callback only carries `?session_id=…` in the URL (page state is lost across
 * the external redirect), so the return page looks the order up this way. Falls
 * back to the newest order when the session can't be matched; null on failure.
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
