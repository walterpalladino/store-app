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
 * VITE_API_AUTH         → https://dummyjson.com
 * VITE_API_USERS        → https://dummyjson.com
 * VITE_API_PRODUCTS     → https://dummyjson.com
 * VITE_API_CARTS        → https://dummyjson.com
 * VITE_API_TRANSACTIONS → https://dummyjson.com/c
 */

// ── Read bases from env (Vite replaces import.meta.env at build time) ─────────
const AUTH_BASE         = import.meta.env.VITE_API_AUTH         ?? 'https://dummyjson.com'
const USERS_BASE        = import.meta.env.VITE_API_USERS        ?? 'https://dummyjson.com'
const PRODUCTS_BASE     = import.meta.env.VITE_API_PRODUCTS     ?? 'https://dummyjson.com'
const CARTS_BASE        = import.meta.env.VITE_API_CARTS        ?? 'https://dummyjson.com'
const TRANSACTIONS_BASE = import.meta.env.VITE_API_TRANSACTIONS ?? 'https://dummyjson.com/c'

// Strip any accidental trailing slash so path concatenation is always clean
const trim = (url) => url.replace(/\/$/, '')

const A  = trim(AUTH_BASE)
const U  = trim(USERS_BASE)
const P  = trim(PRODUCTS_BASE)
const C  = trim(CARTS_BASE)
const T  = trim(TRANSACTIONS_BASE)

// ── Endpoint map ──────────────────────────────────────────────────────────────
const API = {

  auth: {
    login:   `${A}/auth/login`,
    refresh: `${A}/auth/refresh`,
    me:      `${A}/auth/me`,
  },

  users: {
    add:   `${U}/users/add`,
    byId:  (id) => `${U}/users/${id}`,
  },

  products: {
    list:       `${P}/products`,
    search:     `${P}/products/search`,
    byId:       (id)   => `${P}/products/${id}`,
    add:        `${P}/products/add`,
    byCategory: (slug) => `${P}/products/category/${encodeURIComponent(slug)}`,
    categories: `${P}/products/categories`,
  },

  carts: {
    byId: (id) => `${C}/carts/${id}`,
  },

  // Custom mock response endpoints (id is the dummyjson /c/<id> hash)
  transactions: {
    list:     `${T}/f26f-5bcf-4ffe-ab46`,
    detail:   `${T}/16cd-534f-49b7-be01`,
    checkout: `${T}/d31a-f3ea-4681-b50a`,
  },
}

export default API
