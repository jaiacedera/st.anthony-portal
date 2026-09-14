import { useState } from 'react'

export type PortalSearchProps = {
  searchValue?: string
  onSearchChange?: (value: string) => void
}

type PortalHeaderProps = PortalSearchProps & {
  portal: 'instructor' | 'student'
  schoolYearLabel?: string
  semesterLabel?: string
  notificationCount?: number
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function PortalHeader({
  portal, schoolYearLabel = 'Not set', semesterLabel = 'Not set',
  notificationCount = 0, sidebarOpen, onToggleSidebar, searchValue, onSearchChange,
}: PortalHeaderProps) {
  const [query, setQuery] = useState('')
  const value = searchValue ?? query

  return (
    <header className="portal-header">
      <button type="button" className="portal-header-button" aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={sidebarOpen} onClick={onToggleSidebar}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18" /></svg>
      </button>
      <form className="portal-header-search" role="search" onSubmit={event => {
        event.preventDefault()
        if (!onSearchChange) {
          const destination = portal === 'instructor' ? '/instructor/students' : '/student/dashboard'
          window.location.assign(`${destination}?q=${encodeURIComponent(value.trim())}`)
        }
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg>
        <input type="search" aria-label={portal === 'instructor' ? 'Search students or subjects' : 'Search your subjects'} placeholder={portal === 'instructor' ? 'Search students or subjects...' : 'Search your subjects...'} value={value} onChange={event => { setQuery(event.target.value); onSearchChange?.(event.target.value) }} />
      </form>
      <div className="portal-header-semester">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16M8 14h3m3 0h3m-9 3h3" /></svg>
        <div><span>Semester</span><strong>{semesterLabel}, AY {schoolYearLabel}</strong></div>
      </div>
      <a className="portal-header-button portal-header-notifications" href={`/${portal}/requests`} aria-label="View requests">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {notificationCount > 0 && <span className="portal-header-dot" />}
      </a>
      <a className="portal-header-button portal-header-profile" href={`/${portal}/profile`} aria-label="Your profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></svg>
      </a>
    </header>
  )
}
