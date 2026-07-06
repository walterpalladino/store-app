// ---------------------------------------------------------------------------
// orders — shape helpers for order objects returned by the API.
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
