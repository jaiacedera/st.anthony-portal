import { InstructorShell } from '../../components/instructor-shell'

export default function RequestsPage() {
  return (
    <InstructorShell active="requests">
      <section className="instructor-placeholder-grid">
        <article className="instructor-placeholder-card">
          <h2>Requests</h2>
          <p>Breakdown requests can be reviewed here with approve and reject actions.</p>

          <div className="instructor-summary-list">
            <div className="instructor-summary-row">
              <strong>Juan Dela Cruz</strong>
              <span>SBJ 101 · Pending breakdown request</span>
            </div>
            <div className="instructor-summary-row">
              <strong>Maria Santos</strong>
              <span>SBJ 102 · Waiting for review</span>
            </div>
          </div>
        </article>
      </section>
    </InstructorShell>
  )
}
