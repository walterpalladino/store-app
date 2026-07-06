/**
 * api.js — Central API URL configuration
 *
 * All base URLs are read from environment variables (see .env files).
 * To point any domain at a different backend:
 *   1. Set the relevant VITE_API_* variable in your .env.local or CI dashboard.
 *   2. Restart the dev server — no code changes needed.
 *
 * Variable → Default target
 * ─────────────────────────────────────────────────────
 * VITE_API_BASE → http://localhost:3000
 *
 * All endpoints share the same base — different domains can still be
 * split via separate VITE_API_* variables if needed in the future.
 */

const BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '')

// Public origin of THIS front end. Stripe hosted checkout redirects the browser
// back to absolute URLs on our own site, so we need our own origin to build
// them. Defaults to the running browser origin (works in local dev with no
// config) and can be overridden per environment — e.g. a public deploy URL, or
// when the app is served behind a proxy/tunnel whose origin differs.
const APP_ORIGIN = (import.meta.env.VITE_PUBLIC_APP_URL
  ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
).replace(/\/$/, '')

const API = {

  auth: {
    login:          `${BASE}/api/auth/login`,
    refresh:        `${BASE}/api/auth/refresh`,
    me:             `${BASE}/api/auth/me`,
    passwordChange: `${BASE}/api/auth/password-change`,
  },

  users: {
    add:      `${BASE}/api/users`,
    byId:     (id) => `${BASE}/api/users/${id}`,
    // Cart and wishlist are auth-only singletons nested under the user (🔒).
    cart:     (id) => `${BASE}/api/users/${id}/cart`,
    wishlist: (id) => `${BASE}/api/users/${id}/wishlist`,
  },

  products: {
    list:         `${BASE}/api/products`,
    search:       `${BASE}/api/products/search`,
    byId:         (id)   => `${BASE}/api/products/${id}`,
    bySku:        (sku)  => `${BASE}/api/products/sku/${encodeURIComponent(sku)}`,
    skuGenerate:  `${BASE}/api/products/sku/generate`,                                       // POST non-empty attrs → { sku }
    add:          `${BASE}/api/products`,
    byCategory:   (slug) => `${BASE}/api/products/category/${encodeURIComponent(slug)}`,
    categories:   `${BASE}/api/products/categories`,                                        // GET list · POST create (ADMIN)
    categoryBySlug: (slug) => `${BASE}/api/products/categories/${encodeURIComponent(slug)}`, // PUT/PATCH/DELETE (ADMIN)
    categoryList: `${BASE}/api/products/category-list`,
  },

  // Orders are read-only — created only by the checkout flow, never posted directly.
  orders: {
    list:   `${BASE}/api/orders`,
    // Search the caller's own orders by public order id (UUID) substring.
    // Empty/missing `q` returns all of the caller's orders (same as list).
    search: (q) => `${BASE}/api/orders/search?q=${encodeURIComponent(q ?? '')}`,
    byId:   (id) => `${BASE}/api/orders/${id}`,
    // ADMIN — list every possible order status (GET), and force an order to a
    // given status (POST { status }), an emergency override of the lifecycle.
    statusOptions: `${BASE}/api/orders/status`,
    setStatus:     (id) => `${BASE}/api/orders/${id}/status`,
  },

  // Checkout — registers an order from the caller's cart and starts a Stripe
  // **hosted** Checkout Session. POST { successUrl, cancelUrl }; returns
  // { order, checkout } where checkout.url is the hosted page to redirect to.
  checkout: `${BASE}/api/checkout`,

  // Absolute callback URLs Stripe redirects the browser back to after the
  // hosted payment page. The backend appends ?session_id={CHECKOUT_SESSION_ID}
  // to successUrl; cancelUrl is used as-is. Default to this app's own routes;
  // override the whole URL via env for deployments that need a fixed public URL.
  checkoutReturn: {
    successUrl: import.meta.env.VITE_CHECKOUT_SUCCESS_URL || `${APP_ORIGIN}/checkout/return`,
    cancelUrl:  import.meta.env.VITE_CHECKOUT_CANCEL_URL  || `${APP_ORIGIN}/checkout/cancel`,
  },

  // Refund — admin-only. POST { orderId } to start a refund on a paid order.
  // Returns { order, refund }; settles asynchronously via a Stripe webhook.
  refund: `${BASE}/api/refund`,
}

export default API
