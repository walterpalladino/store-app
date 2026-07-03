// Bridges the logger to the dev-server terminal via vite-plugin-terminal.
// Isolated in its own module so the `virtual:terminal` import is only pulled in
// when server logging is actually enabled (dynamic-imported from logger.js).
import terminal from 'virtual:terminal'

const METHOD = { error: 'error', warn: 'warn', info: 'info', debug: 'log' }

/** Write one already-formatted line to the terminal. */
export default function serverLog(level, prefix, args) {
  ;(terminal[METHOD[level]] ?? terminal.log)(prefix, ...args)
}
