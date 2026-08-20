import { InstructorShell } from '../../components/instructor-shell'

export default function SubjectsPage() {
  return (
    <InstructorShell active="subjects">
      <section className="instructor-placeholder-grid">
        <article className="instructor-placeholder-card">
          <h2>Subjects</h2>
          <p>Your subject list is now routed and ready for the full table view.</p>

          <div className="instructor-summary-list">
            <div className="instructor-summary-row">
              <strong>SBJ 101</strong>
              <span>Subject 1 · Mon 8:00 AM - 10:00 AM</span>
            </div>
            <div className="instructor-summary-row">
              <strong>SBJ 102</strong>
              <span>Subject 2 · Tue 1:00 PM - 3:00 PM</span>
            </div>
          </div>
        </article>
      </section>
    </InstructorShell>
  )
}
