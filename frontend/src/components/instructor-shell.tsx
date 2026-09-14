import { useState, type ReactNode } from 'react'
import { InstructorSidebar, type InstructorSection } from './instructor-sidebar'
import { PortalHeader, type PortalSearchProps } from './portal-header'
import '../pages/instructor/instructor-portal.css'

type InstructorShellProps = PortalSearchProps & {
  active: InstructorSection
  schoolYearLabel?: string
  semesterLabel?: string
  children: ReactNode
}

export function InstructorShell({ active, schoolYearLabel, semesterLabel, children, searchValue, onSearchChange }: InstructorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  const isViewportPage = active === 'dashboard' || active === 'profile'
  return (
    <main className={[
      'instructor-portal-page portal-shell',
      isViewportPage ? 'instructor-portal-page--dashboard' : '',
      !sidebarOpen ? 'portal-shell--collapsed' : '',
    ].filter(Boolean).join(' ')}>
      {sidebarOpen && <InstructorSidebar active={active} />}
      <section className={isViewportPage ? 'instructor-main-panel instructor-main-panel--dashboard' : 'instructor-main-panel'}>
        <PortalHeader portal="instructor" schoolYearLabel={schoolYearLabel} semesterLabel={semesterLabel} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(open => !open)} searchValue={searchValue} onSearchChange={onSearchChange} />
        <div className={isViewportPage ? 'instructor-main-content instructor-main-content--dashboard' : 'instructor-main-content'}>{children}</div>
      </section>
    </main>
  )
}
