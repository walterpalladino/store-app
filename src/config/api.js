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
    add:          `${BASE}/api/products`,
    byCategory:   (slug) => `${BASE}/api/products/category/${encodeURIComponent(slug)}`,
    categories:   `${BASE}/api/products/categories`,                                        // GET list · POST create (ADMIN)
    categoryBySlug: (slug) => `${BASE}/api/products/categories/${encodeURIComponent(slug)}`, // PUT/PATCH/DELETE (ADMIN)
    categoryList: `${BASE}/api/products/category-list`,
  },

  // Orders (formerly "transactions" — renamed to match the API contract's REST resource)
  orders: {
    list:     `${BASE}/api/orders`,
    byId:     (id) => `${BASE}/api/orders/${id}`,
    create:   `${BASE}/api/orders`,
  },

  // Stripe payments — backend-owned (pending). POST creates a Checkout Session /
  // PaymentIntent; GET returns the settled status for the return page.
  payments: {
    createSession: `${BASE}/api/payments/checkout-session`,
    session:       (id) => `${BASE}/api/payments/session/${id}`,
  },
}

export default API
