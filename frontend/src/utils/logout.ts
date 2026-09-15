import { navigateTo } from './navigation'
import type { LogoutPortal } from '../context/logout'

export function clearLogoutSession(portal: LogoutPortal) {
  const key = `${portal}-auth`
  window.localStorage.removeItem(key)
  window.sessionStorage.removeItem(key)
  navigateTo(`/${portal}`, { replace: true })
}
