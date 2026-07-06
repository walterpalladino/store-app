# Deployment — Hostinger (static subdomain)

How to build this front end and deploy it to a Hostinger subdomain such as
`https://store.yoursite.app`, served from the subdomain root on standard HTTP/S.

The app is a static Single-Page Application (Vite + React). "Deploying" means:
**build → upload the contents of `dist/` → make sure `.htaccess` is in place.**
There is no Node process running on the server; Hostinger just serves files.

---

## 1. Prerequisites

- Node.js 18+ and npm locally (only needed to build; the server runs nothing).
- The **backend API** already deployed and reachable over the public internet.
- Its URL (e.g. `https://api.yoursite.app`) — you need it for `VITE_API_BASE`.

---

## 2. Configure the environment (build-time)

Vite bakes env vars into the bundle **at build time** — there is no runtime
config on the server. Create a **`.env.production`** in the project root (Vite
loads it automatically for `npm run build`):

```dotenv
# Backend API base URL — REQUIRED. Without it the app calls http://localhost:3000
# and every request fails in production.
VITE_API_BASE=https://api.yoursite.app

# Quieter logs in production (defaults to verbose "debug" via the repo .env).
VITE_LOG_LEVEL=error
```

Variables the app reads (all optional except `VITE_API_BASE`):

| Variable                     | Default                        | Purpose |
|------------------------------|--------------------------------|---------|
| `VITE_API_BASE`              | `http://localhost:3000`        | **Backend base URL. Set this.** |
| `VITE_PUBLIC_APP_URL`        | current browser origin         | This site's public origin, used to build the Stripe success/cancel callback URLs. At a subdomain root the default (`https://store.yoursite.app`) is already correct — leave unset. |
| `VITE_CHECKOUT_SUCCESS_URL`  | `<origin>/checkout/return`     | Override the full Stripe success callback URL (rarely needed). |
| `VITE_CHECKOUT_CANCEL_URL`   | `<origin>/checkout/cancel`     | Override the full Stripe cancel callback URL (rarely needed). |
| `VITE_LOG_LEVEL`             | `error` in prod builds         | `silent \| error \| warn \| info \| debug`. |

> The legacy `VITE_API_AUTH / USERS / PRODUCTS / CARTS / TRANSACTIONS` names in
> the repo `.env` are **not used** by the current code — ignore them. The one
> that matters is `VITE_API_BASE`.

---

## 3. Build

```bash
npm ci          # clean install (first time / CI)
npm run build   # → outputs the static site into dist/
```

The build writes `dist/` containing `index.html`, the hashed `assets/`, and the
**`.htaccess`** (copied automatically from `public/.htaccess`).

Sanity-check the two things that matter before uploading:

```bash
ls -a dist                      # must include: index.html, assets/, .htaccess
grep -o 'src="[^"]*"' dist/index.html   # should read src="/assets/index-XXXX.js"
```

The `/assets/...` absolute path is correct for a subdomain **root** — it works
on any port. (If you ever deploy under a path like `yoursite.app/store/`
instead of a subdomain, this guide does **not** cover that — the Vite `base`
would need to change.)

---

## 4. Upload to Hostinger

Deploy the **contents of `dist/`** (not the `dist` folder itself) into the
subdomain's document root — the folder Hostinger maps to `store.yoursite.app`
(often something like `~/domains/store.yoursite.app/public_html` or a `public`
folder shown in **hPanel → Websites → your subdomain**).

Via **hPanel File Manager** or **FTP/SFTP**, upload so the root ends up as:

```
<subdomain document root>/
├── index.html
├── .htaccess
├── assets/
│   ├── index-XXXX.js
│   └── index-XXXX.css
└── … (vite.svg, etc.)
```

> ⚠️ **`.htaccess` is a hidden file.** File Managers and FTP clients hide
> dotfiles by default. In hPanel File Manager enable **Settings → Show hidden
> files (dotfiles)**; in FileZilla use **Server → Force showing hidden files**.
> If routing breaks after deploy (section 6), this is almost always why —
> `.htaccess` didn't get uploaded.

When replacing an existing deploy, clear out the old `assets/` so stale hashed
files don't linger.

---

## 5. The `.htaccess` (SPA routing)

This app uses HTML5-history routing (`BrowserRouter`), so a refresh or direct
hit on a deep link like `/account` must return `index.html` — otherwise Apache
looks for a file at that path and 404s. `public/.htaccess` handles it and is
bundled into every build. For reference, its contents:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Serve real files and directories as-is (JS, CSS, images, fonts…).
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Everything else → the SPA entry point.
  RewriteRule . /index.html [L]
</IfModule>

# Never cache index.html — it points at hashed asset files that change per build.
<IfModule mod_headers.c>
  <Files "index.html">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
</IfModule>
```

If you prefer to manage this file directly on the server instead of via the
build, just paste the block above into a `.htaccess` in the document root.

---

## 6. Backend / API requirements

`.htaccess` fixes serving and routing, but the app still has to reach the API:

- **CORS** — the backend must send `Access-Control-Allow-Origin:
  https://store.yoursite.app` (the front end's origin). Add the subdomain to the
  backend's allowlist, same as the local dev origin is allowed today.
- **Protocol match** — if the site is served over **HTTPS**, `VITE_API_BASE`
  must also be **HTTPS**. A browser blocks `http://` API calls from an `https://`
  page as mixed content. (Hostinger issues SSL for subdomains, so prefer HTTPS
  on both.)
- **Stripe** — the checkout success/cancel URLs are built from this site's
  origin, so they resolve to `https://store.yoursite.app/checkout/return` and
  `/checkout/cancel` automatically. No extra config for a subdomain root.

---

## 7. Verify after deploy

1. Open `https://store.yoursite.app/` — the home page renders (no blank page,
   no console errors about failing to load `/assets/*.js`).
2. Navigate to a deep route (e.g. an account/checkout page), then **hard-refresh
   (Ctrl/Cmd+Shift+R)** — it should reload the same page, **not** a 404. This
   confirms `.htaccess` is working.
3. Open DevTools → Network and confirm `/api/...` calls go to your
   `VITE_API_BASE` host and return `200` (not blocked by CORS, not `localhost`).
4. Log in and load products/orders to confirm end-to-end connectivity.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank page; console can't load `/assets/*.js` | Uploaded the `dist` **folder** instead of its **contents**, so files sit under `/dist/...` | Move files up one level; assets must be at `/assets/...`. |
| Home page works, but refresh on a route → **404** | `.htaccess` missing (hidden file not uploaded) or `mod_rewrite` off | Re-upload `.htaccess` (show hidden files); on Hostinger `mod_rewrite` is on by default. |
| API calls hit `http://localhost:3000` | Built without `VITE_API_BASE` | Set it in `.env.production`, rebuild, redeploy. |
| API calls blocked by **CORS** | Backend doesn't allow the subdomain origin | Add `https://store.yoursite.app` to the backend CORS allowlist. |
| API calls blocked as **mixed content** | HTTPS page calling an HTTP API | Use an HTTPS `VITE_API_BASE`. |
| Old version still showing after redeploy | Cached `index.html` | The `.htaccess` sets no-cache on `index.html`; also hard-refresh once. |

---

## Quick reference

```bash
# one-time: create .env.production with VITE_API_BASE=https://api.yoursite.app
npm ci
npm run build
# upload the CONTENTS of dist/ (including the hidden .htaccess) to the
# subdomain document root, then verify per section 7.
```
