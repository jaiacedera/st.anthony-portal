import { useEffect, useState } from 'react'
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

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v17H6a2.5 2.5 0 0 0-2.5 2" />
      <path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v17H18a2.5 2.5 0 0 1 2.5 2" />
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  )
}

function RoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

function CalendarRangeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.8v4" />
      <path d="M16 2.8v4" />
      <path d="M3 9.5h18" />
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

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
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

export default function StudentDashboardPage() {
  const auth = readStudentAuth()
  const hasStudentIdentity = Boolean(auth?.studentId || auth?.email || auth?.username)
  const sessionErrorMessage = hasStudentIdentity
    ? ''
    : 'No student session was found. Please sign in again.'
  const [dashboard, setDashboard] = useState<StudentDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
            : 'Unable to load student dashboard data.',
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

  const overviewCards = [
    {
      key: 'enrolled',
      value: isLoading ? '...' : String(dashboard?.stats.enrolledSubjectCount ?? 0),
      title: 'Enrolled Subjects',
      subtitle: 'This Semester',
      tone: 'rose',
      icon: <BookIcon />,
    },
    {
      key: 'current-gwa',
      value: isLoading ? '...' : dashboard?.stats.currentGwa || '--',
      title: 'General Weighted Average',
      subtitle: 'This Semester',
      tone: 'mint',
      icon: <TrendIcon />,
    },
    {
      key: 'requests',
      value: isLoading ? '...' : String(dashboard?.stats.pendingRequestCount ?? 0),
      title: 'Pending Requests',
      subtitle: 'For Approval',
      tone: 'amber',
      icon: <ClipboardIcon />,
    },
    {
      key: 'overall-gwa',
      value: isLoading ? '...' : dashboard?.stats.overallGwa || '--',
      title: 'General Weighted Average',
      subtitle: 'Overall',
      tone: 'blue',
      icon: <GraduationIcon />,
    },
  ] as const

  return (
    <StudentShell
      active="dashboard"
      schoolYearLabel={dashboard?.header.schoolYear ?? 'Loading...'}
      semesterLabel={dashboard?.header.semester ?? 'Loading...'}
      notificationCount={dashboard?.stats.pendingRequestCount ?? 0}
    >
      <div className="student-dashboard">
        {sessionErrorMessage || errorMessage ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            <section className="dashboard-alert-row">
              <div className="dashboard-alert">{sessionErrorMessage || errorMessage}</div>
            </section>
          </div>
        ) : null}

        <section className="student-mobile-filters" aria-label="Dashboard filters">
          <article className="student-mobile-filter-card">
            <span className="student-mobile-filter-icon" aria-hidden="true">
              <CalendarRangeIcon />
            </span>
            <div className="student-mobile-filter-copy">
              <span className="student-mobile-filter-label">School Year</span>
              <strong className="student-mobile-filter-value">
                {dashboard?.header.schoolYear ?? 'Loading...'}
              </strong>
            </div>
            <span className="student-mobile-filter-chevron" aria-hidden="true">
              <ChevronDownIcon />
            </span>
          </article>

          <article className="student-mobile-filter-card">
            <span className="student-mobile-filter-icon" aria-hidden="true">
              <BookIcon />
            </span>
            <div className="student-mobile-filter-copy">
              <span className="student-mobile-filter-label">Semester</span>
              <strong className="student-mobile-filter-value">
                {dashboard?.header.semester ?? 'Loading...'}
              </strong>
            </div>
            <span className="student-mobile-filter-chevron" aria-hidden="true">
              <ChevronDownIcon />
            </span>
          </article>
        </section>

        <section className="student-dashboard-stats" aria-label="Student dashboard overview">
          {overviewCards.map((card) => (
            <article key={card.key} className={`student-overview-card student-overview-card--${card.tone}`}>
              <div className="student-overview-card-inner">
                <span className={`student-overview-icon student-overview-icon--${card.tone}`}>{card.icon}</span>
                <div className="student-overview-copy">
                  <strong className="student-overview-value">{card.value}</strong>
                  <span className="student-overview-title">{card.title}</span>
                  <span className="student-overview-subtitle">{card.subtitle}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="instructor-panel student-subjects-card">
          <header className="student-subjects-header">
            <span className="student-panel-lead" aria-hidden="true">
              <BookIcon />
            </span>
            <div>
              <h2>My Subjects</h2>
              <span className="student-panel-underline"></span>
            </div>
            <span className="student-subjects-view-all">
              <span>View All</span>
              <ChevronRightIcon />
            </span>
          </header>

          <div className="student-mobile-subjects-list">
            {hasStudentIdentity && isLoading ? (
              <div className="student-dashboard-empty">Loading student subjects...</div>
            ) : dashboard?.subjects.length ? (
              dashboard.subjects.map((subject, index) => (
                <article key={`${subject.subjectId}-mobile`} className="student-mobile-subject-card">
                  <div className="student-mobile-subject-top">
                    <div className="student-mobile-subject-main">
                      <span
                        className={
                          index % 3 === 0
                            ? 'student-subject-swatch student-subject-swatch--rose'
                            : index % 3 === 1
                              ? 'student-subject-swatch student-subject-swatch--mint'
                              : 'student-subject-swatch student-subject-swatch--slate'
                        }
                        aria-hidden="true"
                      ></span>

                      <div className="student-mobile-subject-copy">
                        <strong>{subject.subjectCode}</strong>
                        <span>{subject.subjectName}</span>
                        <small className="student-mobile-subject-instructor">
                          <PersonIcon />
                          <span>{subject.instructorName}</span>
                        </small>
                      </div>
                    </div>

                    <div className="student-mobile-grade">
                      <span
                        className={
                          subject.hasPostedGrade
                            ? 'student-grade-pill'
                            : 'student-grade-pill student-grade-pill--muted'
                        }
                      >
                        {subject.grade}
                      </span>
                      <span className="student-grade-label">{subject.gradeLabel}</span>
                    </div>
                  </div>

                  <div className="student-mobile-subject-footer">
                    <span className="student-inline-meta">
                      <ClockIcon />
                      <span>{subject.schedule}</span>
                    </span>

                    <span className="student-inline-meta">
                      <RoomIcon />
                      <span>{subject.room}</span>
                    </span>

                    <button type="button" className="student-row-action" aria-label={`More actions for ${subject.subjectCode}`}>
                      <MoreIcon />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="student-dashboard-empty">
                No enrolled subjects found for this student yet.
              </div>
            )}
          </div>

          <div className="student-subjects-table">
            <div className="student-subjects-table-head">
              <span>Subject Code</span>
              <span>Subject Title</span>
              <span>Instructor</span>
              <span>Schedule</span>
              <span>Room</span>
              <span>Grade</span>
              <span aria-hidden="true"></span>
            </div>

            <div className="student-subjects-table-body">
              {hasStudentIdentity && isLoading ? (
                <div className="student-dashboard-empty">Loading student subjects...</div>
              ) : dashboard?.subjects.length ? (
                dashboard.subjects.map((subject, index) => (
                  <div key={subject.subjectId} className="student-subject-row">
                    <div className="student-subject-code-cell">
                      <span
                        className={
                          index % 3 === 0
                            ? 'student-subject-swatch student-subject-swatch--rose'
                            : index % 3 === 1
                              ? 'student-subject-swatch student-subject-swatch--mint'
                              : 'student-subject-swatch student-subject-swatch--slate'
                        }
                        aria-hidden="true"
                      ></span>
                      <strong>{subject.subjectCode}</strong>
                    </div>

                    <span className="student-subject-title">{subject.subjectName}</span>
                    <span className="student-subject-text">{subject.instructorName}</span>

                    <span className="student-inline-meta">
                      <ClockIcon />
                      <span>{subject.schedule}</span>
                    </span>

                    <span className="student-inline-meta">
                      <RoomIcon />
                      <span>{subject.room}</span>
                    </span>

                    <div className="student-grade-cell">
                      <span className={subject.hasPostedGrade ? 'student-grade-pill' : 'student-grade-pill student-grade-pill--muted'}>
                        {subject.grade}
                      </span>
                      <span className="student-grade-label">{subject.gradeLabel}</span>
                    </div>

                    <button type="button" className="student-row-action" aria-label={`More actions for ${subject.subjectCode}`}>
                      <MoreIcon />
                    </button>
                  </div>
                ))
              ) : (
                <div className="student-dashboard-empty">
                  No enrolled subjects found for this student yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </StudentShell>
  )
}
