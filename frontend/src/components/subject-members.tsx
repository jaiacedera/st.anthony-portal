import { useEffect, useState } from 'react'
import { fetchSubjectMembers, changeProfessor, type SubjectMembers } from '../services/sharedSubjectsApi'

export type ProfessorAssignmentRow = { name: string; email: string; checked: boolean }

export function SubjectProfessorsPanel({ subjectId, onChanged, rows, onRowsChange, saving }: {
  subjectId: string; onChanged: () => void; rows: ProfessorAssignmentRow[]
  onRowsChange: (rows: ProfessorAssignmentRow[]) => void; saving: boolean
}) {
  const [members, setMembers] = useState<SubjectMembers | null>(null)
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
        <button type="button" className="subject-detail-action" disabled={busy || saving || members.professors.length < 2}
          onClick={() => void mutate(() => changeProfessor(subjectId, professor.id, 'remove'))}>Remove Professor</button>
      </li>)}</ul>
      <h3>Add Professors</h3>
      {rows.map((row, index) => <div className="professor-assignment-row" key={index}>
        <label>Name<input form="subject-details-form" value={row.name} required={row.checked}
          disabled={busy || saving} onChange={event => onRowsChange(rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label>
        <label>Email<input form="subject-details-form" type={row.checked ? 'email' : 'text'} value={row.email} required={row.checked}
          disabled={busy || saving} onChange={event => onRowsChange(rows.map((item, i) => i === index ? { ...item, email: event.target.value } : item))} /></label>
        <label>Add?<input type="checkbox" checked={row.checked} disabled={busy || saving}
          onChange={event => onRowsChange(rows.map((item, i) => i === index ? { ...item, checked: event.target.checked } : item))} /></label>
      </div>)}
      <button type="button" className="subject-detail-action" disabled={busy || saving}
        onClick={() => onRowsChange([...rows, { name: '', email: '', checked: false }])}>+ Add Row</button>
      <p>Checked professors are assigned by email when you save changes. Use an existing instructor’s email.</p>
    </>}
  </div>
}
