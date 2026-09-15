import { useEffect, useMemo, useState } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  fetchInstructorGradePublication,
  fetchInstructorRequests,
  fetchInstructorStudents,
  reviewInstructorRequest,
  type InstructorRequestRecord,
  type InstructorRosterSubject,
  type InstructorStudentRecord,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'
import './requests-page.css'
import {
  buildApprovedBreakdownResponse,
  type GradingPeriodKey,
} from '../../utils/student-breakdown-response'

type RequestTabKey = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

type ReviewDialogState = {
  requestId: string
  nextStatus: 'APPROVED' | 'REJECTED'
} | null

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function getRequestTypeTone(type: string) {
  switch (type.trim().toLowerCase()) {
    case 'grade breakdown': return 'breakdown'
    case 'completion': return 'completion'
    case 'reconsideration': return 'reconsideration'
    default: return 'inquiry'
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h18l-7 8v8l-4-2v-6Z" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
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

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
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

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
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

function formatStatusLabel(status: string) {
  const normalized = String(status ?? '').trim().toUpperCase()

  if (normalized === 'APPROVED') {
    return 'Approved'
  }

  if (normalized === 'REJECTED') {
    return 'Rejected'
  }

  return 'Pending'
}

function getStatusTone(status: string) {
  const normalized = String(status ?? '').trim().toUpperCase()

  if (normalized === 'APPROVED') {
    return 'approved'
  }

  if (normalized === 'REJECTED') {
    return 'rejected'
  }

  return 'pending'
}

function formatRequestDate(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return {
      date: 'Date unavailable',
      time: '',
    }
  }

  return {
    date: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed),
  }
}

function getEmptyMessage(activeTab: RequestTabKey, hasFilters: boolean) {
  if (hasFilters) {
    return 'No requests matched your current filters.'
  }

  if (activeTab === 'PENDING') {
    return 'No pending requests.'
  }

  if (activeTab === 'APPROVED') {
    return 'No approved requests.'
  }

  if (activeTab === 'REJECTED') {
    return 'No rejected requests.'
  }

  return 'No requests found.'
}

