/**
 * stripe.js — Stripe front-end configuration.
 *
 * The backend owns the real Stripe integration (creating Checkout Sessions /
 * PaymentIntents and handling webhooks). The front-end only needs the
 * publishable key to mount Stripe.js and a return URL for the redirect.
 *
 * While the backend `/api/payments/*` endpoints are still pending, MOCK mode
 * runs a simulated payment step so the checkout → payment → status flow can be
 * tested end-to-end. Flip it off by setting `VITE_STRIPE_MOCK=false` once the
 * backend is live.
 */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''

export const STRIPE_MOCK = (import.meta.env.VITE_STRIPE_MOCK ?? 'true') !== 'false'

// Where Stripe redirects the customer after the embedded payment completes.
export const PAYMENT_RETURN_PATH = '/checkout/return'
