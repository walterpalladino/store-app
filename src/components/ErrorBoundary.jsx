import { Component } from 'react'
import logger from '../utils/logger'

/**
 * Top-level error boundary.
 *
 * Catches any error thrown during React render/commit in the subtree, logs it
 * through the shared logger, and shows a minimal recovery screen instead of an
 * unmountable blank page. Styling is inline (no MUI/theme dependency) so the
 * fallback still renders even when the theme layer is what failed.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    logger.error('Uncaught render error:', error, info?.componentStack ?? '')
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
          fontFamily: 'system-ui, sans-serif', textAlign: 'center', color: '#1a1a1a',
          background: '#faf8f4',
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 500, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: '0.9rem', color: '#6b6560', maxWidth: 420, margin: 0 }}>
          The page hit an unexpected error and couldn’t be displayed. The details have
          been logged. Try reloading — if it keeps happening, sign out and back in.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            border: '1px solid rgba(26,26,26,0.25)', background: '#1a1a1a', color: '#fff',
            padding: '10px 20px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
