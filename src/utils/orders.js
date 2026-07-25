// ---------------------------------------------------------------------------
// orders — shape helpers for order objects returned by the API.
//
// **Status is two axes, not one.** The backend splits an order's state into
// `orderStatus` (fulfilment: pending → confirmed → processing → shipped →
// delivered, or cancelled) and `paymentStatus` (money, rolled up from the
// order's payments: unpaid → partially_paid → paid, plus refunded /
// partially_refunded / cancelled). The old single `status` field — and the
// settlement fields that hung off the order (`paidOn`, `amountRefunded`,
// `refundStatus`) — are gone; settlement now lives on the Payments resource.
// The helpers below read the new axes while still tolerating the legacy/demo
// shape, so the static fallbacks the UI ships with keep rendering.
//
// Order line items are a denormalised snapshot in the current backend shape
// (`sku`, `description`, `unitPrice`, `discountPrice`, `qty`) — see the
// "Orders" section of API_CONTRACT.md. `normalizeOrder` flattens each item to
// the richer shape the UI renders (`title`, `price`, `quantity`, `total`,
// `discountedTotal`, `discountPercentage`), while still tolerating the
// legacy/demo shape (`title`/`price`/`quantity`/`total`/…). Keeping this in one
// place means every order view (purchase history, admin sales) reads items the
// same way.
// ---------------------------------------------------------------------------

// The fulfilment lifecycle, used as a fallback when GET /api/orders/status is
// unavailable (that endpoint lists `orderStatus` values only).
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

// Legacy single-axis statuses → the axis each one belonged to. Only needed for
// the demo/fallback data and any order stored before the split.
const LEGACY_TO_ORDER_STATUS = {
  new: 'pending', draft: 'pending', pending_payment: 'pending',
  'payment pending': 'pending', payment_failed: 'pending',
  paid: 'confirmed', fulfilled: 'delivered', refunded: 'delivered',
  cancelled: 'cancelled',
}
const LEGACY_TO_PAYMENT_STATUS = {
  new: 'unpaid', pending: 'unpaid', draft: 'unpaid', pending_payment: 'unpaid',
  'payment pending': 'unpaid', payment_failed: 'unpaid',
  paid: 'paid', fulfilled: 'paid', refunded: 'refunded', cancelled: 'cancelled',
}

const lower = (s) => String(s ?? '').toLowerCase()

/** The order's fulfilment status, falling back to the legacy `status` field. */
export function orderStatusOf(order) {
  if (order?.orderStatus) return lower(order.orderStatus)
  const legacy = lower(order?.status)
  return LEGACY_TO_ORDER_STATUS[legacy] ?? legacy
}

/** The order's money status (a rollup of its payments), tolerating legacy data. */
export function paymentStatusOf(order) {
  if (order?.paymentStatus) return lower(order.paymentStatus)
  const legacy = lower(order?.status)
  return LEGACY_TO_PAYMENT_STATUS[legacy] ?? ''
}

/**
 * An **open** order — still awaiting payment and not cancelled. A user may have
 * only one at a time; a second checkout is rejected with 409 while one exists.
 */
export function isOpenOrder(order) {
  const pay = paymentStatusOf(order)
  return (pay === 'unpaid' || pay === 'partially_paid') && orderStatusOf(order) !== 'cancelled'
}

/** True once the order's money axis reports the full amount captured. */
export function isOrderPaid(order) {
  return paymentStatusOf(order) === 'paid'
}

// "pending_payment" → "Pending Payment"
export const prettyStatus = (s) =>
  String(s ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// One palette for every status chip in the app — fulfilment, money rollup and
// per-payment states all draw from it so the same word never changes colour.
const STATUS_STYLES = {
  // fulfilment (orderStatus)
  'pending':             { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'confirmed':           { color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'  },
  'processing':          { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'shipped':             { color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'  },
  'delivered':           { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'cancelled':           { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  // money (paymentStatus / a payment's own status)
  'unpaid':              { color: '#6b6560', bg: 'rgba(107,101,96,0.1)'   },
  'partially_paid':      { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'paid':                { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'payment_failed':      { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'refunded':            { color: '#7a6aa8', bg: 'rgba(122,106,168,0.12)' },
  'partially_refunded':  { color: '#7a6aa8', bg: 'rgba(122,106,168,0.12)' },
  'failed':              { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'none':                { color: '#6b6560', bg: 'rgba(107,101,96,0.1)'   },
  // legacy / demo values still present in the static fallbacks
  'draft':               { color: '#6b6560', bg: 'rgba(107,101,96,0.1)'   },
  'pending_payment':     { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'fulfilled':           { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'payment completed':   { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'completed':           { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'error':               { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'payment could not be processed': { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)' },
}

/** Chip colours for any status word; unknown values get a neutral grey. */
export function statusStyle(status) {
  return STATUS_STYLES[lower(status)] ?? { color: '#6b6560', bg: 'rgba(107,101,96,0.1)' }
}

/**
 * Public order id shown to users: the first segment of the UUID (#018f9a2c),
 * falling back to the padded numeric id for demo/legacy orders without one.
 */
export const shortOrderId = (order) =>
  order?.orderId ? `#${String(order.orderId).split('-')[0]}` : `#${String(order?.id).padStart(5, '0')}`

/**
 * Map an order to the flat line-item shape the UI renders, tolerating both the
 * current backend (`description`/`unitPrice`/`discountPrice`/`qty`, sku-only) and
 * the legacy/demo shape (`title`/`price`/`quantity`/`total`/…).
 */
export function normalizeOrder(o) {
  const products = (Array.isArray(o?.products) ? o.products : []).map((p, i) => {
    const price     = p.price ?? p.unitPrice ?? 0
    const quantity  = p.quantity ?? p.qty ?? 0
    const discUnit  = p.discountPrice ?? price               // discounted UNIT price
    const total           = p.total ?? +(price * quantity).toFixed(2)
    const discountedTotal = p.discountedTotal ?? +(discUnit * quantity).toFixed(2)
    const discountPercentage = p.discountPercentage
      ?? (price > 0 ? +(((price - discUnit) / price) * 100).toFixed(2) : 0)
    return {
      id: p.id ?? p.productId ?? p.sku ?? i,   // React key + thumbnail lookup
      sku: p.sku ?? null,
      title: p.title ?? p.description ?? p.sku ?? 'Item',
      price, quantity, total, discountedTotal, discountPercentage,
    }
  })
  return {
    ...o,
    products,
    total:           o?.total ?? products.reduce((s, p) => s + p.total, 0),
    discountedTotal: o?.discountedTotal ?? products.reduce((s, p) => s + p.discountedTotal, 0),
    totalProducts:   o?.totalProducts ?? products.length,
    totalQuantity:   o?.totalQuantity ?? products.reduce((s, p) => s + p.quantity, 0),
  }
}
