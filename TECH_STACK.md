# React Project — Technical Blueprint

This document captures the **non-functional / technical characteristics** of this
project so a new React application can be scaffolded following the same
conventions. It describes _how the project is built_ (stack, tooling, structure,
conventions), not _what it does_ (features).

---

## 1. Core Stack

| Concern            | Choice                          | Notes                                                    |
| ------------------ | ------------------------------- | -------------------------------------------------------- |
| Language           | JavaScript (ESM), JSX           | `"type": "module"`; **no TypeScript** (plain `.js/.jsx`) |
| Framework          | React `^18.3` (`StrictMode`)    | New JSX transform — no `import React` needed in files    |
| Build tool         | Vite `^5.4`                     | `@vitejs/plugin-react`                                   |
| Routing            | react-router-dom `^6.27`        | `BrowserRouter`, nested `<Routes>`                       |
| UI library         | MUI (Material UI) `^6.1`        | `@mui/material` + `@mui/icons-material`                  |
| Styling engine     | Emotion (`@emotion/react/styled`) | MUI's default; `sx` prop + a central theme             |
| Test runner        | Vitest `^2.1` (jsdom)           | Testing Library + MSW for network mocking                |
| Package manager    | npm (`package-lock.json`)       |                                                          |
| Deploy target      | Vercel (SPA rewrites)           | `vercel.json` + `public/_redirects` fallback             |

> Prop-types are **off** and TypeScript is not used — the codebase relies on
> JSDoc comments and tests instead of static types.

---

## 2. NPM Scripts (conventions to replicate)

```jsonc
"dev":            "vite",
"build":          "vite build",
"preview":        "vite preview",
"lint":           "eslint .",
"lint:fix":       "eslint . --fix",
"format":         "prettier --write \"src/**/*.{js,jsx}\"",
"format:check":   "prettier --check \"src/**/*.{js,jsx}\"",
"test":           "vitest run",
"test:watch":     "vitest",
"test:ui":        "vitest --ui",
"test:coverage":  "vitest run --coverage"
```

---

## 3. Directory Structure

```
src/
├── main.jsx            # App bootstrap: providers, error handlers, render
├── App.jsx             # Route tree + context provider composition
├── config/             # Centralised, env-driven configuration (e.g. API URLs)
├── theme/              # MUI theme definition (theme.js)
├── context/            # React Context providers (global state) + co-located hooks
├── hooks/              # Reusable custom hooks (useX.js)
├── services/           # Stateless backend/data-access layer (pure functions)
├── utils/              # Cross-cutting helpers (logger, fetch instrumentation, ...)
├── components/         # Shared/reusable UI (Navbar, ErrorBoundary, ProtectedRoute)
├── pages/              # Route-level screens
│   ├── admin/          # Feature-grouped sub-sections
│   └── user/           # Feature-grouped sub-sections
└── test/               # All test files + setup + helpers (co-located suite)
```

**Layering rule:** `pages/components` → `context/hooks` → `services` → `config`.
UI never talks to the network directly; it goes through **services**, which
build URLs from **config** and unwrap responses through shared helpers.

---

## 4. Application Bootstrap (`main.jsx`)

Order and shape to replicate:

1. Register **global error handlers** (unhandled rejections / errors).
2. **Instrument `fetch`** (debug-level logging of every backend call).
3. Log logger initialisation.
4. Render tree wrapped, outside-in:
   `React.StrictMode` → `ErrorBoundary` → `BrowserRouter` → `ThemeProvider` (+ `CssBaseline`) → `App`.

Context providers are composed inside `App.jsx` (Auth → Cart → Wishlist →
MerchantAuth), keeping cross-cutting concerns (theme, router, error boundary) in
`main.jsx` and app/domain state in `App.jsx`.

---

## 5. State Management

- **No Redux/Zustand** — global state is React **Context** providers, one per
  domain, each in `src/context/`.
- Each context file **co-locates** the `Provider` component with its consumer
  hook (`useX`) and small helpers. ESLint's
  `react-refresh/only-export-components` is disabled for `src/context/**` to
  allow this.
- Local/screen state uses standard hooks; shared logic is extracted into
  `src/hooks/`.

---

## 6. Service & API Layer (conventions)

- **Central API map** in `src/config/api.js`: a single `API` object, all base
  URLs read from `import.meta.env.VITE_API_*` with a localhost default, trailing
  slash stripped. Endpoints are strings or `(id) => \`...\`` builder functions.
- **Services** (`src/services/*.js`) are stateless, exported **pure functions**
  that receive an `authFetch` function + args, call the API, and return unwrapped
  data or throw an `Error` with the backend message.
- **Response envelope** is centralised in shared helpers (`httpEnvelope.js` /
  `apiUtils.js`): success = `{ success, data }`, error = `{ message }` /
  `{ error: { message } }`. Helpers `unwrap` / `safeUnwrap` / `readData` /
  `readError` keep envelope handling out of individual callers.
- **404s are treated as "empty"** (return `null`), not errors, for singleton
  resources; PUT-then-POST fallback pattern for create-or-replace.

