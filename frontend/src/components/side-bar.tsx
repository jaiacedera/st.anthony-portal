import logoImage from '../assets/student/logo.png'

export type InstructorSection =
  | 'dashboard'
  | 'subjects'
  | 'students'
  | 'grades'
  | 'requests'
  | 'profile'

type SideBarProps = {
  active: InstructorSection
}

type NavItem = {
  key: InstructorSection
  label: string
  href: string
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/instructor/dashboard' },
  { key: 'subjects', label: 'Subjects', href: '/instructor/subjects' },
  { key: 'students', label: 'Students', href: '/instructor/students' },
  { key: 'grades', label: 'Grades', href: '/instructor/grades' },
  { key: 'requests', label: 'Requests', href: '/instructor/requests' },
  { key: 'profile', label: 'Profile', href: '/instructor/profile' },
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

function SubjectsIcon() {
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
      <path d="M9 17h6" />
    </svg>
  )
}

function StudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="2.6" />
      <circle cx="5.5" cy="11" r="1.7" />
      <circle cx="18.5" cy="11" r="1.7" />
      <path d="M8 18.5v-1a4 4 0 0 1 8 0v1" />
      <path d="M2.8 18.5v-.5A3.2 3.2 0 0 1 6 14.8" />
      <path d="M21.2 18.5v-.5a3.2 3.2 0 0 0-3.2-3.2" />
    </svg>
  )
}

function GradesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="11" width="3.2" height="9" rx="0.8" />
      <rect x="10.4" y="6" width="3.2" height="14" rx="0.8" />
      <rect x="16.8" y="2.5" width="3.2" height="17.5" rx="0.8" />
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
      <path d="M9 9.5h1.5" />
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

function renderIcon(section: InstructorSection) {
  if (section === 'dashboard') {
    return <DashboardIcon />
  }

  if (section === 'subjects') {
    return <SubjectsIcon />
  }

  if (section === 'students') {
    return <StudentsIcon />
  }

  if (section === 'grades') {
    return <GradesIcon />
  }

  if (section === 'requests') {
    return <RequestsIcon />
  }

  if (section === 'profile') {
    return <ProfileIcon />
  }

  return <FileIcon />
}

export function SideBar({ active }: SideBarProps) {
  function handleLogout() {
    window.localStorage.removeItem('instructor-auth')
    window.sessionStorage.removeItem('instructor-auth')
  }

  return (
    <aside className="instructor-sidebar">
      <div className="instructor-sidebar-brand">
        <img src={logoImage} alt="St. Anthony College crest" className="instructor-sidebar-logo" />
        <div className="instructor-sidebar-title">
          <h1>St. Anthony College</h1>
          <p>CALAPAN CITY INC.</p>
        </div>
      </div>

      <nav className="instructor-sidebar-nav" aria-label="Instructor portal navigation">
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

      <a className="instructor-logout-link" href="/instructor" onClick={handleLogout}>
        <span className="instructor-nav-icon">
          <LogoutIcon />
        </span>
        <span>Logout</span>
      </a>
    </aside>
  )
}
