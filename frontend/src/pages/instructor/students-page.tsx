import { InstructorShell } from '../../components/instructor-shell'

export default function StudentsPage() {
  return (
    <InstructorShell active="students">
      <section className="instructor-placeholder-grid">
        <article className="instructor-placeholder-card">
          <h2>Students</h2>
          <p>This page is now active under the instructor folder and can be expanded into the full roster view.</p>

          <div className="instructor-summary-list">
            <div className="instructor-summary-row">
              <strong>Section A</strong>
              <span>32 enrolled students</span>
            </div>
            <div className="instructor-summary-row">
              <strong>Section B</strong>
              <span>28 enrolled students</span>
            </div>
          </div>
        </article>
      </section>
    </InstructorShell>
  )
}
