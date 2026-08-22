export const APP_NAVIGATE_EVENT = 'app:navigate'

export function navigateTo(path: string, options?: { replace?: boolean }) {
  const normalizedPath = path.replace(/\/+$/, '') || '/'

  if (window.location.pathname === normalizedPath) {
    return
  }

  if (options?.replace) {
    window.history.replaceState({}, '', normalizedPath)
  } else {
    window.history.pushState({}, '', normalizedPath)
  }

  window.dispatchEvent(new Event(APP_NAVIGATE_EVENT))
}
