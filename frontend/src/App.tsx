import { useEffect, useState } from 'react'
import InstructorAuthPage from './pages/instructor/instructor-auth-page'
import DashboardPage from './pages/instructor/dashboard-page'
import GradesPage from './pages/instructor/grades-page'
import InstructorProfilePage from './pages/instructor/instructor-profile'
import RequestsPage from './pages/instructor/requests-page'
import StudentsPage from './pages/instructor/students-page'
import SubjectsPage from './pages/instructor/subjects-page'
import StudentDashboardPage from './pages/student/dashboard-page'
import StudentRequestPage from './pages/student/request-page'
import StudentAuthPage from './pages/student/student-auth-page'
import StudentForgotPasswordPage from './pages/student/student-forgot-password-page'
import StudentProfilePage from './pages/student/student-profile'
import StudentResetPasswordPage from './pages/student/student-reset-password-page'
import { readInstructorAuth } from './utils/instructorAuth'
import { APP_NAVIGATE_EVENT, navigateTo } from './utils/navigation'
import { readStudentAuth } from './utils/studentAuth'

function getInstructorAuth() {
  return readInstructorAuth()
}

function getStudentAuth() {
  return readStudentAuth()
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/')
  const isInstructorSignedIn = Boolean(getInstructorAuth())
  const isStudentSignedIn = Boolean(getStudentAuth())

  useEffect(() => {
    function syncPathname() {
      setPathname(window.location.pathname.replace(/\/+$/, '') || '/')
    }

    window.addEventListener('popstate', syncPathname)
    window.addEventListener(APP_NAVIGATE_EVENT, syncPathname)

    return () => {
      window.removeEventListener('popstate', syncPathname)
      window.removeEventListener(APP_NAVIGATE_EVENT, syncPathname)
    }
  }, [])

  if (pathname.startsWith('/instructor/') && pathname !== '/instructor' && !isInstructorSignedIn) {
    navigateTo('/instructor', { replace: true })
    return null
  }

  if (pathname === '/instructor' && isInstructorSignedIn) {
    navigateTo('/instructor/dashboard', { replace: true })
    return null
  }

  const isStudentPublicAuthPath =
    pathname === '/student' ||
    pathname === '/student/forgot-password' ||
    pathname === '/student/reset-password'

  if (pathname.startsWith('/student/') && !isStudentPublicAuthPath && !isStudentSignedIn) {
    navigateTo('/student', { replace: true })
    return null
  }

  if (pathname === '/student' && isStudentSignedIn) {
    navigateTo('/student/dashboard', { replace: true })
    return null
  }

  if (pathname === '/instructor/dashboard') {
    return <DashboardPage />
  }

  if (pathname === '/instructor/subjects') {
    return <SubjectsPage />
  }

  if (pathname === '/instructor/students') {
    return <StudentsPage />
  }

  if (pathname === '/instructor/grades') {
    return <GradesPage />
  }

  if (pathname === '/instructor/requests') {
    return <RequestsPage />
  }

  if (pathname === '/instructor/profile') {
    return <InstructorProfilePage />
  }

  if (pathname === '/instructor') {
    return <InstructorAuthPage />
  }

  if (pathname === '/student/dashboard') {
    return <StudentDashboardPage />
  }

  if (pathname === '/student/requests') {
    return <StudentRequestPage />
  }

  if (pathname === '/student/profile') {
    return <StudentProfilePage />
  }

  if (pathname === '/student/forgot-password') {
    return <StudentForgotPasswordPage />
  }

  if (pathname === '/student/reset-password') {
    return <StudentResetPasswordPage />
  }

  if (pathname === '/student') {
    return <StudentAuthPage />
  }

  return <StudentAuthPage />
}

export default App
