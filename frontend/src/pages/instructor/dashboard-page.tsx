import { useEffect, useState, type ReactNode } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  fetchInstructorDashboard,
  type InstructorDashboardPayload,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'

function SubjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="1.8" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 15 5-5 4 4 7-7" />
      <path d="M13 7h7v7" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="5" width="12" height="16" rx="1.8" />
      <path d="M9 5.5h6a1.5 1.5 0 0 0-3-1.5h0a1.5 1.5 0 0 0-3 1.5Z" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
    </svg>
  )
}

function GraduationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5Z" />
      <path d="M7 10.6v4.1c0 1.3 2.3 3.3 5 3.3s5-2 5-3.3v-4.1" />
      <path d="M21 10v6" />
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

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function PanelLead() {
  return (
    <span className="instructor-panel-lead" aria-hidden="true">
      <BookIcon />
      <span className="instructor-panel-underline"></span>
    </span>
  )
}

function SkeletonStatCard({
  title,
  subtitle,
  className,
  icon,
}: {
  title: string
  subtitle: string
  className: string
  icon: ReactNode
}) {
  return (
    <article className="instructor-stat-card">
      <span className={`instructor-stat-icon ${className}`}>{icon}</span>
      <div>
        <div className="dashboard-skeleton dashboard-skeleton--number" />
        <div className="instructor-stat-title">{title}</div>
        <div className="instructor-stat-subtitle">{subtitle}</div>
      </div>
    </article>
  )
}

const statConfig = [
  {
    key: 'subjectCount',
    title: 'My Subjects',
    subtitle: 'This Semester',
    className: 'stat-icon--rose',
    icon: <SubjectsIcon />,
  },
  {
    key: 'studentCount',
    title: 'Total Students',
    subtitle: 'This Semester',
    className: 'stat-icon--mint',
    icon: <TrendIcon />,
  },
  {
    key: 'gradesPostedCount',
    title: 'Grades Posted',
    subtitle: 'This Semester',
    className: 'stat-icon--amber',
    icon: <ClipboardIcon />,
  },
  {
    key: 'pendingRequestCount',
    title: 'Pending Grade Request',
    subtitle: 'Overall',
    className: 'stat-icon--blue',
    icon: <GraduationIcon />,
  },
] as const

function renderPanelState(message: string) {
  return <div className="dashboard-empty-state">{message}</div>
}

