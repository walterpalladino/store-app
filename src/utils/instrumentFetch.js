import logger from './logger'

/**
 * When the log level is `debug`, wrap `window.fetch` so every backend call is
 * logged: the outgoing request (method + URL) and the response (status +
 * duration), or the failure. At any lower level this is a no-op and `fetch`
 * is left untouched, so there is zero overhead in production/error mode.
 *
 * Call once, before the app mounts. Request/response *bodies* are intentionally
 * not logged (they can carry credentials).
 */
export default function instrumentFetch() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  if (!logger.isEnabled('debug')) return
  if (window.fetch.__instrumented) return

  const original = window.fetch.bind(window)

  const wrapped = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input))
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
