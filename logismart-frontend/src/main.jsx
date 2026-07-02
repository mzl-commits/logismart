import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './design-system.css'
import App from './App.jsx'
import { applyAccessibilityPreferences, loadAccessibilityPreferences } from './accessibility.js'

applyAccessibilityPreferences(loadAccessibilityPreferences())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
