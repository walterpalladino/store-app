# Shōp — Modern Store App

A polished e-commerce storefront built with **React 18**, **Vite 5**, and **Material UI 6**. Products are sourced from the free [DummyJSON API](https://dummyjson.com/docs/products).

---

## ✨ Features

- **Product listing** with grid layout and responsive design
- **Category filter** — browse by product category (chips, collapsible)
- **Price range filter** — slider-based min/max price filter
- **Full-text search** — search products by name or description
- **Sort** — by default, price ascending/descending, or top-rated
- **URL-persisted filters** — all active filters are stored in the URL query string, so sharing or refreshing preserves state
- **Product detail page** — full image gallery, specs, reviews tab, trust badges
- **Back-navigation** — returning from a product detail page restores all previous filters
- **Mobile-friendly** — responsive grid + slide-in filter drawer on small screens
- **Skeleton loaders** — smooth loading states throughout

---

## 🛠 Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI library |
| Vite | 5 | Build tool & dev server |
| Material UI (MUI) | 6 | Component library |
| React Router | 6 | Client-side routing |
| DummyJSON API | — | Product data source |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn / pnpm)

### Installation

```bash
# 1. Clone or unzip the project
cd store-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build       # Outputs to /dist
npm run preview     # Preview the production build locally
```

---

## 📁 Project Structure

```
store-app/
├── index.html                  # HTML entry point (loads Google Fonts)
├── vite.config.js              # Vite configuration
├── package.json
└── src/
    ├── main.jsx                # App bootstrap — BrowserRouter + MUI ThemeProvider
    ├── App.jsx                 # Route definitions (/ and /product/:id)
    ├── theme/
    │   └── theme.js            # Custom MUI theme (palette, typography, component overrides)
    ├── hooks/
    │   └── useProducts.js      # Data-fetching hooks (useProducts, useCategories, useProduct)
    ├── context/
    │   └── AuthContext.jsx     # Auth state, login/logout/register, authFetch, JWT helpers
    ├── components/
    │   ├── Navbar.jsx          # Top navigation bar (Sign in button / UserMenu)
    │   ├── UserMenu.jsx        # Avatar dropdown with JWT info and logout
    │   ├── ProductCard.jsx     # Product grid card with discount/stock badges
    │   └── FilterSidebar.jsx   # Category chips, price slider, search input
    └── pages/
        ├── HomePage.jsx        # Product listing with filters, sort, pagination
        ├── LoginPage.jsx       # Sign In + Register tabs, success state
        └── ProductDetailPage.jsx # Product detail with gallery, specs, reviews
```

---

## 🔐 Authentication

