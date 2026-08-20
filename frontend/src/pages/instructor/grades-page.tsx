import { InstructorShell } from '../../components/instructor-shell'

export default function GradesPage() {
  return (
    <InstructorShell active="grades">
      <section className="instructor-placeholder-grid">
        <article className="instructor-placeholder-card">
          <h2>Grades</h2>
          <p>The grade posting page is now routed and ready for subject-by-subject grade entry.</p>

          <div className="instructor-summary-list">
            <div className="instructor-summary-row">
              <strong>SBJ 101</strong>
              <span>32 students pending final grade posting</span>
            </div>
            <div className="instructor-summary-row">
              <strong>SBJ 102</strong>
              <span>28 students already saved as draft</span>
            </div>
          </div>
        </article>
      </section>
    </InstructorShell>
  )
}
