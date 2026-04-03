import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { Toaster } from 'sonner'
import { createLogger } from './lib/logger'

const log = createLogger('Global');

window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  log.error('Uncaught error:', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App/>
    <Toaster />
  </StrictMode>,
)
