import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { paymentFromCents, orderFromCents } from '../utils/money'

// ---------------------------------------------------------------------------
// paymentsService — the read-only Payments resource.
//
// Payments were split out of the order object: settlement state (`paidOn`,
// `amountRefunded`, `refundStatus`) and the processor lifecycle now live on a
// payment, and the order only carries a rolled-up `paymentStatus`. See the
// "Payments" section of API_CONTRACT.md.
//
// Two endpoints exist, both scoped to the caller through the owning order:
//   GET /api/orders/:id/payments   → the payments of one order (numeric id)
//   GET /api/payments/:id          → one payment by its own numeric id
//
// **There is no list-all endpoint.** `fetchPayments` therefore composes the
// admin-wide list client-side: it resolves a set of orders (all of them, or the
// ones matching an order-id filter) and fans out one payments request per order.
// That is an N+1 by construction — the fan-out is bounded by MAX_ORDERS and
// CONCURRENCY below, and the result reports whether it had to stop early.
// ---------------------------------------------------------------------------

// Bounds for the client-side fan-out (see above).
const MAX_ORDERS  = 200   // orders scanned before the list is reported truncated
const CONCURRENCY = 6     // simultaneous per-order payment requests

/** Run `fn` over `items` with at most `limit` requests in flight at once. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

/** Newest first: payments are returned oldest-first per order, so sort globally. */
function byNewest(a, b) {
  const ta = Date.parse(a?.createdAt ?? '') || 0
  const tb = Date.parse(b?.createdAt ?? '') || 0
  return tb - ta || (Number(b?.id) || 0) - (Number(a?.id) || 0)
}

/**
 * GET /api/orders/:id/payments — the payments of one of the caller's orders,
 * by the order's **numeric** id. Money fields are converted cents → units.
 *
 * @param {(url: string, opts?: object) => Promise<Response>} fetcher
 * @param {number|string} orderId — the order's numeric id (not the UUID)
 * @returns {Promise<object[]>}
 *
 * Throws the server message on failure (404 no such order / not yours).
 */
export async function fetchOrderPayments(fetcher, orderId) {
  const res = await fetcher(API.orders.payments(orderId))
  if (!res.ok) throw new Error(await readError(res))
  const { payments } = await readData(res)   // { payments: [...] }
  return Array.isArray(payments) ? payments.map(paymentFromCents) : []
}

/**
 * GET /api/payments/:id — one payment by its numeric id. Money fields are
 * converted cents → units.
 *
 * Throws the server message on failure (404 not found / not yours).
 */
export async function fetchPayment(fetcher, id) {
  const res = await fetcher(API.payments.byId(id))
  if (!res.ok) throw new Error(await readError(res))
  return paymentFromCents(await readData(res))
}

/**
 * The payments list the admin panel renders — composed client-side, since the
 * API has no list-all route (see the note at the top of this file).
 *
 * With `orderId` set the orders are narrowed through `GET /api/orders/search`
 * (case-insensitive substring match on the **public** order UUID), which is the
 * same filter the Sales panel uses; without it every visible order is scanned.
 *
 * Each returned payment carries an `order` summary so the list can show which
 * order it belongs to without a second lookup.
 *
 * @param {(url: string, opts?: object) => Promise<Response>} fetcher
 * @param {{ orderId?: string }} [options]
 * @returns {Promise<{ payments: object[], orderCount: number, truncated: boolean, failed: number }>}
 *
 * Throws the server message if the orders request itself fails; a per-order
 * payments request that fails is skipped and counted in `failed`, so one bad
 * order never blanks the whole list.
 */
export async function fetchPayments(fetcher, { orderId } = {}) {
  const filter = String(orderId ?? '').trim()
  const res = await fetcher(filter ? API.orders.search(filter) : API.orders.list)
  if (!res.ok) throw new Error(await readError(res))

  const { orders } = await readData(res)   // { orders: [...] }
  const all = Array.isArray(orders) ? orders.map(orderFromCents) : []
  const scanned = all.slice(0, MAX_ORDERS)

  let failed = 0
  const perOrder = await mapLimit(scanned, CONCURRENCY, async (order) => {
    try {
      const payments = await fetchOrderPayments(fetcher, order.id)
      return payments.map((p) => ({
        ...p,
        // `orderId` on a payment is the order's public UUID; keep a summary of
        // the owning order alongside it for the list view.
        order: {
          id: order.id,
          orderId: order.orderId,
          orderStatus: order.orderStatus ?? order.status,
          paymentStatus: order.paymentStatus,
          discountedTotal: order.discountedTotal,
          currency: order.currency,
        },
      }))
    } catch {
      failed += 1
      return []
    }
  })

  return {
    payments: perOrder.flat().sort(byNewest),
    orderCount: scanned.length,
    truncated: all.length > scanned.length,
    failed,
  }
}
