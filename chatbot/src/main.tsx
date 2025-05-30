import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'

createRoot(document.getElementById('shopify-chatbot')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