---

## 7. Logging & Observability

- Tiny custom **level-based logger** (`utils/logger.js`): `silent < error < warn
  < info < debug`, level read once from `VITE_LOG_LEVEL`, defaulting to `debug`
  in dev and `error` in production builds.
- Optional **dev-server terminal mirroring** via `vite-plugin-terminal`
  (gated by `VITE_LOG_TO_SERVER`, dev-only, disabled under test); stripped to a
  no-op in production builds.
- `utils/instrumentFetch.js` wraps `fetch` to log every backend call at debug
  level; `utils/registerGlobalErrorHandlers.js` catches uncaught errors.

---

## 8. Routing Conventions

- Single `BrowserRouter`; route trees split by **shell**:
  - Customer shell (with `Navbar`) as a catch-all `/*`.
  - Admin section `/admin/*` (own protected shell, no customer Navbar).
  - Focused/standalone routes (login, payment) outside the shells.
- **Route protection** via wrapper components: `ProtectedRoute` (user) and
  `AdminProtectedRoute` (admin) wrap the element.
- SPA deep-link support handled at deploy layer: `vercel.json` rewrites all
  paths to `/index.html` (mirrored by `public/_redirects`).

---

## 9. Theming

- A single MUI theme in `src/theme/theme.js`, applied via `ThemeProvider` +
  `CssBaseline` at the root.
- Styling done with MUI's `sx` prop and theme tokens (e.g.
  `bgcolor: 'background.default'`) rather than external CSS files.

---

## 10. Testing Strategy

- **Vitest** (jsdom, `globals: true`), setup file `src/test/setup.js`,
  `css: false`.
- **Testing Library** (`@testing-library/react`, `user-event`, `jest-dom`) for
  component/behaviour tests; **MSW** (`msw`) for mocking network at the boundary.
- All tests + shared `helpers.jsx` live under `src/test/`.
- **Coverage (v8)** is scoped to the **testable logic layers** only —
  `utils`, `services`, `hooks`, `config`, `context` — because UI pages/components
  require browser-level tests (Playwright/Cypress). Per-layer thresholds:

  | Layer      | lines | functions | branches | statements |
  | ---------- | ----- | --------- | -------- | ---------- |
  | services   | 95    | 95        | 90       | 95         |
  | context    | 95    | 90        | 85       | 95         |
  | config     | 95    | 90        | 80       | 95         |
  | utils      | 90    | 90        | 85       | 90         |
  | hooks      | 85    | 85        | 80       | 85         |

  Reporters: `text`, `lcov`, `html` → `./coverage`.

---

## 11. Linting & Formatting

- **ESLint 9 flat config** (`eslint.config.js`), composed from:
  `@eslint/js` recommended + `eslint-plugin-react` (flat + jsx-runtime) +
  `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` (vite), with
  `eslint-config-prettier` **last** to disable stylistic conflicts.
- Key rules: `react-hooks/rules-of-hooks: error`,
  `react-hooks/exhaustive-deps: warn`, `react/prop-types: off`,
  `no-unused-vars` warns but ignores `^[A-Z_]` vars / `^_` args.
- Separate config blocks for: app source, `src/context/**` (Fast Refresh rule
  off), Node config files, and test files (Vitest globals).
- **Prettier** (`.prettierrc.json`): no semicolons, single quotes, trailing
  commas `all`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: always`,
  JSX double quotes.

---

## 12. Configuration & Environment

- All runtime config via **Vite env vars** (`VITE_*`, accessed through
  `import.meta.env`), never hardcoded.
- Documented variables: `VITE_API_BASE` (+ per-domain `VITE_API_*`),
  `VITE_LOG_LEVEL`, `VITE_LOG_TO_SERVER`.
- `.env` committed with placeholders; real values via `.env.local` / CI
  dashboard. No restart-free changes — env changes require a dev-server restart.

---

## 13. Setup Checklist for a New Project

1. `npm create vite@latest` → React (JavaScript) template; set `"type": "module"`.
2. Install deps: `react-router-dom`, `@mui/material @mui/icons-material @emotion/react @emotion/styled`.
3. Install dev deps: `vitest @vitest/ui @vitest/coverage-v8 jsdom`,
   `@testing-library/{react,jest-dom,user-event}`, `msw`,
   `eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier globals`,
   `prettier`, `vite-plugin-terminal`.
4. Copy the config files: `vite.config.js` (with the `test`/`coverage` block),
   `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vercel.json`,
   `public/_redirects`.
5. Create the `src/` folder skeleton (§3) and add: `config/api.js`, `theme/theme.js`,
   `utils/logger.js`, `utils/instrumentFetch.js`, `utils/registerGlobalErrorHandlers.js`,
   `services/httpEnvelope.js` (or `apiUtils.js`), `components/ErrorBoundary.jsx`,
   `components/ProtectedRoute.jsx`, `test/setup.js`, `test/helpers.jsx`.
6. Wire `main.jsx` (§4) and `App.jsx` (provider composition + route shells §8).
7. Add the npm scripts (§2).
```
