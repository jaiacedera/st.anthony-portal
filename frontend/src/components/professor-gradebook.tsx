import { useEffect, useState } from 'react'
import { fetchProfessorGrades, saveProfessorGrade, type ProfessorGrade } from '../services/sharedSubjectsApi'

const fields = ['knowledge', 'performance', 'attitude'] as const
export function ProfessorGradebook({ subjectId, matchesGroup = () => true }: { subjectId: string; matchesGroup?: (studentId: string) => boolean }) {
  const [rows, setRows] = useState<ProfessorGrade[] | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetchProfessorGrades(subjectId, controller.signal).then(result => setRows(result.rows))
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message) })
    return () => controller.abort()
  }, [subjectId])
  async function submit(row: ProfessorGrade) {
    setSaving(row.studentId)
    setMessage('')
    try {
      const result = await saveProfessorGrade(subjectId, row)
      setRows(current => current?.map(item => item.studentId === row.studentId ? {
        ...row, status: 'SUBMITTED', myGrade: String((Number(row.knowledge) + Number(row.performance) + Number(row.attitude)) / 3),
      } : item) ?? null)
      setMessage(result.message)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save grade.') }
    finally { setSaving('') }
  }
  const visibleRows = rows?.filter(row => matchesGroup(row.studentId))
  return <article className="instructor-panel professor-gradebook">
    <h2>My Student Grades</h2>
    <p>Each category contributes one third of your grade. The subject grade averages all assigned professors’ submissions and remains pending until everyone has submitted.</p>
    {message && <p role="status" className="dashboard-alert">{message}</p>}
    {!rows ? <p>Loading your grades…</p> : !visibleRows?.length ? <p>No students in this selection.</p> :
      <div className="grades-table-shell"><table className="grades-table">
        <thead><tr><th>Student Name</th><th>Knowledge</th><th>Performance</th><th>Attitude</th><th>My Grade</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{visibleRows.map(row => {
          const valid = fields.every(field => String(row[field]).trim() !== '' && Number.isFinite(Number(row[field])) && Number(row[field]) >= 0 && Number(row[field]) <= 100)
          const average = valid ? fields.reduce((sum, field) => sum + Number(row[field]), 0) / 3 : null
          return <tr key={row.studentId}><td>{row.studentName}</td>
            {fields.map(field => <td key={field}><input type="number" min="0" max="100" step="0.01"
              aria-label={`${row.studentName} ${field}`} value={row[field]} disabled={Boolean(saving)}
              onChange={event => setRows(current => current?.map(item => item.studentId === row.studentId ? { ...item, [field]: event.target.value, status: 'UNSAVED' } : item) ?? null)} /></td>)}
            <td>{average?.toFixed(2) ?? '—'}</td><td>{row.status === 'SUBMITTED' ? 'Submitted' : row.status === 'UNSAVED' ? 'Unsaved' : 'Pending'}</td>
            <td><button type="button" className="grades-toolbar-button" disabled={!valid || Boolean(saving)}
              onClick={() => void submit(row)}>{saving === row.studentId ? 'Saving…' : 'Submit My Grade'}</button></td>
          </tr>
        })}</tbody>
      </table></div>}
  </article>
}
