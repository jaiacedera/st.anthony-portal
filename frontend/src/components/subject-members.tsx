import { useEffect, useState, type FormEvent } from 'react'
import { fetchSubjectMembers, changeProfessor, type SubjectMembers } from '../services/sharedSubjectsApi'
import { createInstructorStudent, updateInstructorStudentEnrollment } from '../services/instructorApi'

export function SubjectMembersPanel({ subjectId, username, onChanged }: { subjectId: string; username: string; onChanged: () => void }) {
  const [members, setMembers] = useState<SubjectMembers | null>(null)
  const [professorId, setProfessorId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [student, setStudent] = useState({ name: '', email: '', yearLevel: '', createAccount: true })
  useEffect(() => {
    const controller = new AbortController()
    fetchSubjectMembers(subjectId, controller.signal).then(setMembers).catch(error => {
      if (!controller.signal.aborted) setMessage(error.message)
    })
    return () => controller.abort()
  }, [subjectId])
  async function mutate(work: () => Promise<{ message?: string }>) {
    setBusy(true)
    setMessage('')
    try {
      const result = await work()
      setMessage(result.message || 'Updated successfully.')
      onChanged()
      setMembers(await fetchSubjectMembers(subjectId))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update class.') }
    finally { setBusy(false) }
  }
  function addStudent(event: FormEvent) {
    event.preventDefault()
    void mutate(() => createInstructorStudent({ username, subjectIds: [subjectId], ...student }))
  }
  return <div className="subject-members">
    {message && <p role="status" className="dashboard-alert">{message}</p>}
    {!members ? <p>Loading professors and students…</p> : <>
      <h3>Assigned Professors</h3>
      <ul>{members.professors.map(professor => <li key={professor.id}>
        <span>{professor.name} <small>{professor.email}</small></span>
        <button type="button" className="subject-detail-action" disabled={busy || members.professors.length < 2}
          onClick={() => void mutate(() => changeProfessor(subjectId, professor.id, 'remove'))}>Remove Professor</button>
      </li>)}</ul>
      <form onSubmit={event => { event.preventDefault(); void mutate(() => changeProfessor(subjectId, professorId, 'add')) }}>
        <label>Add Professor
          <select required value={professorId} onChange={event => setProfessorId(event.target.value)} disabled={busy}>
            <option value="">Select a professor</option>
            {members.availableProfessors.map(p => <option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}
          </select>
        </label>
        <p>Adding a professor enables independent grading. Each professor must submit Knowledge, Performance, and Attitude grades.</p>
        <button className="subject-detail-action subject-detail-action--solid" disabled={busy || !professorId}>Add Professor</button>
      </form>
      <h3>Enrolled Students</h3>
      {members.students.length ? <ul>{members.students.map(s => <li key={s.id}>
        <span>{s.name} <small>{s.email} · {s.yearLevel}</small></span>
        <button type="button" className="subject-detail-action" disabled={busy}
          onClick={() => void mutate(() => updateInstructorStudentEnrollment({ username, subjectId, studentId: s.id, action: 'remove' }))}>Remove Student</button>
      </li>)}</ul> : <p>No students enrolled.</p>}
      <h3>Add Student</h3>
      <form onSubmit={addStudent}>
        <label>Name<input required value={student.name} onChange={e => setStudent({ ...student, name: e.target.value })} disabled={busy} /></label>
        <label>Email<input type="email" required value={student.email} onChange={e => setStudent({ ...student, email: e.target.value })} disabled={busy} /></label>
        <label>Year Level<input required value={student.yearLevel} onChange={e => setStudent({ ...student, yearLevel: e.target.value })} disabled={busy} /></label>
        <label><input type="checkbox" checked={student.createAccount} onChange={e => setStudent({ ...student, createAccount: e.target.checked })} disabled={busy} /> Create account if none exists</label>
        <button className="subject-detail-action subject-detail-action--solid" disabled={busy}>Add Student</button>
      </form>
    </>}
  </div>
}
