import { useEffect, useState, type ReactNode } from 'react'
import { PortalHeader } from '../../components/portal-header'
import { InstructorSidebar } from '../../components/instructor-sidebar'
import { fetchInstructorDashboard, type InstructorDashboardPayload } from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'
import './instructor-portal.css'
import './dashboard-page.css'

const paths = {
  book: 'M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v15',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-4',
  chart: 'M5 20v-6m7 6V9m7 11V3',
  cap: 'm2 8 10-5 10 5-10 5L2 8Zm4 3v7l6 3 6-3v-7m4-3v8',
  bolt: 'm13 2-10 12h8l-1 8L22 9h-9l1-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  calendar: 'M4 5h16v16H4V5Zm4-3v6m8-6v6M4 10h16m-12 4h2m4 0h2',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  profile: 'M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  arrow: 'm9 5 7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
} as const
type IconName = keyof typeof paths
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'chart' ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
const cards = [
  { key: 'subjectCount', title: 'My Subjects', note: 'This Semester', icon: 'file', tone: 'rose', href: '/instructor/subjects' },
  { key: 'studentCount', title: 'Total Students', note: 'This Semester', icon: 'users', tone: 'green', href: '/instructor/students' },
  { key: 'gradesPostedCount', title: 'Grades Posted', note: 'This Semester', icon: 'chart', tone: 'amber', href: '/instructor/grades' },
  { key: 'pendingRequestCount', title: 'Pending Grade Request', note: 'Overall', icon: 'cap', tone: 'blue', href: '/instructor/requests' },
] as const
const actions = [
  { title: 'Create Subject', note: 'Add a new subject', icon: 'file', tone: 'rose', href: '/instructor/subjects?open=create' },
  { title: 'View Students', note: 'Manage your class list', icon: 'users', tone: 'green', href: '/instructor/students' },
  { title: 'Post Grades', note: 'Encode student grades', icon: 'chart', tone: 'amber', href: '/instructor/grades' },
  { title: 'View Requests', note: 'Check student requests', icon: 'file', tone: 'blue', href: '/instructor/requests' },
] as const
function Panel({ title, description, icon, action, children }: { title: string; description: string; icon: IconName; action?: ReactNode; children: ReactNode }) {
  return <section className="id-panel"><header className="id-panel-heading"><span className="id-panel-icon"><Icon name={icon} /></span><div><h2>{title}</h2><p>{description}</p></div>{action}</header>{children}</section>
}
function EmptyState({ icon = 'file', title, description, loading }: { icon?: IconName; title: string; description: string; loading: boolean }) {
  return <div className="id-empty" role="status"><Icon name={icon} /><strong>{loading ? 'Loading dashboard…' : title}</strong><p>{loading ? 'Fetching your latest information.' : description}</p></div>
}
export default function DashboardPage() {
  const username = readInstructorAuth()?.username ?? ''
  const [dashboard, setDashboard] = useState<InstructorDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  useEffect(() => {
    if (!username) return
    const controller = new AbortController()
    fetchInstructorDashboard(username, controller.signal).then(setDashboard).catch((error: unknown) => {
      if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard data.')
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [username])
  const query = search.trim().toLowerCase()
  const matches = (...values: string[]) => values.some(value => value.toLowerCase().includes(query))
  const subjects = dashboard?.previews.subjects.filter(s => matches(s.subjectCode, s.subjectName)) ?? []
  const grades = dashboard?.previews.gradePosting.filter(s => matches(s.subjectCode, s.subjectName)) ?? []
  const requests = dashboard?.previews.pendingRequests.filter(r => matches(r.studentName, r.subjectCode, r.status)) ?? []
  const loading = Boolean(username) && isLoading
  const alert = !username ? 'No instructor session was found. Please sign in again.' : errorMessage || (dashboard?.needsBinding ? dashboard.message || 'Your instructor account needs to be linked to an instructor record.' : '')
  const emptyTitle = (fallback: string) => query ? 'No matching results.' : errorMessage ? 'Information is unavailable.' : fallback
  const emptyDescription = (fallback: string) => query ? 'Try another name or subject code.' : errorMessage ? 'Please refresh to try again.' : fallback
  return <main className={`instructor-portal-page id-page portal-shell${sidebarOpen ? ' id-page--sidebar-open' : ' portal-shell--collapsed'}`}>
    <h1 className="id-sr-only">Instructor dashboard</h1>
    <div id="dashboard-navigation" className="id-sidebar" hidden={!sidebarOpen}>
      <InstructorSidebar active="dashboard" />
    </div>
    <PortalHeader portal="instructor" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(open => !open)} searchValue={search} onSearchChange={setSearch} schoolYearLabel={dashboard?.header.schoolYear} semesterLabel={dashboard?.header.semester} notificationCount={dashboard?.stats.pendingRequestCount} />
    <div className="id-content">
      {alert && <div className="id-alert" role="alert">{alert}</div>}
      <section className="id-stats" aria-label="Dashboard overview">{cards.map(card => <a className="id-stat" key={card.key} href={card.href}><span className={`id-stat-icon id-${card.tone}`}><Icon name={card.icon} /></span><div><strong className="id-stat-number">{loading ? '—' : dashboard?.stats[card.key] ?? '—'}</strong><h2>{card.title}</h2><p>{card.note}</p></div><span className="id-stat-arrow"><Icon name="arrow" /></span></a>)}</section>
      <div className="id-grid">
        <Panel title="Subject Management" description="Manage your subjects and view enrolled students." icon="book" action={<a className="id-button id-button-primary" href="/instructor/subjects?open=create"><Icon name="plus" />Add Subject</a>}>
          <div className="id-table-wrap"><table><thead><tr><th>Code</th><th>Subject Title</th><th>Students</th><th>Actions</th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.subjectId}><td>{subject.subjectCode}</td><td>{subject.subjectName}<small>{subject.schedule}</small></td><td>{subject.studentCount}</td><td><a className="id-row-link" href="/instructor/subjects">View</a></td></tr>)}</tbody></table></div>
          {!subjects.length && <EmptyState loading={loading} icon="book" title={emptyTitle('No subjects created yet.')} description={emptyDescription('Once you add a subject, it will appear here.')} />}
        </Panel>
        <Panel title="Grade Posting" description="Post and manage student grades." icon="chart" action={<a className="id-button" href="/instructor/grades"><Icon name="file" />Post Grades</a>}>
          <div className="id-table-wrap"><table><thead><tr><th>Subject</th><th>Title</th><th>Students</th><th>Action</th></tr></thead><tbody>{grades.map(subject => <tr key={subject.subjectId}><td>{subject.subjectCode}</td><td>{subject.subjectName}</td><td>{subject.studentCount}</td><td><a className="id-row-link" href="/instructor/grades">Post Grades</a></td></tr>)}</tbody></table></div>
          {!grades.length && <EmptyState loading={loading} title={emptyTitle('No subjects available for grade posting.')} description={emptyDescription('Create a subject first to post grades.')} />}
        </Panel>
        <Panel title="Quick Actions" description="Common tasks to help you get started." icon="bolt"><div className="id-quick-actions">{actions.map(action => <a key={action.title} className={`id-quick-action id-${action.tone}`} href={action.href}><Icon name={action.icon} /><strong>{action.title}</strong><span>{action.note}</span></a>)}</div></Panel>
        <Panel title="Breakdown Requests" description="View and process student grade breakdown requests." icon="file" action={<a className="id-button" href="/instructor/requests"><Icon name="list" />View All</a>}>
          <div className="id-table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.map(request => <tr key={request.requestId}><td>{request.studentName}</td><td>{request.subjectCode}</td><td><span className="id-status">{request.status}</span></td><td><a className="id-row-link" href="/instructor/requests">Review</a></td></tr>)}</tbody></table></div>
          {!requests.length && <EmptyState loading={loading} title={emptyTitle('No pending breakdown requests.')} description={emptyDescription('Student requests will appear here.')} />}
        </Panel>
      </div>
      <footer className="id-footer"><span>© {new Date().getFullYear()} St. Anthony College Calapan City Inc. All rights reserved.</span><em>Building Minds. Shaping Futures.</em></footer>
    </div>
  </main>
}
