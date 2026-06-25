import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionsProvider } from './context/SessionsContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionsProvider>
      <App />
    </SessionsProvider>
  </StrictMode>,
)
