import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import logger from './utils/logger'

// Log application startup
logger.info('Application starting up')

const rootElement = document.getElementById('root')

if (!rootElement) {
  logger.error('Root element not found')
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
