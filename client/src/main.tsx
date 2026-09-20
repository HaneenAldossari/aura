import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocaleProvider } from './i18n'

/**
 * Register the service worker after first paint.
 *
 * Deliberately not blocking: nothing on the first load needs it, and
 * registering during startup competes with the 20 MB of models the analysis
 * page begins fetching immediately. Failure is silent by design — the app
 * works without it, and a console error here would be the only symptom of a
 * feature nobody asked for.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
