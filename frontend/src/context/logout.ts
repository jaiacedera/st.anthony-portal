import { createContext, useContext } from 'react'

export type LogoutPortal = 'student' | 'instructor'

export const LogoutContext = createContext<((portal: LogoutPortal) => void) | null>(null)

export function useLogout() {
  const logout = useContext(LogoutContext)
  if (!logout) throw new Error('useLogout must be used inside LogoutProvider')
  return logout
}
