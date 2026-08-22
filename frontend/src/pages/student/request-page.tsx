import { useEffect, useMemo, useState } from 'react'
import { StudentShell } from '../../components/student-shell'
import {
  fetchStudentDashboard,
  type StudentDashboardPayload,
} from '../../services/studentApi'
import { navigateTo } from '../../utils/navigation'
import {
  clearStudentAuth,
  isInvalidStudentSessionMessage,
  readStudentAuth,
} from '../../utils/studentAuth'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.8v4" />
      <path d="M16 2.8v4" />
      <path d="M3 9.5h18" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h6.5L19 9v11.5A1.5 1.5 0 0 1 17.5 22h-10A1.5 1.5 0 0 1 6 20.5v-15A2 2 0 0 1 7 3.5Z" />
      <path d="M13 3.5V9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4.5" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v17H6a2.5 2.5 0 0 0-2.5 2" />
      <path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v17H18a2.5 2.5 0 0 1 2.5 2" />
    </svg>
  )
}

function formatRequestedAt(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)

  return `${datePart} - ${timePart}`
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()

  if (normalized === 'APPROVED') {
    return 'approved'
  }

  if (normalized === 'REJECTED') {
    return 'rejected'
  }

  return 'pending'
}

export default function StudentRequestPage() {
  const auth = readStudentAuth()
  const hasStudentIdentity = Boolean(auth?.studentId || auth?.email || auth?.username)
  const sessionErrorMessage = hasStudentIdentity
    ? ''
    : 'No student session was found. Please sign in again.'
  const [dashboard, setDashboard] = useState<StudentDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!hasStudentIdentity) {
      return
    }

    const abortController = new AbortController()

    fetchStudentDashboard(
      {
        studentId: auth?.studentId,
        email: auth?.email ?? auth?.username,
      },
      abortController.signal,
    )
      .then((payload) => {
        setDashboard(payload)
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof Error && isInvalidStudentSessionMessage(error.message)) {
          clearStudentAuth()
          navigateTo('/student', { replace: true })
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load student requests.',
        )
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [auth?.email, auth?.studentId, auth?.username, hasStudentIdentity])

  const filteredRequests = useMemo(() => {
    const requests = dashboard?.requests ?? []
    const normalizedSearch = searchText.trim().toLowerCase()

    return requests.filter((request) => {
      if (statusFilter !== 'ALL' && request.status.toUpperCase() !== statusFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        request.requestId,
        request.requestType,
        request.subjectCode,
        request.subjectName,
        request.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [dashboard?.requests, searchText, statusFilter])

  const totalRequests = dashboard?.requests.length ?? 0
  const hasFilteredRequests = filteredRequests.length > 0
  const emptyStateMessage =
    totalRequests === 0
      ? 'No requests to display.'
      : 'No requests matched your current filters.'

  return (
    <StudentShell
      active="requests"
      schoolYearLabel={dashboard?.header.schoolYear ?? 'Loading...'}
      semesterLabel={dashboard?.header.semester ?? 'Loading...'}
      notificationCount={dashboard?.stats.pendingRequestCount ?? 0}
    >
      <section className="student-requests-page">
        {sessionErrorMessage || errorMessage ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            <section className="dashboard-alert-row">
              <div className="dashboard-alert">{sessionErrorMessage || errorMessage}</div>
            </section>
          </div>
        ) : null}

        <header className="student-requests-header">
          <div>
            <h2>Requests</h2>
            <p>View and manage your requests.</p>
          </div>

          <button type="button" className="student-requests-primary-button">
            <PlusIcon />
            <span>New Request</span>
          </button>
        </header>

        <section className="student-requests-filters">
          <label className="student-requests-search">
            <span className="student-requests-search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search requests..."
            />
          </label>

          <label className="student-requests-select">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <span className="student-requests-select-icon" aria-hidden="true">
              <ChevronDownIcon />
            </span>
          </label>
        </section>

        <div className="student-request-list">
          {hasStudentIdentity && isLoading ? (
            <article className="student-request-card student-request-card--empty">
              <p>Loading your requests...</p>
            </article>
          ) : hasFilteredRequests ? (
            filteredRequests.map((request) => {
              const tone = getStatusTone(request.status)
              const leadingIcon =
                tone === 'approved' ? <BookIcon /> : <FileIcon />

              return (
                <article key={request.requestId} className="student-request-card">
                  <div className={`student-request-icon student-request-icon--${tone}`}>
                    {leadingIcon}
                  </div>

                  <div className="student-request-copy">
                    <div className="student-request-topline">
                      <div className="student-request-heading">
                        <strong>{request.requestId}</strong>
                        <span>{request.requestType}</span>
                        <small>{request.subjectCode}</small>
                      </div>

                      <div className="student-request-status-group">
                        <span className={`student-request-status student-request-status--${tone}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase()}
                        </span>
                        <span className="student-request-chevron" aria-hidden="true">
                          <ChevronRightIcon />
                        </span>
                      </div>
                    </div>

                    <div className="student-request-meta">
                      <CalendarIcon />
                      <span>{formatRequestedAt(request.requestedAt)}</span>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <article className="student-request-card student-request-card--empty">
              <p>{emptyStateMessage}</p>
            </article>
          )}
        </div>

        {hasFilteredRequests ? (
          <p className="student-requests-footer">
            {`Showing 1 to ${filteredRequests.length} of ${filteredRequests.length} requests`}
          </p>
        ) : null}
      </section>
    </StudentShell>
  )
}
