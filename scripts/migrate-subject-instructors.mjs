import { SHEET_NAMES as S } from '../backend/database/sheetsSchema.js'
import { getAllRows, appendRow, updateRowById } from '../backend/database/sheetsService.js'

// Additive migration. Existing grades and legacy grading modes are preserved.
const subjects = await getAllRows(S.SUBJECTS)
const links = await getAllRows(S.SUBJECT_INSTRUCTORS)
let count = 0
for (const subject of subjects) {
  if (!subject.instructor_id) continue
  if (!links.some(link => link.subject_id === subject.subject_id && link.instructor_id === subject.instructor_id)) {
    const record = {
      id: JSON.stringify([subject.subject_id, subject.instructor_id]),
      subject_id: subject.subject_id, instructor_id: subject.instructor_id,
      assigned_by: subject.instructor_id, assigned_at: subject.created_at || new Date().toISOString(), status: 'ACTIVE',
    }
    await appendRow(S.SUBJECT_INSTRUCTORS, record)
    links.push(record)
    count++
  }
  if (!subject.created_by) await updateRowById(S.SUBJECTS, 'subject_id', subject.subject_id, { created_by: subject.instructor_id })
}
console.log(`Backfilled ${count} subject instructor assignments. Existing grades were preserved.`)
