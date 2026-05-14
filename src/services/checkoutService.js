import API from '../config/api'

// ---------------------------------------------------------------------------
// CheckoutService — submits order to mock endpoint and returns the response.
// The mock always returns the same shape regardless of what we POST,
// so we merge our submitted data with the response for display.
// ---------------------------------------------------------------------------

/**
 * Submit an order.
 * @param {object} payload  { products, address, payment, userId, total, discountedTotal, ... }
 * @returns {object}        Full response including status, id, products, address, payment
 */
export async function submitOrder(payload) {
  // DummyJSON custom endpoints always return the same body — we POST the real
  // payload so the network call is authentic, then merge our data into the response.
  const res = await fetch(API.transactions.checkout, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let responseData = {}
  try {
    responseData = await res.json()
  } catch {
    // Endpoint may not return JSON on error
  }

  if (!res.ok) {
    throw new Error(responseData.message || `Server error (${res.status})`)
  }

  // Merge: prefer our submitted data for products/address/payment (richer),
  // take status + id from response.
  return {
    ...responseData,
    // Overwrite with what we actually submitted so the confirmation is accurate
    products:        payload.products,
    address:         payload.address,
    payment:         payload.payment,
    total:           payload.total,
    discountedTotal: payload.discountedTotal,
    totalProducts:   payload.totalProducts,
    totalQuantity:   payload.totalQuantity,
    userId:          payload.userId,
  }
}
