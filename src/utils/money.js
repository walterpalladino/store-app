// ---------------------------------------------------------------------------
// money — currency-unit conversion at the API boundary.
//
// The backend speaks **integer cents** for every monetary value (see the
// "Money & amounts" section of API_CONTRACT.md): a `price` of `499` means
// $4.99. The UI, however, works in decimal currency units and formats them with
// `toLocaleString({ style: 'currency' })`. To keep every page and every price
// computation in one representation, money is converted **once, at the edge**:
// cents → units on the way in, units → cents on the way out. Everything in
// between (subtotals, tax, discounts, `fmt(...)`) stays in decimal units.
// ---------------------------------------------------------------------------

import { resolveImageUrl } from '../config/api'

/** Integer cents → decimal currency units (e.g. 499 → 4.99). */
export const centsToUnits = (cents) => (Number(cents) || 0) / 100

/** Decimal currency units → integer cents (e.g. 4.99 → 499). */
export const unitsToCents = (units) => Math.round((Number(units) || 0) * 100)

// Convert a single field only when it carries a value — `null`/`undefined` are
// left untouched so absent fields don't collapse to `0`.
const conv = (v) => (v == null ? v : centsToUnits(v))

/**
 * Normalise a product from the API: `price` cents → units, and resolve the
 * read-only image fields (`thumbnail`, `primaryImage`, `images`) so they load
 * in the browser (see resolveImageUrl — routes backend images through the dev
 * proxy to avoid cross-origin blocking).
 */
export function productFromCents(product) {
  if (!product || typeof product !== 'object') return product
  return {
    ...product,
    price: conv(product.price),
    ...(product.thumbnail    != null && { thumbnail:    resolveImageUrl(product.thumbnail) }),
    ...(product.primaryImage != null && { primaryImage: resolveImageUrl(product.primaryImage) }),
    ...(Array.isArray(product.images) && { images: product.images.map(resolveImageUrl) }),
  }
}

/** Normalise a cart from the API: item and total money fields cents → units. */
export function cartFromCents(cart) {
  if (!cart || typeof cart !== 'object') return cart
  return {
    ...cart,
    totalItemPrices: conv(cart.totalItemPrices),
    totalItemDiscounts: conv(cart.totalItemDiscounts),
    items: Array.isArray(cart.items)
      ? cart.items.map((i) => ({
          ...i,
          unitPrice: conv(i.unitPrice),
          discountPrice: conv(i.discountPrice),
        }))
      : cart.items,
  }
}

/** Normalise an order from the API: every money field cents → units. */
export function orderFromCents(order) {
  if (!order || typeof order !== 'object') return order
  return {
    ...order,
    total: conv(order.total),
    discountedTotal: conv(order.discountedTotal),
    products: Array.isArray(order.products)
      ? order.products.map((p) => ({
          ...p,
          price: conv(p.price),
          unitPrice: conv(p.unitPrice),
          discountPrice: conv(p.discountPrice),
          total: conv(p.total),
          discountedTotal: conv(p.discountedTotal),
        }))
      : order.products,
    payment: order.payment && typeof order.payment === 'object'
      ? { ...order.payment, amountTotal: conv(order.payment.amountTotal) }
      : order.payment,
  }
}

/** Normalise a checkout session from the API: `amountTotal` cents → units. */
export function checkoutFromCents(checkout) {
  if (!checkout || typeof checkout !== 'object') return checkout
  return { ...checkout, amountTotal: conv(checkout.amountTotal) }
}
