import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previewGradeRows, createGradeWorkbook, readGradeFile } from './grade-files.ts'
import JSZip from 'jszip'

const fields = [
  { id: 'q1', category: 'knowledge', label: 'Quiz 1' },
  { id: 'q2', category: 'knowledge', label: 'Quiz 2' },
  { id: 'fdar', category: 'skills', label: 'FDAR' },
]
const students = [{ id: 'one', email: 'one@school.edu', fullName: 'Jane Doe' }, { id: 'two', email: 'two@school.edu', fullName: 'John Smith' }]
const scope = { instructor: 'teacher', subject: 'Nursing', group: 'Group A' }

test('reads namespace-prefixed OpenXML from enrollment template writers', async () => {
  const workbook = await createGradeWorkbook([], scope)
  workbook.removeWorksheet(workbook.worksheets[0].id)
  const sheet = workbook.addWorksheet('Students')
  sheet.addRow(['Email', 'Subject', 'Group', 'Section'])
  sheet.addRow(['student@example.com', 'NCM 119', 'Group 1', 'BSN-4A'])
  const zip = await JSZip.loadAsync(await workbook.xlsx.writeBuffer())
  const xml = await zip.file('xl/workbook.xml').async('string')
  zip.file('xl/workbook.xml', xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/<(\/?)([A-Za-z][\w]*)(?=[\s/>])/g, '<$1x:$2'))
  const rows = await readGradeFile(new File([await zip.generateAsync({ type: 'arraybuffer' })], 'students.xlsx'))
  assert.equal(rows[0][0], 'Email')
  assert.equal(rows[1][0], 'student@example.com')
})

test('maps reordered columns by category/name, previews changes, skips invalid scores and ignores calculated values', () => {
  const preview = previewGradeRows([
    ['Skills (40%)', '', 'Knowledge (40%)', '', '', ''],
    ['FDAR', 'Email', 'Quiz 1', 'New Exam', 'Student Name', 'Final Score'],
    [0, 'ONE@school.edu', 95, 80, 'different name', 999],
    [101, '', 'INC', '=SUM(A1)', 'Smith, John', 999],
    [90, 'unknown@school.edu', 10, 5, 'Unknown', 999],
  ], fields, students, scope)
  assert.equal(preview.matchedStudents.length, 2)
  assert.equal(preview.unmatchedStudents.length, 1)
  assert.equal(preview.invalidValues.length, 2)
  assert.deepEqual(preview.missingFields.map(field => field.id), ['q2'])
  assert.deepEqual(preview.newFields.map(field => field.label), ['New Exam'])
  assert.ok(preview.scores.some(score => score.fieldId === 'fdar' && score.value === 0))
  assert.ok(preview.scores.some(score => score.studentId === 'two' && score.value === 'INC'))
  assert.equal(preview.scores.length, 4)
})

test('flags duplicate headers, ambiguous names, repeated students, and scope mismatch', () => {
  const preview = previewGradeRows([
    ['Subject', 'Other subject'], ['Group', 'Group B'],
    ['', '', 'Knowledge (40%)', 'Knowledge (40%)'],
    ['Student Name', 'Email', 'Quiz 1', 'quiz 1'],
    ['Jane Doe', '', 80, 81], ['Jane Doe', 'one@school.edu', 80, 81], ['Jane Doe', 'one@school.edu', 82, 83],
  ], fields, [...students, { id: 'three', email: 'three@school.edu', fullName: 'Jane Doe' }], scope)
  assert.equal(preview.duplicateHeaders.length, 1)
  assert.equal(preview.scopeErrors.length, 2)
  assert.equal(preview.unmatchedStudents.length, 1)
  assert.equal(preview.invalidValues.length, 1)
})

test('XLSX round trip preserves only active fields, identity, category headers, and raw scores', async () => {
  const workbook = await createGradeWorkbook(fields, scope, [['Jane Doe', 'one@school.edu', 90, 0, 'INC', 999]], ['Final Score'])
  const buffer = await workbook.xlsx.writeBuffer()
  const rows = await readGradeFile(new File([buffer], 'grades.xlsx'))
  const preview = previewGradeRows(rows, fields, students, scope)
  assert.equal(preview.scopeErrors.length, 0)
  assert.equal(preview.newFields.length, 0)
  assert.equal(preview.missingFields.length, 0)
  assert.equal(preview.scores.length, 3)
  assert.deepEqual(preview.scores.map(score => score.value), [90, 0, 'INC'])
  assert.ok(!rows.flat().includes('MEDS'))
  assert.ok(!rows.flat().includes('KARDEX'))
})

test('supports CSV quoted names and school sheets with identity in the category row', async () => {
  const rows = await readGradeFile(new File(['Student Name,Email,Knowledge: Quiz 1\r\n"Doe, Jane",one@school.edu,88'], 'grades.csv'))
  assert.equal(previewGradeRows(rows, fields, students, scope).scores[0].value, 88)
  const preview = previewGradeRows([['Student Name', 'Email', 'Knowledge (40%)'], ['', '', 'Quiz 1'], ['Jane Doe', 'one@school.edu', 89]], fields, students, scope)
  assert.equal(preview.scores[0].value, 89)
})
