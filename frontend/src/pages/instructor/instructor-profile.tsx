import { InstructorShell } from '../../components/instructor-shell'

export default function InstructorProfilePage() {
  return (
    <InstructorShell active="profile">
      <section className="instructor-placeholder-grid">
        <article className="instructor-placeholder-card">
          <h2>Profile</h2>
          <p>This instructor profile page is connected to the sidebar route and ready for account details.</p>

          <div className="instructor-summary-list">
            <div className="instructor-summary-row">
              <strong>Instructor</strong>
              <span>robinacedera</span>
            </div>
            <div className="instructor-summary-row">
              <strong>Role</strong>
              <span>Instructor Portal Account</span>
            </div>
          </div>
        </article>
      </section>
    </InstructorShell>
  )
}
