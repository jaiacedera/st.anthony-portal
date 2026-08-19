import { startTransition, useEffect, useState } from 'react'
import { fetchSystemHealth, type SystemHealth } from '../services/systemApi'

type SystemStatusState = {
  loading: boolean
  error: string | null
  data: SystemHealth | null
}

const initialState: SystemStatusState = {
  loading: true,
  error: null,
  data: null,
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to reach backend'
}

export function useSystemStatus() {
  const [state, setState] = useState<SystemStatusState>(initialState)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const data = await fetchSystemHealth(controller.signal)

        startTransition(() => {
          setState({
            loading: false,
            error: null,
            data,
          })
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        startTransition(() => {
          setState({
            loading: false,
            error: getErrorMessage(error),
            data: null,
          })
        })
      }
    })()

    return () => controller.abort()
  }, [])

  const refresh = () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }))

    void (async () => {
      try {
        const data = await fetchSystemHealth()

        startTransition(() => {
          setState({
            loading: false,
            error: null,
            data,
          })
        })
      } catch (error) {
        startTransition(() => {
          setState({
            loading: false,
            error: getErrorMessage(error),
            data: null,
          })
        })
      }
    })()
  }

  return {
    ...state,
    refresh,
  }
}
