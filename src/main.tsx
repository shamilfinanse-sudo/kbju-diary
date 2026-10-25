import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './store'
import './styles/base.css'
import './styles/themes.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  navigator.serviceWorker.register('sw.js').catch(() => undefined)
}
