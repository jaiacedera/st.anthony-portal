const LOCAL_API_BASE_URL = 'http://localhost:3000'
const RENDER_API_BASE_URL = 'https://st-anthony-backend.onrender.com'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function normalizeConfiguredBaseUrl(value: string): string {
  return trimTrailingSlash(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`)
}

function inferRenderBackendUrl(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const { hostname, protocol } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_BASE_URL
  }

  if (hostname.endsWith('.onrender.com')) {
    if (hostname.includes('frontend')) {
      return `${protocol}//${hostname.replace(/frontend/i, 'backend')}`
    }

    return RENDER_API_BASE_URL
  }

  return null
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return normalizeConfiguredBaseUrl(configuredBaseUrl)
  }

  return trimTrailingSlash(inferRenderBackendUrl() ?? LOCAL_API_BASE_URL)
}
