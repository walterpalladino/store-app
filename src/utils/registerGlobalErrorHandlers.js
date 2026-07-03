import logger from './logger'

/**
 * Wire browser-level error events into the shared logger so that *any* error
 * that escapes a component — synchronous throws that miss a boundary and
 * rejected promises with no `.catch` — is still recorded.
 *
 * Call once, before the app mounts.
 */
export default function registerGlobalErrorHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    logger.error('Uncaught error:', event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason)
  })
}
