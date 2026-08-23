import type { ReactNode } from 'react'
import { InstructorSidebar, type InstructorSection } from './instructor-sidebar'
import '../pages/instructor/instructor-portal.css'

type InstructorShellProps = {
  active: InstructorSection
  schoolYearLabel?: string
  semesterLabel?: string
  children: ReactNode
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.8v4" />
      <path d="M16 2.8v4" />
      <path d="M3 9.5h18" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 20a3 3 0 0 0 6 0" />
      <path d="M5 17h14l-1.4-2.2A5.6 5.6 0 0 1 17 11.8V10a5 5 0 0 0-10 0v1.8c0 1-.3 2-.8 3L5 17Z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a8.5 8.5 0 0 1 15 0" />
    </svg>
  )
}

export function InstructorTopBar({
  schoolYearLabel = 'Not set',
  semesterLabel = 'Not set',
}: {
  schoolYearLabel?: string
  semesterLabel?: string
}) {
  return (
    <header className="instructor-header">
      <div className="instructor-toolbar">
        <div className="instructor-filter-card">
          <span className="instructor-filter-icon">
            <CalendarIcon />
          </span>
          <div>
            <span className="instructor-filter-label">Semester</span>
            <strong className="instructor-filter-value">{schoolYearLabel}</strong>
          </div>
        </div>

        <div className="instructor-filter-card">
          <span className="instructor-filter-icon">
            <BookIcon />
          </span>
          <div>
            <span className="instructor-filter-label">Semester</span>
            <strong className="instructor-filter-value">{semesterLabel}</strong>
          </div>
        </div>

        <button className="instructor-toolbar-button" type="button" aria-label="Notifications">
          <BellIcon />
        </button>

        <button className="instructor-toolbar-button instructor-toolbar-profile" type="button" aria-label="Profile">
          <ProfileIcon />
        </button>
      </div>
    </header>
  )
}

export function InstructorShell({
  active,
  schoolYearLabel,
  semesterLabel,
  children,
}: InstructorShellProps) {
  const isViewportPage = active === 'dashboard' || active === 'profile'

  return (
    <main
      className={[
        'instructor-portal-page',
        isViewportPage ? 'instructor-portal-page--dashboard' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <InstructorSidebar active={active} />
      <section
        className={
          isViewportPage
            ? 'instructor-main-panel instructor-main-panel--dashboard'
            : 'instructor-main-panel'
        }
      >
        <InstructorTopBar
          schoolYearLabel={schoolYearLabel}
          semesterLabel={semesterLabel}
        />
        <div
          className={
            isViewportPage
              ? 'instructor-main-content instructor-main-content--dashboard'
              : 'instructor-main-content'
          }
        >
          {children}
        </div>
      </section>
    </main>
  )
}
