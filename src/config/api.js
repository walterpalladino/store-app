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

// Image / media storage. Product image URLs returned by the API are normally
// absolute (`${IMAGE_PUBLIC_BASE_URL}/products/<sku>/<uuid>.webp`). The storage
// backend may live on a different origin/port than the API, so:
//   • VITE_IMAGE_BASE_URL       — prefix used to resolve *relative* image URLs
//     (leave empty when the API already returns absolute URLs).
//   • VITE_IMAGE_ALLOWED_ORIGINS — comma-separated allow-list of image origins
//     (url:port) the app is expected to load images from. These are the origins
//     that must have CORS enabled on the storage backend; kept here so the list
//     lives in one place and can be tuned per environment without code changes.
const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE_URL ?? '').replace(/\/$/, '')

const IMAGE_ALLOWED_ORIGINS = (import.meta.env.VITE_IMAGE_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

// Origin of the backend that serves the image files. In dev we route images on
// this origin through the Vite proxy (see vite.config server.proxy) so <img>
// loads are same-origin and not blocked cross-origin by the browser.
function originOf(u) { try { return new URL(u).origin } catch { return '' } }
const MEDIA_ORIGIN = originOf(IMAGE_BASE || BASE)

/**
 * Resolve a product-image URL to something an <img src> can load.
 *
 *  - Dev: an absolute URL on the backend's own origin is rewritten to a
 *    same-origin relative path so it flows through the Vite `/media` proxy —
 *    this dodges the browser blocking cross-origin image loads (CORS/CORP) when
 *    the backend runs on another port. **CORS itself is a server-side concern;
 *    no frontend env var can enable it** — in production the URL is left
 *    absolute and the storage backend must send the right CORS/CORP headers.
 *  - Otherwise: absolute (http/https or protocol-relative) URLs are returned
 *    as-is; a relative path is prefixed with VITE_IMAGE_BASE_URL, else the API base.
 */
export function resolveImageUrl(url) {
  if (!url) return ''
  if (import.meta.env.DEV && MEDIA_ORIGIN && url.startsWith(`${MEDIA_ORIGIN}/`)) {
    return url.slice(MEDIA_ORIGIN.length)   // e.g. "/media/products/…/uuid.webp"
  }
  if (/^(https?:)?\/\//i.test(url)) return url
  const base = IMAGE_BASE || BASE
  return `${base}/${String(url).replace(/^\//, '')}`
}

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
    // Images are a separate resource nested under a product. Read (GET) is
    // public; upload (POST multipart/form-data) and delete are ADMIN-only.
    // `thumbnail`/`primaryImage`/`images` on the product object are read-only,
    // derived fields — never written on product create/update. Manage the
    // binaries here instead.
    images:     (id)          => `${BASE}/api/products/${id}/images`,               // GET list · POST upload (ADMIN)
    imageById:  (id, imageId) => `${BASE}/api/products/${id}/images/${imageId}`,    // GET one · DELETE (ADMIN)
  },

  // Tags — a top-level, normalized list used to label products. Reads are
  // public; create/update/delete are ADMIN-only. A tag is `{ id, name }`;
  // names are unique (case-insensitive).
  tags: {
    list: `${BASE}/api/tags`,               // GET list · POST create (ADMIN)
    byId: (id) => `${BASE}/api/tags/${id}`, // GET one · PUT/PATCH/DELETE (ADMIN)
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
    // Payments belonging to one order (by the order's *numeric* id), oldest
    // first. Payments live on their own resource — see `payments` below.
    payments:      (id) => `${BASE}/api/orders/${id}/payments`,
  },

  // Payments — scoped to the caller through the owning order. There is **no
  // list-all endpoint**: a payment is reachable either through its order
  // (`orders.payments`) or directly by its own numeric id. Payments are created
  // and settled by the checkout/refund flows, never over these routes.
  payments: {
    byId: (id) => `${BASE}/api/payments/${id}`,
    // ADMIN — list every possible payment status (GET), and force a payment to
    // one of them (POST { status }). This is where the money axis is set: the
    // order's `paymentStatus` is recomputed from its payments afterwards.
    statusOptions: `${BASE}/api/payments/status`,
    setStatus:     (id) => `${BASE}/api/payments/${id}/status`,
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

  // Image storage config (see resolveImageUrl + the VITE_IMAGE_* env vars).
  media: {
    base:           IMAGE_BASE,
    allowedOrigins: IMAGE_ALLOWED_ORIGINS,
  },
}

export default API
