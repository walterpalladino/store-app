import logger from './logger'

/**
 * Wrap `window.fetch` so every backend call is logged: the outgoing request
 * (method + URL) and the response (status + duration), or the failure.
 *
 * The wrapper is ALWAYS installed; each line is emitted via `logger.debug`,
 * which itself prints only when the level is `debug` and otherwise no-ops.
 * Gating at call time (not install time) means a call is logged whenever the
 * level is debug — it can never silently skip because of when it was set up.
 *
 * Call once, before the app mounts. Request/response *bodies* are intentionally
 * not logged (they can carry credentials).
 */
export default function instrumentFetch() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  if (window.fetch.__instrumented) return

  const original = window.fetch.bind(window)

  const wrapped = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input))
    // Never log the terminal bridge's own requests (vite-plugin-terminal POSTs
    // each forwarded line to /__terminal/*) — logging them would feed back into
    // the logger and loop endlessly.
    if (url.includes('/__terminal')) return original(input, init)
    const method = (init.method ?? (typeof input !== 'string' ? input?.method : undefined) ?? 'GET').toUpperCase()
    const started = performance.now()

    logger.debug(`→ ${method} ${url}`)
    try {
      const res = await original(input, init)
      const ms = Math.round(performance.now() - started)
      logger.debug(`← ${res.status} ${method} ${url} (${ms}ms)`)
      return res
    } catch (err) {
      const ms = Math.round(performance.now() - started)
      logger.debug(`✗ ${method} ${url} — failed after ${ms}ms: ${err.message}`)
      throw err
    }
  }
  wrapped.__instrumented = true
  window.fetch = wrapped
}
