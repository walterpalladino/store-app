import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clean up DOM after every test
afterEach(cleanup)

// ── Silence expected "used outside provider" render errors ────────────────────
// The context guard tests assert `useX()` throws when rendered without its
// provider (via expect().toThrow). React still re-reports that render throw to
// jsdom as an "uncaught" error — pure noise. Swallow only those known messages;
// any *unexpected* error still fails the test on its assertions.
const EXPECTED_GUARD_ERROR = /must be used inside/
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const message = event?.error?.message ?? event?.message ?? ''
    if (EXPECTED_GUARD_ERROR.test(message)) event.preventDefault()
  })
}

// ── Silence MUI prop warnings in tests ────────────────────────────────────
const originalError = console.error
const SILENCED = [
  'Warning: An update to',
  'Warning: ReactDOM.render',
  'inside a test was not wrapped',
  // React's logging that pairs with the intentional guard-test render throws
  'The above error occurred',
  'must be used inside',
]
beforeAll(() => {
  console.error = (...args) => {
    // First arg may be a string (React warnings) or an Error object (an
    // uncaught render throw React logs directly).
    const first = args[0]
    const text = typeof first === 'string' ? first : (first?.message ?? '')
    if (SILENCED.some((s) => text.includes(s))) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })

// ── localStorage mock ──────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {}
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value) },
    removeItem: (key)        => { delete store[key] },
    clear:      ()           => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// ── matchMedia stub (required by MUI) ─────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches:             false,
    media:               query,
    onchange:            null,
    addListener:         vi.fn(),
    removeListener:      vi.fn(),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:       vi.fn(),
  })),
})

// ── IntersectionObserver stub ──────────────────────────────────────────────
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}))

// ── ResizeObserver stub ────────────────────────────────────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}))
