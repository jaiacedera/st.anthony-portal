import { useRef, useState, type ChangeEvent } from 'react'
import { createInstructorStudent, fetchInstructorSubjects, type InstructorStudentRecord } from '../services/instructorApi'
import { changeSubjectGroup, fetchSubjectGroups, type SubjectGroups } from '../services/sharedSubjectsApi'
import { readGradeFile } from '../utils/grade-files'
import { notifyGradeEvent } from '../utils/grade-notifications'
import { normalizeImportValue as normalize, previewStudentImport, type StudentImportRow } from '../utils/student-import'

export function StudentExcelImport({ username, students, onComplete }: {
  username: string; students: InstructorStudentRecord[]
  onComplete: (summary: string, errors: string) => Promise<void>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<StudentImportRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function preview(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx file.')
      const [cells, catalog] = await Promise.all([readGradeFile(file), fetchInstructorSubjects(username)])
      const initial = previewStudentImport(cells, catalog.subjects, students)
      const ids = [...new Set(initial.filter(row => row.status === 'valid').map(row => row.subjectId))]
      const groups = Object.fromEntries(await Promise.all(ids.map(async id => [id, await fetchSubjectGroups(id)] as const)))
      const previewRows = previewStudentImport(cells, catalog.subjects, students, groups)
      if (!previewRows.length) throw new Error('No student rows were found.')
      setRows(previewRows)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to read student file.') }
    finally { setBusy(false) }
  }
  async function confirm() {
    if (!rows || busy) return
    setBusy(true); setError('')
    let completed = 0
    const errors: string[] = []
    const warnings: string[] = []
    try {
      const { subjects } = await fetchInstructorSubjects(username)
      const groupCache: Record<string, SubjectGroups> = {}
      for (const row of rows.filter(row => row.status === 'valid')) {
        let enrolled = false
        try {
          if (!subjects.some(subject => subject.id === row.subjectId && normalize(subject.section) === normalize(row.section))) throw new Error('Subject/section changed; upload the file again.')
          let state = groupCache[row.subjectId] ?? await fetchSubjectGroups(row.subjectId)
          let group = state.groups.find(group => normalize(group.group_name) === normalize(row.group))
          if (!group) {
            try { state = await changeSubjectGroup(row.subjectId, { action: 'create', groupName: row.group }) }
            catch (error) {
              // Another import may have created the same group while this preview was open.
              state = await fetchSubjectGroups(row.subjectId)
              if (!state.groups.some(group => normalize(group.group_name) === normalize(row.group))) throw error
            }
            group = state.groups.find(group => normalize(group.group_name) === normalize(row.group))
          }
          if (!group) throw new Error('Unable to resolve group.')
          const result = await createInstructorStudent({ username, email: row.email, subjectIds: [row.subjectId] })
          enrolled = true
          if (!result.student) throw new Error('Student record was not returned.')
          if (!state.members.some(member => member.student_id === result.student!.id && member.group_id === group.id)) {
            state = await changeSubjectGroup(row.subjectId, { action: 'assign', studentId: result.student.id, groupId: group.id })
          }
          groupCache[row.subjectId] = state
          completed++
          if (result.message?.includes('email was not sent')) warnings.push(`${row.email}: ${result.message}`)
        } catch (error) { errors.push(`Row ${row.row} (${row.email}): ${error instanceof Error ? error.message : 'Import failed.'}${enrolled ? ' Enrollment succeeded; group assignment needs retry.' : ''}`) }
      }
      const skipped = rows.filter(row => row.status !== 'valid').length
      const summary = `${completed} student assignments completed, ${skipped} skipped, ${errors.length} failed.`
      if (completed) notifyGradeEvent(username, 'student-import', 'Student import completed', summary)
      await onComplete(summary, [...errors, ...warnings].join(' '))
      setRows(null)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to complete import.') }
    finally { setBusy(false) }
  }
  const valid = rows?.filter(row => row.status === 'valid') ?? []
  return <>
    <input ref={input} type="file" accept=".xlsx" hidden onChange={preview} />
    <button type="button" className="grades-toolbar-button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing...' : 'Import Excel'}</button>
    {error && !rows && <p role="alert" className="student-import-error">{error}</p>}
    {rows && <div className="student-modal-backdrop" onClick={() => { if (!busy) setRows(null) }}>
      <section className="student-modal student-import-modal" role="dialog" aria-modal="true" aria-labelledby="student-import-title" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape' && !busy) setRows(null) }}>
        <h2 id="student-import-title">Student Import Preview</h2>
        <p>{valid.length} valid · {rows.filter(row => row.status === 'invalid').length} invalid · {rows.filter(row => row.status === 'duplicate').length} duplicate students</p>
        <p>Subject and Section identify the class. Unknown subjects/sections and duplicate rows are skipped. Existing accounts are reused.</p>
        <p>{new Set(valid.filter(row => row.newGroup).map(row => `${row.subjectId}:${normalize(row.group)}`)).size} unknown groups will be created when you confirm.</p>
        <div className="student-import-table"><table><thead><tr><th>Row</th><th>Email</th><th>Subject</th><th>Section</th><th>Group</th><th>Preview</th></tr></thead><tbody>
          {rows.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.email}</td><td>{row.subject}</td><td>{row.section}</td><td>{row.group}</td><td>{row.status}: {row.message}</td></tr>)}
        </tbody></table></div>
        {error && <p role="alert">{error}</p>}
        <div className="student-modal-actions"><button className="grades-toolbar-button" disabled={busy} onClick={() => setRows(null)}>Cancel</button><button className="grades-toolbar-button grades-toolbar-button--primary" disabled={busy || !valid.length} onClick={() => void confirm()}>{busy ? 'Importing...' : 'Confirm Import'}</button></div>
      </section>
    </div>}
  </>
}
