import { StudentShell } from '../../components/student-shell'

export default function StudentRequestPage() {
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
