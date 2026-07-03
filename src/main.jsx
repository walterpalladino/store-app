import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import theme from './theme/theme'
import ErrorBoundary from './components/ErrorBoundary'
import registerGlobalErrorHandlers from './utils/registerGlobalErrorHandlers'
import logger from './utils/logger'

registerGlobalErrorHandlers()
logger.info(`Logger initialised at level "${logger.level}"`)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
