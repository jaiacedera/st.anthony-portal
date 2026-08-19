import type { ReactNode } from 'react'
import { AppShellContext, appShellValue } from './appShell'

export function AppShellProvider({ children }: { children: ReactNode }) {
  return (
    <AppShellContext.Provider value={appShellValue}>
      {children}
    </AppShellContext.Provider>
  )
}
