import { useState, type MouseEvent, type ReactNode } from 'react'
import { PortalHeader, type PortalSearchProps } from './portal-header'

import { StudentSideBar, type StudentSection } from './student-side-bar'
import logoImage from '../assets/student/logo.png'
import { navigateTo } from '../utils/navigation'
import '../pages/instructor/instructor-portal.css'
import '../pages/student/student-portal.css'

type StudentShellProps = PortalSearchProps & {
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
  searchValue,
  onSearchChange,
}: StudentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  const isViewportPage = active === 'dashboard' || active === 'profile'
  const isDashboardPage = active === 'dashboard'

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
      className={'portal-shell ' + (sidebarOpen ? '' : 'portal-shell--collapsed ') + (
        isViewportPage
          ? `instructor-portal-page instructor-portal-page--dashboard student-portal-page${
              isDashboardPage ? ' student-portal-page--dashboard-active' : ''
            }`
          : 'instructor-portal-page student-portal-page'
      )}
    >
        <header className="student-mobile-header">
          <div className="student-mobile-brand">
            <img src={logoImage} alt="St. Anthony College crest" className="student-mobile-brand-logo" />
            <div className="student-mobile-brand-copy">
              <h1>St. Anthony College</h1>
              <p>CALAPAN CITY INC.</p>
            </div>
          </div>

          <div className="student-mobile-header-actions">
            <a className="student-mobile-header-button" href="/student/requests" aria-label="View requests">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {notificationCount > 0 && <span className="student-mobile-badge">{notificationCount}</span>}
            </a>
            <a className="student-mobile-header-button student-mobile-header-button--profile" href="/student/profile" aria-label="Your profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="7" r="5" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            </a>
          </div>
        </header>

      {sidebarOpen && <StudentSideBar active={active} />}
      <section
        className={
          isViewportPage
            ? 'instructor-main-panel instructor-main-panel--dashboard'
            : 'instructor-main-panel'
        }
      >
        <PortalHeader portal="student" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(open => !open)} notificationCount={notificationCount} searchValue={searchValue} onSearchChange={onSearchChange}
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
