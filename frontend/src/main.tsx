import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppShellProvider } from './context/AppShellProvider'
import { LogoutProvider } from './context/LogoutProvider'
import './components/portal-sidebar.css'
import './components/portal-header.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShellProvider>
      <LogoutProvider><App /></LogoutProvider>
    </AppShellProvider>
  </StrictMode>,
)
