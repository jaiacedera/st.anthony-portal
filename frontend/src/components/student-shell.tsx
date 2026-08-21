import type { ReactNode } from 'react'
import { InstructorTopBar } from './instructor-shell'
import { StudentSideBar, type StudentSection } from './student-side-bar'
import '../pages/instructor/instructor-portal.css'
import '../pages/student/student-portal.css'

type StudentShellProps = {
  active: StudentSection
  schoolYearLabel?: string
  semesterLabel?: string
  children: ReactNode
}

export function StudentShell({
  active,
  schoolYearLabel,
  semesterLabel,
  children,
}: StudentShellProps) {
  const isViewportPage = active === 'dashboard' || active === 'profile'

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
          {children}
        </div>
      </section>
    </main>
  )
}
