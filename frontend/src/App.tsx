import InstructorAuthPage from './pages/instructor/instructor-auth-page'
import DashboardPage from './pages/instructor/dashboard-page'
import GradesPage from './pages/instructor/grades-page'
import InstructorProfilePage from './pages/instructor/instructor-profile'
import RequestsPage from './pages/instructor/requests-page'
import StudentsPage from './pages/instructor/students-page'
import SubjectsPage from './pages/instructor/subjects-page'
import StudentAuthPage from './pages/student/student-auth-page'
import { readInstructorAuth } from './utils/instructorAuth'

function getInstructorAuth() {
  return readInstructorAuth()
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  const isInstructorSignedIn = Boolean(getInstructorAuth())

  if (pathname.startsWith('/instructor/') && pathname !== '/instructor' && !isInstructorSignedIn) {
    window.location.replace('/instructor')
    return null
  }

  if (pathname === '/instructor' && isInstructorSignedIn) {
    window.location.replace('/instructor/dashboard')
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

  return <StudentAuthPage />
}

export default App
