import { useEffect, useMemo, useState } from 'react'
import { StudentShell } from '../../components/student-shell'
import {
  fetchStudentDashboard,
  fetchStudentRequestResponse,
  type StudentApprovedBreakdownResponse,
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

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function formatRequestedDate(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function formatRequestedDateTime(value: string) {
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

  return `${datePart} • ${timePart}`
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

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function buildRequestMessage(
  request: StudentDashboardPayload['requests'][number],
) {
  return `Your ${request.requestType.toLowerCase()} request for ${request.subjectCode} (${request.subjectName}) is currently recorded in the portal.`
}

const rowsPerPage = 8

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
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [requestResponse, setRequestResponse] = useState<StudentApprovedBreakdownResponse | null>(null)
  const [isResponseLoading, setIsResponseLoading] = useState(false)

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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, statusFilter])

  useEffect(() => {
    if (!selectedRequestId) {
      setRequestResponse(null)
      return
    }

    if (!filteredRequests.some((request) => request.requestId === selectedRequestId)) {
      setSelectedRequestId('')
      setRequestResponse(null)
    }
  }, [filteredRequests, selectedRequestId])

  const totalRequests = dashboard?.requests.length ?? 0
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedRequests = filteredRequests.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage,
  )
  const selectedRequest =
    filteredRequests.find((request) => request.requestId === selectedRequestId) ?? null
  const tableEmptyMessage =
    totalRequests === 0
      ? 'No requests to display.'
      : 'No requests matched your current filters.'
  const displayStart = filteredRequests.length ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0
  const displayEnd = Math.min(safeCurrentPage * rowsPerPage, filteredRequests.length)

  async function handleViewResponse() {
    if (!selectedRequest || selectedRequest.status.toUpperCase() !== 'APPROVED') {
      return
    }

    setIsResponseLoading(true)
    setErrorMessage('')

    try {
      const payload = await fetchStudentRequestResponse({
        requestId: selectedRequest.requestId,
        studentId: auth?.studentId,
        email: auth?.email ?? auth?.username,
      })

      setRequestResponse(payload.response)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the approved breakdown response.',
      )
    } finally {
      setIsResponseLoading(false)
    }
  }

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

        <section className="student-requests-toolbar">
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

          <button type="button" className="student-requests-primary-button">
            <PlusIcon />
            <span>New Request</span>
          </button>
        </section>

        <div
          className={
            selectedRequest
              ? 'student-requests-content student-requests-content--with-details'
              : 'student-requests-content'
          }
        >
          <section className="student-requests-table-card">
            <div className="student-requests-table-wrap">
              <table className="student-requests-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hasStudentIdentity && isLoading ? (
                    <tr>
                      <td colSpan={6} className="student-requests-empty-cell">
                        Loading your requests...
                      </td>
                    </tr>
                  ) : paginatedRequests.length ? (
                    paginatedRequests.map((request) => {
                      const tone = getStatusTone(request.status)
                      const isSelected = request.requestId === selectedRequest?.requestId

                      return (
                        <tr
                          key={request.requestId}
                          className={isSelected ? 'is-selected' : undefined}
                          onClick={() => setSelectedRequestId(request.requestId)}
                        >
                          <td>{request.requestId}</td>
                          <td>{request.requestType}</td>
                          <td>{request.subjectCode}</td>
                          <td>{formatRequestedDate(request.requestedAt)}</td>
                          <td>
                            <span className={`student-request-status student-request-status--${tone}`}>
                              {formatStatusLabel(request.status)}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="student-request-action-button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedRequestId(request.requestId)
                              }}
                              aria-label={`View ${request.requestId}`}
                            >
                              <EyeIcon />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="student-requests-empty-cell">
                        {tableEmptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="student-requests-table-footer">
              <p className="student-requests-footer">
                {filteredRequests.length
                  ? `Showing ${displayStart} to ${displayEnd} of ${filteredRequests.length} requests`
                  : 'Showing 0 requests'}
              </p>

              <div className="student-requests-pagination">
                <button
                  type="button"
                  className="student-requests-page-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </button>
                <span className="student-requests-page-indicator">{safeCurrentPage}</span>
                <button
                  type="button"
                  className="student-requests-page-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages || !filteredRequests.length}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </section>

          {selectedRequest ? (
            <aside className="student-request-details-card">
              <div className="student-request-details-top">
                <span
                  className={`student-request-status student-request-status--${getStatusTone(selectedRequest.status)}`}
                >
                  {formatStatusLabel(selectedRequest.status)}
                </span>

                <button
                  type="button"
                  className="student-request-details-close"
                  onClick={() => setSelectedRequestId('')}
                  aria-label="Close request details"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="student-request-details-body">
                <h2>{selectedRequest.requestId}</h2>

                <div className="student-request-details-list">
                  <div className="student-request-details-row">
                    <span className="student-request-details-icon" aria-hidden="true">
                      <FileIcon />
                    </span>
                    <div>
                      <span className="student-request-details-label">Request Type</span>
                      <strong>{selectedRequest.requestType}</strong>
                    </div>
                  </div>

                  <div className="student-request-details-row">
                    <span className="student-request-details-icon" aria-hidden="true">
                      <BookIcon />
                    </span>
                    <div>
                      <span className="student-request-details-label">Subject</span>
                      <strong>{selectedRequest.subjectCode}</strong>
                    </div>
                  </div>

                  <div className="student-request-details-row">
                    <span className="student-request-details-icon" aria-hidden="true">
                      <CalendarIcon />
                    </span>
                    <div>
                      <span className="student-request-details-label">Date Submitted</span>
                      <strong>{formatRequestedDateTime(selectedRequest.requestedAt)}</strong>
                    </div>
                  </div>
                </div>

                <div className="student-request-details-message">
                  <span className="student-request-details-label">Message</span>
                  <p>{buildRequestMessage(selectedRequest)}</p>
                </div>
              </div>

              <button
                type="button"
                className="student-request-details-button"
                onClick={handleViewResponse}
                disabled={
                  selectedRequest.status.toUpperCase() !== 'APPROVED' || isResponseLoading
                }
              >
                <MailIcon />
                <span>
                  {selectedRequest.status.toUpperCase() === 'APPROVED'
                    ? isResponseLoading
                      ? 'Loading Response...'
                      : 'View Response'
                    : 'Awaiting Response'}
                </span>
              </button>
            </aside>
          ) : null}
        </div>
      </section>

      {requestResponse ? (
        <div
          className="student-breakdown-response-overlay"
          onClick={() => setRequestResponse(null)}
        >
          <section
            className="student-breakdown-response-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-breakdown-response-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-breakdown-response-header">
              <div>
                <span className="student-breakdown-response-kicker">
                  Grade Breakdown
                </span>
                <h2 id="student-breakdown-response-title">
                  {`${requestResponse.subjectCode} - ${requestResponse.subjectTitle}`}
                </h2>
                <p>
                  {`${requestResponse.gradingPeriod === 'final' ? 'Final' : 'Midterm'} Grading Period`}
                </p>
              </div>

              <button
                type="button"
                className="student-request-details-close"
                onClick={() => setRequestResponse(null)}
                aria-label="Close approved breakdown response"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="student-breakdown-response-body">
              <section className="student-breakdown-response-section">
                <h3>{requestResponse.knowledge.label}</h3>

                {requestResponse.knowledge.sections.map((section) => (
                  <div key={section.label} className="student-breakdown-knowledge-card">
                    <div className="student-breakdown-knowledge-heading">
                      <strong>{section.label}</strong>
                    </div>

                    <div className="student-breakdown-rows">
                      {section.items.map((item) => (
                        <div key={item.label} className="student-breakdown-row">
                          <span>{item.label}</span>
                          <strong>{item.score === null ? '--' : item.score.toFixed(2)}</strong>
                        </div>
                      ))}

                      <div className="student-breakdown-row student-breakdown-row--summary">
                        <span>Average</span>
                        <strong>{section.average === null ? '--' : section.average.toFixed(2)}</strong>
                      </div>

                      <div className="student-breakdown-row student-breakdown-row--summary">
                        <span>Weighted</span>
                        <strong>{section.weighted === null ? '--' : section.weighted.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="student-breakdown-summary-card">
                  <span>Knowledge Weighted</span>
                  <strong>
                    {requestResponse.knowledge.weighted === null
                      ? '--'
                      : `${requestResponse.knowledge.weighted.toFixed(2)} / ${requestResponse.knowledge.weight}`}
                  </strong>
                </div>
              </section>

              {requestResponse.skills ? (
                <section className="student-breakdown-response-section">
                  <h3>{requestResponse.skills.label}</h3>
                  <div className="student-breakdown-summary-card">
                    <span>Weighted</span>
                    <strong>
                      {requestResponse.skills.weighted === null
                        ? '--'
                        : `${requestResponse.skills.weighted.toFixed(2)} / ${requestResponse.skills.weight}`}
                    </strong>
                  </div>
                </section>
              ) : null}

              {requestResponse.attitude ? (
                <section className="student-breakdown-response-section">
                  <h3>{requestResponse.attitude.label}</h3>
                  <div className="student-breakdown-summary-card">
                    <span>Weighted</span>
                    <strong>
                      {requestResponse.attitude.weighted === null
                        ? '--'
                        : `${requestResponse.attitude.weighted.toFixed(2)} / ${requestResponse.attitude.weight}`}
                    </strong>
                  </div>
                </section>
              ) : null}

              <section className="student-breakdown-response-section student-breakdown-response-section--totals">
                <div className="student-breakdown-summary-card">
                  <span>
                    {requestResponse.gradingPeriod === 'final' ? 'Final Grade' : 'Midterm Grade'}
                  </span>
                  <strong>
                    {requestResponse.finalGrade === null ? '--' : requestResponse.finalGrade.toFixed(2)}
                  </strong>
                </div>

                <div className="student-breakdown-summary-card">
                  <span>
                    {requestResponse.gradingPeriod === 'final' ? 'Final Rating' : 'Midterm Rating'}
                  </span>
                  <strong>{requestResponse.rating}</strong>
                </div>

                <div className="student-breakdown-summary-card">
                  <span>Remarks</span>
                  <strong>{requestResponse.remarks}</strong>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </StudentShell>
  )
}