export default function RequestsPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const sessionErrorMessage = username
    ? ''
    : 'No instructor session was found. Please sign in again.'
  const [requests, setRequests] = useState<InstructorRequestRecord[]>([])
  const [schoolYearLabel, setSchoolYearLabel] = useState('Not set')
  const [semesterLabel, setSemesterLabel] = useState('Not set')
  const [isLoading, setIsLoading] = useState(Boolean(username))
  const [errorMessage, setErrorMessage] = useState('')
  const [bindingMessage, setBindingMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [students, setStudents] = useState<InstructorStudentRecord[]>([])
  const [subjects, setSubjects] = useState<InstructorRosterSubject[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<RequestTabKey>('ALL')
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [reviewDialogState, setReviewDialogState] = useState<ReviewDialogState>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage('')
    }, 7000)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    if (!errorMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setErrorMessage('')
    }, 7000)

    return () => window.clearTimeout(timer)
  }, [errorMessage])

  useEffect(() => {
    if (!username) {
      return
    }

    const abortController = new AbortController()

    Promise.all([
      fetchInstructorRequests(username, abortController.signal),
      fetchInstructorStudents(username, abortController.signal),
    ])
      .then(([requestsPayload, studentsPayload]) => {
        if (abortController.signal.aborted) {
          return
        }

        setRequests(requestsPayload.requests)
        setStudents(studentsPayload.students)
        setSubjects(studentsPayload.subjects)
        setSchoolYearLabel(requestsPayload.header.schoolYear)
        setSemesterLabel(requestsPayload.header.semester)
        setBindingMessage(
          requestsPayload.needsBinding
            ? requestsPayload.message ?? ''
            : studentsPayload.needsBinding
              ? studentsPayload.message ?? ''
              : '',
        )
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor requests.',
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
  }, [username])

  const studentEmails = useMemo(
    () => new Map(students.map((student) => [student.id, student.email])),
    [students],
  )
  const statusCounts = useMemo(() => ({
    ALL: requests.length,
    PENDING: requests.filter((request) => getStatusTone(request.status) === 'pending').length,
    APPROVED: requests.filter((request) => getStatusTone(request.status) === 'approved').length,
    REJECTED: requests.filter((request) => getStatusTone(request.status) === 'rejected').length,
  }), [requests])

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return requests.filter((request) => {
      const normalizedStatus = String(request.status ?? '').trim().toUpperCase()

      if (activeTab !== 'ALL' && normalizedStatus !== activeTab) {
        return false
      }

      if (subjectFilter !== 'ALL' && request.subjectId !== subjectFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        request.requestId,
        request.studentName,
        studentEmails.get(request.studentId),
        request.message,
        request.subjectCode,
        request.subjectTitle,
        request.requestType,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [activeTab, requests, searchText, subjectFilter, studentEmails])

  useEffect(() => {
    if (!selectedRequestId && !reviewDialogState && !isFilterOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (reviewDialogState) {
        setReviewDialogState(null)
        return
      }

      if (selectedRequestId) {
        setSelectedRequestId('')
        return
      }

      if (isFilterOpen) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFilterOpen, reviewDialogState, selectedRequestId])

  const subjectOptions = useMemo(() => {
    const uniqueSubjects = new Map<string, { id: string; label: string }>()

    for (const request of requests) {
      if (!request.subjectId) {
        continue
      }

      uniqueSubjects.set(request.subjectId, {
        id: request.subjectId,
        label: `${request.subjectCode} - ${request.subjectTitle}`,
      })
    }

    return [...uniqueSubjects.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [requests])

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedRequests = filteredRequests.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage,
  )
  const selectedRequest = selectedRequestId
    ? requests.find((request) => request.requestId === selectedRequestId) ?? null
    : null
  const reviewTargetRequest =
    reviewDialogState === null
      ? null
      : requests.find((request) => request.requestId === reviewDialogState.requestId) ?? null
  const hasActiveFilters = Boolean(searchText.trim()) || subjectFilter !== 'ALL'
  const displayStart = filteredRequests.length ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0
  const displayEnd = Math.min(safeCurrentPage * rowsPerPage, filteredRequests.length)
  const alerts = [
    sessionErrorMessage,
    errorMessage,
    bindingMessage,
    successMessage,
  ].filter(Boolean)
  const firstPageNumber = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4))
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstPageNumber + index,
  )

  async function resolveApprovedRequestPeriod(subjectId: string): Promise<GradingPeriodKey> {
    const finalPublication = await fetchInstructorGradePublication({
      username,
      subjectId,
      gradingPeriod: 'final',
    }).catch(() => null)

    if (finalPublication?.publication.isPosted) {
      return 'final'
    }

    const midtermPublication = await fetchInstructorGradePublication({
      username,
      subjectId,
      gradingPeriod: 'midterm',
    }).catch(() => null)

    if (midtermPublication?.publication.isPosted) {
      return 'midterm'
    }

    throw new Error('No posted grading period is available for this request yet.')
  }

  async function handleConfirmReview() {
    if (!reviewDialogState || !reviewTargetRequest) {
      return
    }

    setIsSubmittingReview(true)
    setErrorMessage('')

    try {
      const approvedBreakdown =
        reviewDialogState.nextStatus === 'APPROVED'
          ? (() => {
              const subject = subjects.find(
                (currentSubject) => currentSubject.id === reviewTargetRequest.subjectId,
              )
              const student = students.find(
                (currentStudent) => currentStudent.id === reviewTargetRequest.studentId,
              )

              if (!subject || !student) {
                throw new Error(
                  'The subject or student record for this request could not be resolved.',
                )
              }

              return { subject, student }
            })()
          : null
      const gradingPeriod =
        reviewDialogState.nextStatus === 'APPROVED'
          ? await resolveApprovedRequestPeriod(reviewTargetRequest.subjectId)
          : null
      const payload = await reviewInstructorRequest({
        username,
        requestId: reviewDialogState.requestId,
        status: reviewDialogState.nextStatus,
        approvedBreakdown:
          reviewDialogState.nextStatus === 'APPROVED' &&
          approvedBreakdown &&
          gradingPeriod
            ? buildApprovedBreakdownResponse({
                requestId: reviewTargetRequest.requestId,
                username,
                subject: approvedBreakdown.subject,
                student: approvedBreakdown.student,
                gradingPeriod,
              })
            : undefined,
      })

      setRequests((current) =>
        current.map((request) =>
          request.requestId === payload.request.requestId
            ? {
                ...request,
                status: payload.request.status,
                processedAt: payload.request.processedAt,
                processedBy: payload.request.processedBy,
                processedByName: payload.request.processedByName,
              }
            : request,
        ),
      )
      setSuccessMessage(
        reviewDialogState.nextStatus === 'APPROVED'
          ? 'The grade breakdown request was approved successfully.'
          : 'The grade breakdown request was rejected successfully.',
      )
      setReviewDialogState(null)
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the request. Please try again.',
      )
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <InstructorShell
      searchValue={searchText}
      onSearchChange={(value) => { setSearchText(value); setCurrentPage(1) }}
      active="requests"
      schoolYearLabel={schoolYearLabel}
      semesterLabel={semesterLabel}
    >
      <section className="instructor-requests-page">
        {alerts.length ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            {alerts.map((message, index) => (
              <section key={`${message}-${index}`} className="dashboard-alert-row">
                <div className="dashboard-alert">{message}</div>
              </section>
            ))}
          </div>
        ) : null}

        <header className="instructor-requests-heading">
          <span className="instructor-requests-heading-icon"><FileIcon /></span>
          <div>
            <h1>Student Requests</h1>
            <p>Review and manage student requests for grade breakdowns and other academic concerns.</p>
          </div>
        </header>

          <div className="instructor-requests-toolbar">
            <div
              className="instructor-requests-tabs"
              role="group"
              aria-label="Instructor request status filters"
            >
              {[
                { key: 'ALL', label: 'All Requests' },
                { key: 'PENDING', label: 'Pending' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab === tab.key}
                  className={
                    activeTab === tab.key
                      ? 'instructor-request-tab is-active'
                      : 'instructor-request-tab'
                  }
                  onClick={() => {
                    setActiveTab(tab.key as RequestTabKey)
                    setCurrentPage(1)
                  }}
                >
                  {tab.label}
                  <span className={`instructor-request-tab-count instructor-request-tab-count--${tab.key.toLowerCase()}`}>
                    {statusCounts[tab.key as RequestTabKey]}
                  </span>
                </button>
              ))}
            </div>

            <div className="instructor-requests-controls">
              <label className="instructor-requests-search">
                <span className="instructor-requests-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  aria-label="Search requests"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search requests..."
                />
              </label>

              <div className="instructor-requests-filter-wrap">
                <button
                  type="button"
                  className="instructor-requests-filter-button"
                  onClick={() => setIsFilterOpen((current) => !current)}
                  aria-expanded={isFilterOpen}
                  aria-haspopup="dialog"
                >
                  <FilterIcon />
                  <span>Filter</span>
                  <ChevronDownIcon />
                </button>

                {isFilterOpen ? (
                  <div
                    className="instructor-requests-filter-popover"
                    role="dialog"
                    aria-label="Filter requests"
                  >
                    <label className="instructor-requests-filter-field">
                      <span>Subject</span>
                      <div className="instructor-requests-filter-select">
                        <select
                          value={subjectFilter}
                          onChange={(event) => {
                            setSubjectFilter(event.target.value)
                            setCurrentPage(1)
                          }}
                        >
                          <option value="ALL">All Subjects</option>
                          {subjectOptions.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.label}
                            </option>
                          ))}
                        </select>
                        <span aria-hidden="true">
                          <ChevronDownIcon />
                        </span>
                      </div>
                    </label>

                    <button
                      type="button"
                      className="instructor-requests-filter-clear"
                      onClick={() => {
                        setSubjectFilter('ALL')
                        setCurrentPage(1)
                        setIsFilterOpen(false)
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        <article className="instructor-panel instructor-requests-panel">
          <div className="instructor-requests-table-wrap">
            <table className="instructor-requests-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date Requested</th>
                  <th>Student Name<span className="instructor-requests-email-label">Email</span></th>
                  <th>Subject / Details</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="instructor-requests-empty-cell">
                      Loading requests...
                    </td>
                  </tr>
                ) : paginatedRequests.length ? (
                  paginatedRequests.map((request, index) => {
                    const requestedDate = formatRequestDate(request.requestedAt)

                    return (
                      <tr key={request.requestId}>
                        <td className="instructor-request-id-cell">{displayStart + index}</td>
                        <td>
                          <div className="instructor-request-datetime">
                            <strong>{requestedDate.date}</strong>
                            <span>{requestedDate.time}</span>
                          </div>
                        </td>
                        <td>
                          <div className="instructor-request-subject">
                            <strong>{request.studentName}</strong>
                            <span>{studentEmails.get(request.studentId) || 'Email unavailable'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="instructor-request-subject">
                            <strong>{request.subjectCode}</strong>
                            <span>{request.gradingPeriod
                              ? `${request.requestType} for ${request.gradingPeriod.charAt(0).toUpperCase()}${request.gradingPeriod.slice(1)}`
                              : request.subjectTitle}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`instructor-request-type-badge instructor-request-type-badge--${getRequestTypeTone(request.requestType)}`}>
                            {request.requestType}
                          </span>
                        </td>
                        <td>
                          <span className="instructor-request-message-preview" title={request.message || 'No message provided'}>
                            {request.message || 'No message provided'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`instructor-request-status instructor-request-status--${getStatusTone(request.status)}`}
                          >
                            {formatStatusLabel(request.status)}
                          </span>
                        </td>
                        <td>
                          <div className="instructor-request-row-actions">
                          <button
                            type="button"
                            className="instructor-request-more"
                            onClick={() => setSelectedRequestId(request.requestId)}
                            aria-label={`View ${request.requestId}`}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            className="instructor-request-more"
                            onClick={() => setSelectedRequestId(request.requestId)}
                            aria-label={`Open ${request.requestId}`}
                          >
                            <MoreIcon />
                          </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="instructor-requests-empty-cell">
                      {getEmptyMessage(activeTab, hasActiveFilters)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="instructor-requests-mobile-list">
            {isLoading ? (
              <div className="instructor-requests-mobile-empty">Loading requests...</div>
            ) : paginatedRequests.length ? (
              paginatedRequests.map((request) => {
                const requestedDate = formatRequestDate(request.requestedAt)

                return (
                  <article key={`${request.requestId}-mobile`} className="instructor-request-mobile-card">
                    <div className="instructor-request-mobile-top">
                      <div>
                        <strong className="instructor-request-mobile-id">{request.requestId}</strong>
                        <p className="instructor-request-mobile-type">{request.requestType}</p>
                      </div>
                      <span
                        className={`instructor-request-status instructor-request-status--${getStatusTone(request.status)}`}
                      >
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="instructor-request-mobile-body">
                      <strong>{`${request.subjectCode} - ${request.subjectTitle}`}</strong>
                      <span>{request.studentName}</span>
                      <span>{requestedDate.date}</span>
                      <span>{requestedDate.time}</span>
                    </div>

                    <button
                      type="button"
                      className="instructor-request-mobile-action"
                      onClick={() => setSelectedRequestId(request.requestId)}
                    >
                      View Request
                    </button>
                  </article>
                )
              })
            ) : (
              <div className="instructor-requests-mobile-empty">
                {getEmptyMessage(activeTab, hasActiveFilters)}
              </div>
            )}
          </div>

          <div className="instructor-requests-footer">
            <p className="instructor-requests-count">
              {filteredRequests.length
                ? `Showing ${displayStart}–${displayEnd} of ${filteredRequests.length} requests`
                : 'Showing 0 requests'}
            </p>

            <div className="instructor-requests-pagination">
              <button
                type="button"
                className="instructor-requests-pagination-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={
                    pageNumber === safeCurrentPage
                      ? 'instructor-requests-pagination-page is-active'
                      : 'instructor-requests-pagination-page'
                  }
                  onClick={() => setCurrentPage(pageNumber)}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === safeCurrentPage ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="instructor-requests-pagination-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages || !filteredRequests.length}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </button>
              <label className="instructor-requests-page-size">
                <select
                  aria-label="Requests per page"
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {[5, 10, 25].map((size) => <option key={size} value={size}>{size} / page</option>)}
                </select>
                <ChevronDownIcon />
              </label>
            </div>
          </div>
        </article>
      </section>

      {selectedRequest ? (
        <div className="request-review-overlay" onClick={() => setSelectedRequestId('')}>
          <section
            className="request-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-review-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="request-review-header">
              <div>
                <span
                  className={`instructor-request-status instructor-request-status--${getStatusTone(selectedRequest.status)}`}
                >
                  {formatStatusLabel(selectedRequest.status)}
                </span>
                <h2 id="request-review-modal-title">{selectedRequest.requestId}</h2>
              </div>

              <button
                type="button"
                className="subject-modal-close"
                onClick={() => setSelectedRequestId('')}
                aria-label="Close request details"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="request-review-body">
              <div className="request-review-detail-list">
                <div className="request-review-detail-row">
                  <span className="request-review-detail-icon" aria-hidden="true">
                    <PersonIcon />
                  </span>
                  <div>
                    <span className="request-review-detail-label">Student</span>
                    <strong>{selectedRequest.studentName}</strong>
                  </div>
                </div>

                <div className="request-review-detail-row">
                  <span className="request-review-detail-icon" aria-hidden="true">
                    <BookIcon />
                  </span>
                  <div>
                    <span className="request-review-detail-label">Subject</span>
                    <strong>{`${selectedRequest.subjectCode} - ${selectedRequest.subjectTitle}`}</strong>
                  </div>
                </div>

                <div className="request-review-detail-row">
                  <span className="request-review-detail-icon" aria-hidden="true">
                    <FileIcon />
                  </span>
                  <div>
                    <span className="request-review-detail-label">Request Type</span>
                    <strong>{selectedRequest.requestType}</strong>
                  </div>
                </div>

                <div className="request-review-detail-row">
                  <span className="request-review-detail-icon" aria-hidden="true">
                    <CalendarIcon />
                  </span>
                  <div>
                    <span className="request-review-detail-label">Date Requested</span>
                    <strong>
                      {`${formatRequestDate(selectedRequest.requestedAt).date} ${formatRequestDate(selectedRequest.requestedAt).time}`}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="request-review-message">
                <span className="request-review-detail-label">Message / Reason</span>
                <p>{selectedRequest.message || 'No message was provided for this request.'}</p>
              </div>

              {selectedRequest.status === 'PENDING' ? (
                <div className="request-review-note">
                  The student will only be able to view the requested breakdown after approval.
                </div>
              ) : (
                <div className="request-review-note">
                  <strong>{formatStatusLabel(selectedRequest.status)}</strong>
                  {selectedRequest.processedAt
                    ? ` on ${formatRequestDate(selectedRequest.processedAt).date} ${formatRequestDate(selectedRequest.processedAt).time}`
                    : ''}
                  {selectedRequest.processedByName
                    ? ` by ${selectedRequest.processedByName}.`
                    : '.'}
                </div>
              )}
            </div>

            {selectedRequest.status === 'PENDING' ? (
              <div className="request-review-footer">
                <button
                  type="button"
                  className="request-review-action request-review-action--ghost"
                  onClick={() =>
                    setReviewDialogState({
                      requestId: selectedRequest.requestId,
                      nextStatus: 'REJECTED',
                    })
                  }
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="request-review-action request-review-action--solid"
                  onClick={() =>
                    setReviewDialogState({
                      requestId: selectedRequest.requestId,
                      nextStatus: 'APPROVED',
                    })
                  }
                >
                  Approve
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {reviewDialogState && reviewTargetRequest ? (
        <div className="request-review-overlay" onClick={() => setReviewDialogState(null)}>
          <section
            className="request-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="request-review-header">
              <div>
                <h2 id="request-confirm-title">
                  {reviewDialogState.nextStatus === 'APPROVED'
                    ? 'Approve Grade Breakdown Request?'
                    : 'Reject Grade Breakdown Request?'}
                </h2>
              </div>

              <button
                type="button"
                className="subject-modal-close"
                onClick={() => setReviewDialogState(null)}
                aria-label="Close confirmation"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="request-review-body">
              <div className="request-confirm-copy">
                <p>
                  <strong>Student:</strong> {reviewTargetRequest.studentName}
                </p>
                <p>
                  <strong>Subject:</strong>{' '}
                  {`${reviewTargetRequest.subjectCode} - ${reviewTargetRequest.subjectTitle}`}
                </p>
                {reviewDialogState.nextStatus === 'APPROVED' ? (
                  <p>The student will be able to view the approved grade breakdown.</p>
                ) : (
                  <p>The request will be marked as rejected in the shared request record.</p>
                )}
              </div>
            </div>

            <div className="request-review-footer">
              <button
                type="button"
                className="request-review-action request-review-action--ghost"
                onClick={() => setReviewDialogState(null)}
                disabled={isSubmittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="request-review-action request-review-action--solid"
                onClick={handleConfirmReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview
                  ? 'Saving...'
                  : reviewDialogState.nextStatus === 'APPROVED'
                    ? 'Approve'
                    : 'Reject'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </InstructorShell>
  )
}
