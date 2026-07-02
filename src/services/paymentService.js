import API from '../config/api'
import { readError, readData } from './httpEnvelope'
import { STRIPE_MOCK } from '../config/stripe'

// ---------------------------------------------------------------------------
// paymentService — thin client for the backend's Stripe integration.
//
// Real flow: the backend creates a Stripe Checkout Session (returning a client
// secret for the embedded Payment Element, or a hosted URL), the customer pays,
// Stripe redirects to the return URL, and the return page confirms the status.
//
// Until those endpoints exist, MOCK mode (see config/stripe.js) synthesises the
// session and status so the whole flow is testable without a backend.
// ---------------------------------------------------------------------------

// Normalised Stripe payment statuses.
export const PAYMENT_STATUS = {
  SUCCEEDED:  'succeeded',
  PROCESSING: 'processing',
  FAILED:     'failed',
  CANCELED:   'canceled',
}

export function isSuccess(status) {
  return String(status).toLowerCase() === PAYMENT_STATUS.SUCCEEDED
}

/**
 * Create a Checkout Session for the order.
 * @param {{ amount:number, currency?:string, order?:object }} params
 * @returns {Promise<{ id, clientSecret, url?, amount, currency }>}
 */
export async function createCheckoutSession(authFetch, { amount, currency = 'usd', order }) {
  if (STRIPE_MOCK) {
    const id = `cs_mock_${Math.random().toString(36).slice(2, 10)}`
    return { id, clientSecret: `${id}_secret`, amount, currency, mock: true }
  }
  const res = await authFetch(API.payments.createSession, {
    method: 'POST',
    body:   JSON.stringify({ amount, currency, order }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}

/**
 * Retrieve the settled status of a payment session.
 * @param {string} sessionId
 * @param {string} [mockStatus] — in mock mode, the status simulated by the payment page
 * @returns {Promise<{ status, orderId?, sessionId }>}
 */
export async function getPaymentStatus(authFetch, sessionId, mockStatus) {
  if (STRIPE_MOCK) {
    return { sessionId, status: mockStatus || PAYMENT_STATUS.SUCCEEDED, mock: true }
  }
  const res = await authFetch(API.payments.session(sessionId))
  if (!res.ok) throw new Error(await readError(res))
  return readData(res)
}