export default function DashboardPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const [dashboard, setDashboard] = useState<InstructorDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!username) {
      setIsLoading(false)
      setErrorMessage('No instructor session was found. Please sign in again.')
      return
    }

    const abortController = new AbortController()

    setIsLoading(true)
    setErrorMessage('')

    fetchInstructorDashboard(username, abortController.signal)
      .then((payload) => {
        setDashboard(payload)
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor dashboard data.',
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

  const dashboardAlerts = [
    errorMessage,
    dashboard?.needsBinding
      ? dashboard.message ??
        'This instructor account still needs to be linked to a Google Sheets instructor record.'
      : '',
  ].filter(Boolean)
  const isSubjectsEmpty = !isLoading && !dashboard?.previews.subjects.length
  const isGradePostingEmpty = !isLoading && !dashboard?.previews.gradePosting.length
  const isBreakdownEmpty = !isLoading && !dashboard?.previews.pendingRequests.length

  return (
    <InstructorShell
      active="dashboard"
      schoolYearLabel={dashboard?.header.schoolYear ?? 'Loading...'}
      semesterLabel={dashboard?.header.semester ?? 'Loading...'}
    >
      <div className="instructor-dashboard">
        {dashboardAlerts.length ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            {dashboardAlerts.map((message, index) => (
              <section key={`${message}-${index}`} className="dashboard-alert-row">
                <div className="dashboard-alert">{message}</div>
              </section>
            ))}
          </div>
        ) : null}

        <section className="dashboard-stats" aria-label="Instructor dashboard overview">
          {isLoading
            ? statConfig.map((item) => (
                <SkeletonStatCard
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  className={item.className}
                  icon={item.icon}
                />
              ))
            : statConfig.map((item) => (
                <article key={item.key} className="instructor-stat-card">
                  <span className={`instructor-stat-icon ${item.className}`}>{item.icon}</span>
                  <div>
                    <div className="instructor-stat-value">
                      {dashboard?.stats[item.key] ?? 0}
                    </div>
                    <div className="instructor-stat-title">{item.title}</div>
                    <div className="instructor-stat-subtitle">{item.subtitle}</div>
                  </div>
                </article>
              ))}
        </section>

        <section className="dashboard-panels">
          <article className="instructor-panel subject-management subject-management-card">
            <div className="instructor-panel-header">
              <PanelLead />
              <h2>Subject Management</h2>
            </div>

            <div className="instructor-panel-body">
              <div className="instructor-table-head table-layout--subjects">
                <span>Code</span>
                <span>Subject Title</span>
                <span>Students</span>
                <span>Actions</span>
              </div>

              <div className={isSubjectsEmpty ? 'dashboard-panel-content is-empty' : 'dashboard-panel-content'}>
                {isLoading ? (
                  <div className="dashboard-loading-block">
                    <div className="dashboard-loading-row" />
                    <div className="dashboard-loading-row" />
                    <div className="dashboard-loading-row" />
                  </div>
                ) : dashboard?.previews.subjects.length ? (
                  dashboard.previews.subjects.map((subject) => (
                    <div
                      key={subject.subjectId}
                      className="instructor-table-row table-layout--subjects subject-row"
                    >
                      <span className="course-pill">{subject.subjectCode}</span>
                      <div>
                        <div className="course-title">{subject.subjectName}</div>
                        <div className="course-meta">{subject.schedule}</div>
                      </div>
                      <span className="table-stat">{subject.studentCount}</span>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-action-button"
                          aria-label={`Add students to ${subject.subjectName}`}
                        >
                          <UserPlusIcon />
                        </button>
                        <a
                          className="icon-action-button"
                          href="/instructor/subjects"
                          aria-label={`View ${subject.subjectName}`}
                        >
                          <FolderIcon />
                        </a>
                        <button
                          type="button"
                          className="icon-action-button"
                          aria-label={`More options for ${subject.subjectName}`}
                        >
                          <MoreIcon />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  renderPanelState('No subjects created yet.')
                )}
              </div>
            </div>

            <div className="instructor-panel-footer">
              <a href="/instructor/subjects">View All Subjects</a>
            </div>
          </article>

          <div className="dashboard-right-column">
            <article className="instructor-panel grade-posting grade-posting-card">
              <div className="instructor-panel-header">
                <PanelLead />
                <h2>Grade Posting</h2>
              </div>

              <div className="instructor-panel-body">
                <div className="instructor-table-head table-layout--grades">
                  <span>Subject</span>
                  <span>Title</span>
                  <span>Students</span>
                  <span>Action</span>
                </div>

                <div className={isGradePostingEmpty ? 'dashboard-panel-content is-empty' : 'dashboard-panel-content'}>
                  {isLoading ? (
                    <div className="dashboard-loading-block">
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                    </div>
                  ) : dashboard?.previews.gradePosting.length ? (
                    dashboard.previews.gradePosting.map((subject) => (
                      <div
                        key={subject.subjectId}
                        className="instructor-table-row table-layout--grades grade-row"
                      >
                        <span className="course-pill course-pill--compact">{subject.subjectCode}</span>
                        <span className="course-title">{subject.subjectName}</span>
                        <span className="table-stat">{subject.studentCount}</span>
                        <a className="post-grade-button" href="/instructor/grades">
                          Post Grades
                        </a>
                      </div>
                    ))
                  ) : (
                    renderPanelState('No subjects available for grade posting.')
                  )}
                </div>
              </div>

              <div className="instructor-panel-footer">
                <a href="/instructor/grades">View All Subjects</a>
              </div>
            </article>

            <article className="instructor-panel breakdown-request breakdown-request-card">
              <div className="instructor-panel-header">
                <PanelLead />
                <h2>Breakdown Request</h2>
              </div>

              <div className="instructor-panel-body">
                <div className="instructor-table-head table-layout--requests">
                  <span>Student</span>
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                <div className={isBreakdownEmpty ? 'dashboard-panel-content is-empty' : 'dashboard-panel-content'}>
                  {isLoading ? (
                    <div className="dashboard-loading-block">
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                    </div>
                  ) : dashboard?.previews.pendingRequests.length ? (
                    dashboard.previews.pendingRequests.map((request) => (
                      <div
                        key={request.requestId}
                        className="instructor-table-row table-layout--requests request-row"
                      >
                        <span className="course-title">{request.studentName}</span>
                        <span className="course-pill course-pill--compact">{request.subjectCode}</span>
                        <span
                          className={
                            request.status.toUpperCase() === 'PENDING'
                              ? 'request-status'
                              : 'request-status request-status--neutral'
                          }
                        >
                          {request.status}
                        </span>
                        <div className="request-actions">
                          <button type="button" className="request-action request-action--approve">
                            <CheckIcon />
                            <span>Approve</span>
                          </button>
                          <button type="button" className="request-action request-action--reject">
                            <XIcon />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    renderPanelState('No pending breakdown requests.')
                  )}
                </div>
              </div>

              <div className="instructor-panel-footer">
                <a href="/instructor/requests">View All Requests</a>
              </div>
            </article>
          </div>
        </section>
      </div>
    </InstructorShell>
  )
}
