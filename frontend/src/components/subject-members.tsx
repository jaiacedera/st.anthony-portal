import { useEffect, useState } from 'react'
import { fetchSubjectMembers, changeProfessor, type SubjectMembers } from '../services/sharedSubjectsApi'

export function SubjectProfessorsPanel({ subjectId, onChanged }: { subjectId: string; onChanged: () => void }) {
  const [members, setMembers] = useState<SubjectMembers | null>(null)
  const [professorId, setProfessorId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
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
  return <div className="subject-members">
    {message && <p role="status" className="dashboard-alert">{message}</p>}
    {!members ? <p>Loading professors…</p> : <>
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
    </>}
  </div>
}
