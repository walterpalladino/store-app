import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

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
})