Authentication is powered by the [DummyJSON Auth API](https://dummyjson.com/docs/auth).

### How it works

1. **Sign In** — `POST /auth/login` with `username` + `password`. Returns an `accessToken` (JWT) and `refreshToken`.
2. **Register** — `POST /users/add` simulates account creation (DummyJSON doesn't persist new users; use the demo credentials to log in after registering).
3. **Token storage** — Both tokens are stored in `localStorage` under the key `shop_auth` and rehydrated on page load.
4. **Auto-refresh** — `authFetch()` (available via `useAuth()`) detects expired tokens using the JWT `exp` claim, calls `POST /auth/refresh` silently, and retries the original request — all transparent to the caller.
5. **Logout** — Clears tokens from state and localStorage; redirects to home.

### JWT details

- Tokens are decoded client-side (base64url → JSON) to read `exp`, `iat`, and user claims — **no signature verification** (mock API).
- The decoded payload is exposed as `tokenPayload` from `useAuth()`.
- Token expiry time is shown in the user menu dropdown.

### Demo credentials

```
username: emilys
password: emilyspass
```

Any of the [DummyJSON users](https://dummyjson.com/users) can be used — their default password is `<firstName>spass` (lowercase).

### `useAuth()` hook API

| Value | Type | Description |
|---|---|---|
| `user` | object | Logged-in user profile |
| `accessToken` | string | Raw JWT access token |
| `refreshToken` | string | Raw JWT refresh token |
| `tokenPayload` | object | Decoded JWT payload |
| `isLoggedIn` | boolean | True when a valid session exists |
| `login(username, password)` | async fn | Authenticate and store tokens |
| `register(fields)` | async fn | Create a new user (mock) |
| `logout()` | fn | Clear session |
| `authFetch(url, options)` | async fn | Authenticated fetch with auto-refresh |

---

## 🔍 How Filters Work

All active filters are stored as **URL query parameters** (e.g. `/?category=smartphones&minPrice=100&page=2`). This means:

- Refreshing the page **preserves** your active filters
- Sharing the URL gives someone the exact same filtered view
- Clicking a product navigates to `/product/:id` and stores the current URL in router state
- The "Back to shop" button on the detail page uses that stored URL to **restore all filters exactly** as you left them

### Supported URL params

| Param | Example | Description |
|---|---|---|
| `category` | `smartphones` | Filter by product category |
| `search` | `laptop` | Full-text search query |
| `minPrice` | `100` | Minimum price filter |
| `maxPrice` | `500` | Maximum price filter |
| `sort` | `price-asc` | Sort order (`price-asc`, `price-desc`, `rating`) |
| `page` | `2` | Current pagination page |

---

## 🌍 Environment Configuration

All API base URLs are defined in environment variables. No proxy is used — the app calls external APIs directly. CORS works because DummyJSON sends permissive `Access-Control-Allow-Origin` headers on its standard endpoints.

### Environment files

| File | Purpose | Committed? |
|---|---|---|
| `.env` | Shared defaults for all environments | ✅ Yes |
| `.env.development` | Dev overrides (local mock servers, etc.) | ✅ Yes (no secrets) |
| `.env.production` | Production overrides | ✅ Yes (no secrets) |
| `.env.local` | Personal local overrides, never shared | ❌ Git-ignored |
| `.env.example` | Template — copy to `.env.local` to start | ✅ Yes |

### Available variables

| Variable | Default | Used for |
|---|---|---|
| `VITE_API_AUTH` | `https://dummyjson.com` | Login, refresh, /auth/me |
| `VITE_API_USERS` | `https://dummyjson.com` | User CRUD |
| `VITE_API_PRODUCTS` | `https://dummyjson.com` | Products & categories |
| `VITE_API_CARTS` | `https://dummyjson.com` | Cart test data |
| `VITE_API_TRANSACTIONS` | `https://dummyjson.com/c` | Purchase history & checkout |

### Pointing at a different backend

1. Create `.env.local` (git-ignored) or set variables in your CI/CD dashboard
2. Override only what you need — unset variables fall back to `.env`
3. Restart the dev server

```bash
# .env.local example
VITE_API_AUTH=https://my-staging-api.com
VITE_API_PRODUCTS=https://my-staging-api.com
```

All endpoint paths are assembled in `src/config/api.js` — that is the only file that needs to change if a URL structure differs between backends.

---

## 🌐 API Reference

All data comes from [https://dummyjson.com](https://dummyjson.com). No API key required.

| Endpoint used | Purpose |
|---|---|
| `GET /products?limit=200` | Fetch all products |
| `GET /products/search?q={query}` | Search products |
| `GET /products/category/{slug}` | Filter by category |
| `GET /products/categories` | List all categories |
| `GET /products/{id}` | Single product detail |

> **Note:** Price filtering is applied client-side after fetching, as DummyJSON does not support server-side price range queries.

---

## 🎨 Design

The app uses a **refined editorial aesthetic** — cream backgrounds, dark charcoal type, warm gold accents — with:

- **Cormorant Garamond** (serif) for display headings and prices
- **DM Sans** (geometric sans-serif) for body text and UI labels
- Smooth card hover transitions, skeleton loading states, and a gradient hero banner

---

## 📝 License

MIT — free to use and modify.
