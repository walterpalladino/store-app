# React Best-Practices Review — Shōp Store App

**Date:** 2026-07-02
**Scope:** Full front-end codebase (`src/`) — structure, configuration, contexts, hooks, services, pages, tests, and production build output.
**Stack reviewed:** React 18.3 · MUI 6 · React Router 6 · Vite 5 · Vitest 2

---

## Overall Assessment

A **well-organized React 18 + MUI + React Router app** with a genuinely good separation of concerns in its data layer — above average for a project of this size. The main gaps are "table-stakes" React practices around **tooling, resilience, and bundling** rather than architecture.

### What's already done well

- **Clean data-access layer** — endpoints centralized in `src/config/api.js`, envelope handling isolated in `src/utils/apiUtils.js`, business logic in `src/services/`, fetching in `src/hooks/useProducts.js`. Components rarely know about the wire format.
- **Solid auth** — token refresh, silent 401-retry, expiry handling, and role-based admin guard across the two auth contexts.
- **Context hygiene** — every `useX()` throws if used outside its provider; mutators are wrapped in `useCallback` (14 files).
- **Strong logic-layer testing** — 192 tests, per-layer coverage thresholds enforced in `vite.config.js`, with UI intentionally excluded and documented.
- **Correct basics** — `StrictMode`, `CssBaseline`, centralized theme (`src/theme/theme.js`), and declarative redirects.

---

## High-Impact Improvements

### 1. No linting or formatting
There is no ESLint/Prettier config, dependency, or script anywhere in the project.

- **Why it matters:** `eslint-plugin-react-hooks` would statically catch the exact classes of bugs recently fixed by hand — render-time `navigate()` calls and stale `useEffect` dependencies.
- **Action:** Add ESLint (`eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`), Prettier, and a `lint` script. Gate CI on it.

### 2. No code-splitting → single ~737 KB JS bundle
The production build warns: *"chunks larger than 500 kB."* There is zero `React.lazy` / `Suspense` usage.

- **Why it matters:** Customers currently download the entire admin panel on first paint.
- **Action:** Route-level lazy-loading, especially for the admin section, checkout, and product-detail pages.

### 3. No Error Boundary anywhere
Any render-time throw blanks the entire app (white screen).

- **Why it matters:** The `AdminSells` crash fixed in a prior session would have been contained to a single panel with a boundary in place.
- **Action:** Add a top-level error boundary plus per-route / per-panel boundaries.

### 4. Hand-rolled fetching in every page (no caching)
`fetch(` appears inline across 7 page files, each re-implementing loading / error / fallback state. No request dedup, caching, or retry.

- **Action:** Adopt **TanStack Query** (or, at minimum, a shared `useAsync` hook).
- **Related inefficiency:** `src/hooks/useProducts.js` fetches `limit=200` then filters/paginates **client-side**, even though the API supports `skip`/`limit` (which `src/pages/admin/AdminProducts.jsx` already uses correctly).

---

## Medium-Impact Improvements

### 5. Significant duplication
- `src/context/AuthContext.jsx` and `src/context/MerchantAuthContext.jsx` are ~90% identical (`decodeJWT`, `isTokenExpired`, storage sync, login, fetch wrapper). Extract shared helpers to `utils/`, and consider a shared context factory.
- Status-color maps are copy-pasted in `src/pages/CheckoutPage.jsx`, `src/pages/admin/AdminSells.jsx`, and `src/pages/user/PurchaseHistoryPanel.jsx`.
- `PurchaseHistoryPanel` has its own `safeFetch` that duplicates the already-tested `apiUtils.safeApiFetch`.

### 6. Context values aren't memoized
`src/context/CartContext.jsx` (and the auth contexts) build a fresh `value` object every render, re-rendering **all** consumers on any change.

- **Action:** Wrap `value` in `useMemo`. Splitting cart *state* from cart *actions* into separate contexts would further reduce re-renders.

### 7. God-components
`CartPage` (880 lines), `CheckoutPage` (774), and `PurchaseHistoryPanel` (622) interleave data-fetching, presentation, and large inline `sx`.

- **Action:** Extract subcomponents and hoist static `sx` objects (the existing `fieldSx` constant pattern is good — extend it). Improves readability, reuse, and testability.

### 8. No type safety (plain JS, no PropTypes)
Every prop shape is unchecked — and most bugs across recent sessions stemmed from API **shape** changes.

- **Action (strategic):** Incremental **TypeScript** migration, or at least PropTypes/JSDoc on shared components plus typed API response models.

---

## Lower-Impact / Polish

- **Cart isn't persisted** — `src/services/cartService.js` is an in-memory singleton, so the cart is lost on reload and desyncs across tabs. The contract exposes `PUT /carts/:id`; persist to localStorage or the backend.
- **Accessibility** — only 2 files use `aria-*`; icon-only `IconButton`s need `aria-label`s, and status colors should be checked for contrast.
- **`msw` is an unused devDependency** — tests mock `global.fetch` manually. Either adopt MSW (more realistic) or drop the dependency.
- **Doc drift** — the `src/config/api.js` header still references `VITE_API_*` split variables that no longer exist (only `VITE_API_BASE` is used).
- **No E2E tests** — since UI is deliberately excluded from coverage, add a few Playwright smoke flows (login → add to cart → checkout; admin CRUD).

---

## Priority Summary

| # | Improvement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | ESLint + `react-hooks` plugin + Prettier | High | Low |
| 2 | Route-level `React.lazy` + `Suspense` | High | Low |
| 3 | Top-level + per-route Error Boundaries | High | Low |
| 4 | TanStack Query / shared `useAsync` | High | Medium–High |
| 5 | De-duplicate auth contexts & status maps | Medium | Medium |
| 6 | Memoize context values | Medium | Low |
| 7 | Break up god-components | Medium | Medium |
| 8 | TypeScript migration | Medium | High |
| 9 | Persist cart | Low | Low–Medium |
| 10 | Accessibility pass | Low | Medium |

### If you do only three things
1. **Add ESLint + `react-hooks` plugin** (+ Prettier) — cheap, prevents whole classes of recurring bugs.
2. **Add route-level `React.lazy` + a top-level ErrorBoundary** — big resilience and load-time wins for little code.
3. **Introduce TanStack Query** (or a shared `useAsync`) — removes repeated fetch/loading/error boilerplate and adds caching.

---

*Generated as part of a React best-practices code review.*
