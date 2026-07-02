import API from '../config/api'
import { unwrap } from '../utils/apiUtils'

/**
 * Submit an order to POST /api/orders
 * Request body:  { userId, products, address, payment, total, discountedTotal,
 *                  totalProducts, totalQuantity, status }
 * Response:      { success, data: { id, userId, products, total, discountedTotal,
 *                                   totalProducts, totalQuantity, status,
 *                                   address, payment } }
 */
export async function submitOrder(payload) {
  const res = await fetch(API.orders.create, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })

  // unwrap throws with the server's error.message on failure
  const data = await unwrap(res)

  // Merge: prefer our submitted payload for rich product/address/payment detail;
  // take id and status from the server response.
  return {
    ...data,
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
