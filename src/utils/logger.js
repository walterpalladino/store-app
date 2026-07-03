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
 */

export const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }

function resolveLevel() {
  const raw = (import.meta.env.VITE_LOG_LEVEL ?? '').toString().trim().toLowerCase()
  if (raw in LEVELS) return raw
  return import.meta.env.PROD ? 'error' : 'debug'
}

const activeLevel = resolveLevel()
const threshold = LEVELS[activeLevel]

// console method per level (error/warn have dedicated methods; the rest use log)
const METHOD = { error: 'error', warn: 'warn', info: 'info', debug: 'debug' }

function emit(level, args) {
  if (LEVELS[level] > threshold) return
  const ts = new Date().toISOString()
  ;(console[METHOD[level]] ?? console.log)(`${ts} [${level.toUpperCase()}]`, ...args)
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
