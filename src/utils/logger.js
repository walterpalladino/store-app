/**
 * logger.js — tiny level-based logger
 *
 * The active level is read once, at startup, from the Vite env variable
 * `VITE_LOG_LEVEL` (see .env). Anything at or below the configured level is
 * printed; everything noisier is dropped.
 *
 *   silent < error < warn < info < debug
 *
 * Examples (.env / .env.local):
 *   VITE_LOG_LEVEL=debug     # everything
 *   VITE_LOG_LEVEL=error     # only errors  (sensible for production)
 *   VITE_LOG_LEVEL=silent    # nothing
 *
 * If the variable is unset we default to `debug` in dev and `error` in a
 * production build, so real errors are always surfaced.
 *
 * Set `VITE_LOG_TO_SERVER=true` to ALSO mirror every printed line to the
 * dev-server terminal (via vite-plugin-terminal), so logs show up in the
 * console where `npm run dev` runs, not just the browser DevTools.
 */

export const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }

function resolveLevel() {
  const raw = (import.meta.env.VITE_LOG_LEVEL ?? '').toString().trim().toLowerCase()
  if (raw in LEVELS) return raw
  return import.meta.env.PROD ? 'error' : 'debug'
}

const activeLevel = resolveLevel()
const threshold = LEVELS[activeLevel]

// Mirror to the dev-server terminal only in a real dev server — never under
// test (the terminal bridge POSTs via fetch, which breaks jsdom + fetch spies)
// and never in a production build.
const LOG_TO_SERVER =
  /^(1|true|yes|on)$/i.test(String(import.meta.env.VITE_LOG_TO_SERVER ?? '').trim()) &&
  import.meta.env.DEV &&
  import.meta.env.MODE !== 'test'

// console method per level. NB: debug uses console.log, not console.debug —
// console.debug is filed under DevTools' "Verbose" level, which the default
// console filter HIDES, so debug logs would appear to be missing.
const METHOD = { error: 'error', warn: 'warn', info: 'info', debug: 'log' }

// Lazily loaded terminal bridge — only pulled in when server logging is on.
let serverLogP = null
function forwardToServer(level, prefix, args) {
  if (!LOG_TO_SERVER) return
  if (!serverLogP) serverLogP = import('./serverLog.js').then((m) => m.default).catch(() => null)
  serverLogP.then((fn) => { if (fn) { try { fn(level, prefix, args) } catch { /* ignore */ } } })
}

function emit(level, args) {
  if (LEVELS[level] > threshold) return
  const prefix = `${new Date().toISOString()} [${level.toUpperCase()}]`
  ;(console[METHOD[level]] ?? console.log)(prefix, ...args)
  forwardToServer(level, prefix, args)
}

const logger = {
  /** Currently active level name, e.g. "debug". */
  level: activeLevel,
  /** True when messages at `name` would be printed. */
  isEnabled: (name) => (LEVELS[name] ?? Infinity) <= threshold,
  error: (...args) => emit('error', args),
  warn:  (...args) => emit('warn', args),
  info:  (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
}

export default logger
