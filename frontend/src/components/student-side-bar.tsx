import logoImage from '../assets/student/logo.png'

export type StudentSection = 'dashboard' | 'requests' | 'profile'

type StudentSideBarProps = {
  active: StudentSection
}

type StudentNavItem = {
  key: StudentSection
  label: string
  href: string
}

const navItems: StudentNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/student/dashboard' },
  { key: 'requests', label: 'Requests', href: '/student/requests' },
  { key: 'profile', label: 'Profile', href: '/student/profile' },
]

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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H9" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function renderIcon(section: StudentSection) {
  if (section === 'dashboard') {
    return <DashboardIcon />
  }

  if (section === 'requests') {
    return <RequestsIcon />
  }

  return <ProfileIcon />
}

export function StudentSideBar({ active }: StudentSideBarProps) {
  function handleLogout() {
    window.localStorage.removeItem('student-auth')
    window.sessionStorage.removeItem('student-auth')
  }

  return (
    <aside className="instructor-sidebar student-sidebar">
      <div className="instructor-sidebar-brand">
        <img src={logoImage} alt="St. Anthony College crest" className="instructor-sidebar-logo" />
        <div className="instructor-sidebar-title">
          <h1>St. Anthony College</h1>
          <p>CALAPAN CITY INC.</p>
        </div>
      </div>

      <nav className="instructor-sidebar-nav student-sidebar-nav" aria-label="Student portal navigation">
        {navItems.map((item) => (
          <a
            key={item.key}
            className={item.key === active ? 'instructor-nav-link active' : 'instructor-nav-link'}
            href={item.href}
          >
            <span className="instructor-nav-icon">{renderIcon(item.key)}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <a className="instructor-logout-link" href="/student" onClick={handleLogout}>
        <span className="instructor-nav-icon">
          <LogoutIcon />
        </span>
        <span>Logout</span>
      </a>
    </aside>
  )
}
