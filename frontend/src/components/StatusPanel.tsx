import { useSystemStatus } from '../hooks/useSystemStatus'
import { endpointSummaries } from '../utils/siteContent'

export function StatusPanel() {
  const { data, error, loading, refresh } = useSystemStatus()

  const statusClassName =
    !loading && data
      ? 'status-badge status-badge--ok'
      : 'status-badge status-badge--offline'

  const statusLabel = loading
    ? 'Checking backend'
    : data
      ? 'Backend connected'
      : 'Backend offline'

  return (
    <aside className="status-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-label">System status</span>
          <h2>Backend handshake</h2>
        </div>
        <span className={statusClassName}>{statusLabel}</span>
      </div>

      <p className="status-meta">
        {data
          ? `Last response: ${new Date(data.timestamp).toLocaleString()}`
          : 'Start the backend to populate this live status panel.'}
      </p>

      {error ? <div className="status-error">{error}</div> : null}

      <ul>
        {endpointSummaries.map((endpoint) => (
          <li key={endpoint}>{endpoint}</li>
        ))}
      </ul>

      <p className="status-meta">
        {data
          ? `${data.modules.length} modules reported by the backend service.`
          : 'The frontend is already wired to call /api/health.'}
      </p>

      <button type="button" onClick={refresh}>
        Refresh status
      </button>
    </aside>
  )
}
