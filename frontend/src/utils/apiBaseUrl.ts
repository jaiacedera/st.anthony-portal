export function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBaseUrl) {
    const url = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredBaseUrl)
      ? configuredBaseUrl
      : 'https://' + configuredBaseUrl
    return url.replace(/\/+$/, '')
  }
  return import.meta.env.DEV ? 'http://localhost:3000' : ''
}
