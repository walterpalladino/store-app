import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import terminal from 'vite-plugin-terminal'

export default defineConfig(({ mode }) => {
  // Backend origin that serves the API and the product image files (/media/…).
  const env = loadEnv(mode, process.cwd(), '')
  const mediaTarget = (env.VITE_IMAGE_BASE_URL || env.VITE_API_BASE || 'http://localhost:3000').replace(/\/$/, '')

  return {
  // `terminal` exposes `virtual:terminal`, letting the client logger mirror
  // output to the dev-server terminal (gated by VITE_LOG_TO_SERVER). In a
  // production build the plugin strips the calls to a no-op.
  plugins: [react(), terminal({ output: ['terminal'] })],

  // Dev-only: proxy the backend's product image files through the dev server so
  // <img> loads are same-origin. Cross-origin image loads from the backend
  // (a different port) are otherwise blocked by the browser (CORS/CORP) unless
  // the backend sets the right headers — which it must for production anyway.
  // resolveImageUrl() (src/config/api.js) rewrites same-backend-origin image
  // URLs to relative /media/… paths in dev so they hit this proxy.
  server: {
    proxy: {
      '/media': { target: mediaTarget, changeOrigin: true },
    },
  },

  test: {
    environment:  'jsdom',
    globals:      true,
    setupFiles:   ['./src/test/setup.js'],
    css:          false,

    coverage: {
      provider:       'v8',
      reporter:       ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Only collect coverage on the testable layers (logic, services, hooks, config).
      // UI pages and components require browser-level tests (Playwright/Cypress).
      include: [
        'src/utils/**',
        'src/services/**',
        'src/hooks/**',
        'src/config/**',
        'src/context/**',
      ],
      exclude: [
        'src/test/**',
        '**/*.d.ts',
      ],
      // Full coverage report (all src files) is generated but thresholds
      // are only enforced on the above layers.
      all: true,
      thresholds: {
        'src/utils/**':    { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/services/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        'src/hooks/**':    { lines: 85, functions: 85, branches: 80, statements: 85 },
        'src/config/**':   { lines: 95, functions: 90, branches: 80, statements: 95 },
        // Branches at 85: the auth-gated, backend-synced cart/wishlist contexts
        // carry many defensive guards (logged-out short-circuits, optional
        // chaining, hydration fallbacks) that aren't worth isolating in tests.
        'src/context/**':  { lines: 95, functions: 90, branches: 85, statements: 95 },
      },
    },
  },
  }
})
