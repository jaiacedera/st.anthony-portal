export type SystemModule = {
  name: string
  path: string
  description: string
}

export type SystemHealth = {
  status: 'ok'
  service: string
  timestamp: string
  modules: SystemModule[]
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function fetchSystemHealth(
  signal?: AbortSignal,
): Promise<SystemHealth> {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Backend request failed with ${response.status}`)
  }

  return (await response.json()) as SystemHealth
}
