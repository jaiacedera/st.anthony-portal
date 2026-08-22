import type { MouseEvent, ReactNode } from 'react'
import logoImage from '../assets/student/logo.png'
import { InstructorTopBar } from './instructor-shell'
import { StudentSideBar, type StudentSection } from './student-side-bar'
import { navigateTo } from '../utils/navigation'
import '../pages/instructor/instructor-portal.css'
import '../pages/student/student-portal.css'

type StudentShellProps = {
  active: StudentSection
  schoolYearLabel?: string
  semesterLabel?: string
  notificationCount?: number
  children: ReactNode
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function RequestsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h6.5L19 9v11.5A1.5 1.5 0 0 1 17.5 22h-10A1.5 1.5 0 0 1 6 20.5v-15A2 2 0 0 1 7 3.5Z" />
      <path d="M13 3.5V9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4.5" />
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 20a3 3 0 0 0 6 0" />
      <path d="M5 17h14l-1.4-2.2A5.6 5.6 0 0 1 17 11.8V10a5 5 0 0 0-10 0v1.8c0 1-.3 2-.8 3L5 17Z" />
    </svg>
  )
}

function renderMobileNavIcon(section: StudentSection) {
  if (section === 'dashboard') {
    return <DashboardIcon />
  }

  if (section === 'requests') {
    return <RequestsIcon />
  }

  return <ProfileIcon />
}

export function StudentShell({
  active,
  schoolYearLabel,
  semesterLabel,
  notificationCount = 0,
  children,
}: StudentShellProps) {
  const isViewportPage = active === 'dashboard' || active === 'profile'

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault()
    navigateTo(href)
  }

  const navItems: Array<{ key: StudentSection; label: string; href: string }> = [
    { key: 'dashboard', label: 'Dashboard', href: '/student/dashboard' },
    { key: 'requests', label: 'Requests', href: '/student/requests' },
    { key: 'profile', label: 'Profile', href: '/student/profile' },
  ]

  return (
    <main
      className={
        isViewportPage
          ? 'instructor-portal-page instructor-portal-page--dashboard student-portal-page'
          : 'instructor-portal-page student-portal-page'
      }
    >
      <StudentSideBar active={active} />
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
          <header className="student-mobile-header">
            <div className="student-mobile-brand">
              <img
                src={logoImage}
                alt="St. Anthony College crest"
                className="student-mobile-brand-logo"
              />
              <div className="student-mobile-brand-copy">
                <h1>St. Anthony College</h1>
                <p>CALAPAN CITY INC.</p>
              </div>
            </div>

            <div className="student-mobile-header-actions">
              <button
                className="student-mobile-header-button"
                type="button"
                aria-label="Notifications"
                onClick={() => navigateTo('/student/requests')}
              >
                <BellIcon />
                {notificationCount > 0 ? (
                  <span className="student-mobile-badge">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                ) : null}
              </button>

              <button
                className="student-mobile-header-button student-mobile-header-button--profile"
                type="button"
                aria-label="Profile"
                onClick={() => navigateTo('/student/profile')}
              >
                <ProfileIcon />
              </button>
            </div>
          </header>

          <div className={`student-page-surface student-page-surface--${active}`}>
            {children}
          </div>
        </div>
      </section>

      <nav className="student-mobile-nav" aria-label="Student mobile navigation">
        {navItems.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={item.key === active ? 'student-mobile-nav-link active' : 'student-mobile-nav-link'}
            onClick={(event) => handleNavigate(event, item.href)}
          >
            <span className="student-mobile-nav-icon">{renderMobileNavIcon(item.key)}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </main>
  )
}
