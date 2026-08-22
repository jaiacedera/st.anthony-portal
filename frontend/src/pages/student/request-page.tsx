import { useEffect } from 'react'
import { StudentShell } from '../../components/student-shell'
import { fetchStudentDashboard } from '../../services/studentApi'
import { navigateTo } from '../../utils/navigation'
import {
  clearStudentAuth,
  isInvalidStudentSessionMessage,
  readStudentAuth,
} from '../../utils/studentAuth'

export default function StudentRequestPage() {
  const auth = readStudentAuth()

  useEffect(() => {
    const abortController = new AbortController()

    fetchStudentDashboard(
      {
        studentId: auth?.studentId,
        email: auth?.email ?? auth?.username,
      },
      abortController.signal,
    ).catch((error: unknown) => {
      if (abortController.signal.aborted) {
        return
      }

      if (error instanceof Error && isInvalidStudentSessionMessage(error.message)) {
        clearStudentAuth()
        navigateTo('/student', { replace: true })
      }
    })

    return () => {
      abortController.abort()
    }
  }, [auth?.email, auth?.studentId, auth?.username])

  return (
    <StudentShell
      active="requests"
      schoolYearLabel="2025-2026"
      semesterLabel="1st Semester"
    >
      <section className="student-utility-page">
        <article className="instructor-panel student-utility-card">
          <h2>Requests</h2>
          <p>Your request center will appear here.</p>
        </article>
      </section>
    </StudentShell>
  )
}
