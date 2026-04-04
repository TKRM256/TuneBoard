import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { Toaster } from 'sonner'
import { createLogger } from './lib/logger'

const log = createLogger('Global');

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  log.error('Unhandled promise rejection:', event.reason);
};

const handleWindowError = (event: ErrorEvent) => {
  log.error('Uncaught error:', event.error);
};

window.addEventListener('unhandledrejection', handleUnhandledRejection);
window.addEventListener('error', handleWindowError);

import.meta.hot?.dispose(() => {
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  window.removeEventListener('error', handleWindowError);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App/>
    <Toaster />
  </StrictMode>,
)
