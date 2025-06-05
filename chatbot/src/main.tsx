import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.scss'
import App from './App.tsx'
import { sendAnalyticsDataOnSessionEnd } from './services/chat'

const handlePageLifecycleEvents = (event: Event) => {
  if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') {
    return;
  }
  sendAnalyticsDataOnSessionEnd()
}

window.addEventListener('beforeunload', handlePageLifecycleEvents)
window.addEventListener('visibilitychange', handlePageLifecycleEvents)
window.addEventListener('pagehide', handlePageLifecycleEvents)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('beforeunload', handlePageLifecycleEvents)
    window.removeEventListener('visibilitychange', handlePageLifecycleEvents)
    window.removeEventListener('pagehide', handlePageLifecycleEvents)
  })
}

ReactDOM.createRoot(document.getElementById('shopify-chatbot')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)