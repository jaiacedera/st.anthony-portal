import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previewStudentImport } from './student-import.ts'

const subjects = [
  { id: 'a', code: 'NCM 119', title: 'Nursing', section: 'BSN-4A' },
  { id: 'b', code: 'NCM 119', title: 'Nursing', section: 'BSN-4B' },
]
const students = [{ id: 'student', email: 'existing@example.com', subjects: [{ id: 'a' }] }]
const groups = { a: { groups: [{ id: 'group', group_name: 'Group 1' }], members: [{ student_id: 'student', group_id: 'group' }] } }

test('maps shuffled headers, matches Subject + Section, and previews group creation without mutation', () => {
  const rows = previewStudentImport([
    ['Section', 'Group', 'Subject', 'Email'],
    ['bsn-4b', 'New group', 'ncm 119', ' NEW@example.com '],
    ['BSN-4A', 'Group 1', 'Nursing', 'another@example.com'],
    ['', '', '', ''],
  ], subjects, students, groups)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].email, 'new@example.com')
  assert.equal(rows[0].subjectId, 'b')
  assert.equal(rows[0].newGroup, true)
  assert.equal(rows[1].subjectId, 'a')
  assert.equal(rows[1].newGroup, false)
  assert.ok(rows.every(row => row.status === 'valid'))
  assert.equal(groups.a.groups.length, 1)
})

test('skips existing assignments and duplicate file rows, but allows reassignment and other sections', () => {
  const rows = previewStudentImport([
    ['Email', 'Subject', 'Group', 'Section'],
    ['existing@example.com', 'NCM 119', 'Group 1', 'BSN-4A'],
    ['EXISTING@example.com', 'NCM 119', 'Group 2', 'BSN-4A'],
    ['existing@example.com', 'NCM 119', 'Group 1', 'BSN-4B'],
  ], subjects, students, groups)
  assert.deepEqual(rows.map(row => row.status), ['duplicate', 'duplicate', 'valid'])
  const reassignment = previewStudentImport([['Email', 'Subject', 'Group', 'Section'], ['existing@example.com', 'NCM 119', 'Group 2', 'BSN-4A']], subjects, students, groups)
  assert.equal(reassignment[0].status, 'valid')
})

test('reports invalid email, unknown subject/section, missing values, and invalid headers', () => {
  const rows = previewStudentImport([
    ['Email', 'Subject', 'Group', 'Section'],
    ['bad', 'NCM 119', 'Group 1', 'BSN-4A'],
    ['student@example.com', 'Unknown', 'Group 1', 'BSN-4A'],
    ['student@example.com', 'NCM 119', 'Group 1', 'BSN-5A'],
    ['student@example.com', 'NCM 119', '', ''],
  ], subjects, students)
  assert.ok(rows.every(row => row.status === 'invalid'))
  assert.match(rows[0].message, /Invalid email/)
  assert.match(rows[1].message, /Unknown subject/)
  assert.match(rows[2].message, /Unknown section/)
  assert.throws(() => previewStudentImport([['Email', 'Subject']], subjects, []), /Missing required column/)
  assert.throws(() => previewStudentImport([['Email', 'Subject', 'Group', 'Section', 'EMAIL']], subjects, []), /Duplicate column/)
})
