import type { InstructorSubjectRecord, InstructorStudentRecord } from '../services/instructorApi'
import type { SubjectGroups } from '../services/sharedSubjectsApi'

export const normalizeImportValue = (value: unknown) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
export type StudentImportRow = {
  row: number; email: string; subject: string; group: string; section: string; subjectId: string
  status: 'valid' | 'invalid' | 'duplicate'; message: string; newGroup: boolean
}

export function previewStudentImport(rows: unknown[][], subjects: InstructorSubjectRecord[], students: InstructorStudentRecord[], groups: Record<string, SubjectGroups> = {}): StudentImportRow[] {
  const required = ['email', 'subject', 'group', 'section']
  const headerRow = rows.findIndex(row => row.some(cell => normalizeImportValue(cell) === 'email'))
  if (headerRow < 0) throw new Error('Required columns: Email, Subject, Group, Section.')
  const headers = rows[headerRow].map(normalizeImportValue)
  for (const name of required) {
    if (!headers.includes(name)) throw new Error(`Missing required column: ${name}.`)
    if (headers.filter(header => header === name).length > 1) throw new Error(`Duplicate column: ${name}.`)
  }
  const seen = new Set<string>()
  return rows.slice(headerRow + 1).flatMap((cells, index) => {
    const [email, subject, group, section] = required.map(name => String(cells[headers.indexOf(name)] ?? '').trim())
    if (![email, subject, group, section].some(Boolean)) return []
    const row: StudentImportRow = { row: headerRow + index + 2, email: normalizeImportValue(email), subject, group, section, subjectId: '', status: 'valid', message: '', newGroup: false }
    const errors: string[] = []
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email')
    if (!group || group.length > 100) errors.push('Group must contain 1–100 characters')
    const candidates = subjects.filter(item => [item.code, item.title, `${item.code} - ${item.title}`].some(value => normalizeImportValue(value) === normalizeImportValue(subject)))
    const matches = candidates.filter(item => normalizeImportValue(item.section) === normalizeImportValue(section))
    if (!candidates.length) errors.push('Unknown subject')
    else if (!section || !matches.length) errors.push('Unknown section')
    else if (matches.length > 1) errors.push('Ambiguous subject/section')
    else row.subjectId = matches[0].id
    if (errors.length) { row.status = 'invalid'; row.message = errors.join('; '); return [row] }
    const key = `${row.email}:${row.subjectId}`
    if (seen.has(key)) { row.status = 'duplicate'; row.message = 'Repeated student/subject in file; first valid row takes precedence'; return [row] }
    seen.add(key)
    const knownGroup = groups[row.subjectId]?.groups.find(item => normalizeImportValue(item.group_name) === normalizeImportValue(group))
    row.newGroup = !knownGroup
    const student = students.find(item => normalizeImportValue(item.email) === row.email)
    const enrolled = student?.subjects.some(item => item.id === row.subjectId)
    const assigned = knownGroup && groups[row.subjectId]?.members.some(item => item.student_id === student?.id && item.group_id === knownGroup.id)
    if (enrolled && assigned) { row.status = 'duplicate'; row.message = 'Already enrolled in this subject and group' }
    else row.message = `${student ? 'Existing student: assign' : 'Create account if needed'}${row.newGroup ? '; unknown group: will create' : ''}`
    return [row]
  })
}
