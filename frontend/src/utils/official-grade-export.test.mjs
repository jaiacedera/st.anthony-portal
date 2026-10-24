import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
globalThis.fetch = async () => new Response(await readFile(new URL('../../public/templates/grade-sheet-export-master.xlsx', import.meta.url)))
import { createOfficialGradeWorkbook } from './official-grade-export.ts'

const metadata = { schoolYear: '2026–2027', subject: 'NCM 114', description: 'Care of Older Adults', semester: 'First Semester', date: '24/10/2026' }
const fields = [
  { id: 'fdar', category: 'skills', label: 'FDAR' },
  { id: 'quiz2', category: 'knowledge', label: 'Quiz 2' },
  { id: 'attendance', category: 'attitude', label: 'Attendance' },
]
const student = {
  name: 'Test Student', scores: { quiz2: 91, fdar: 82, attendance: 95 },
  categories: [
    { key: 'knowledge', total: 90, weighted: 36, isInc: false },
    { key: 'skills', total: 84, weighted: 33.6, isInc: false },
    { key: 'attitude', total: 96, weighted: 19.2, isInc: false },
  ], finalScore: 88.8, rating: '1.75', remarks: 'PASSED', isInc: false,
}

test('official layout uses grouped dynamic headers and exact system totals without formulas or email columns', async () => {
  const workbook = await createOfficialGradeWorkbook(metadata, [{ name: 'Group 1', fields, students: [student] }])
  const sheet = workbook.worksheets[0]
  assert.equal(sheet.getCell('B1').value, 'ST. ANTHONY COLLEGE')
  assert.equal(sheet.getCell('B2').value, 'Bayanan I, City of Calapan')
  assert.equal(sheet.getCell('A7').value, 'RLE FINAL RATINGS')
  assert.ok(sheet.model.merges.includes('A8:B9'))
  assert.equal(sheet.getCell('C8').value, 'Knowledge 40%')
  assert.equal(sheet.getCell('C9').value, 'Quiz 2')
  assert.equal(sheet.getCell('F9').value, 'FDAR')
  assert.equal(sheet.getCell('I9').value, 'Attendance')
  assert.equal(sheet.getCell('B10').value, 'GROUP: Group 1')
  assert.deepEqual(sheet.getRow(11).values.slice(1), [1, 'Test Student', 91, 90, 36, 82, 84, 33.6, 95, 96, 19.2, 88.8, '1.75', 'PASSED'])
  assert.equal(sheet.getRow(1).height, 72)
  assert.equal(sheet.getColumn(2).width, 29.44140625)
  assert.equal(sheet.getCell('C11').border.bottom.style, 'thin')
  const values = []
  sheet.eachRow(row => row.eachCell(cell => { assert.equal(cell.formula, undefined); values.push(cell.value) }))
  for (const excluded of ['Email', 'MEDS', 'KARDEX']) assert.ok(!values.includes(excluded))
  // Verify merges and scores survive writing an actual XLSX.
  const { default: ExcelJS } = await import('exceljs')
  const loaded = new ExcelJS.Workbook()
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer())
  assert.equal(loaded.worksheets[0].getCell('L11').value, 88.8)
})

test('groups use separate sheets with their own active columns, and INC remains incomplete', async () => {
  const incomplete = { ...student, scores: { quiz2: 'INC' }, categories: [{ key: 'knowledge', total: null, weighted: null, isInc: true }], finalScore: null, rating: 'INC', remarks: 'Incomplete', isInc: true }
  const workbook = await createOfficialGradeWorkbook(metadata, [
    { name: 'Group 1', fields, students: [student] },
    { name: 'Group 2', fields: [fields[1]], students: [incomplete] },
  ])
  assert.equal(workbook.worksheets.length, 2)
  const sheet = workbook.worksheets[1]
  assert.equal(sheet.getCell('B10').value, 'GROUP: Group 2')
  assert.equal(sheet.getCell('C9').value, 'Quiz 2')
  assert.deepEqual(sheet.getRow(11).values.slice(1), [1, 'Test Student', '-', '-', '-', '', '', '', '', '-', 'INC', 'Incomplete'])
  assert.equal(sheet.getCell('F8').value, 'TOTAL')
  assert.equal(sheet.getCell('A12').value, 'x-x-xNothing Followsx-x-x')
  assert.equal(sheet.getImages().length, 1)
  const { default: ExcelJS } = await import('exceljs')
  const loaded = new ExcelJS.Workbook()
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer())
  assert.equal(loaded.worksheets.length, 2)
  assert.equal(loaded.worksheets[1].getCell('L11').value, 'Incomplete')
  assert.equal(loaded.worksheets[1].getImages().length, 1)
})

test('expands styled student rows and active columns, moves signatures, and handles empty categories', async () => {
  for (const count of [0, 20]) {
    const active = Array.from({ length: count }, (_, i) => ({ id: `q${i}`, category: 'knowledge', label: `Quiz ${i + 1}` }))
    const workbook = await createOfficialGradeWorkbook({ ...metadata, professor: 'Professor Test' }, [
      { name: 'Group / A very long name beyond the Excel limit', fields: active, students: Array(40).fill(student) },
      { name: 'Group / A very long name beyond the Excel limit', fields: [], students: [] },
    ])
    const sheet = workbook.worksheets[0]
    assert.equal(sheet.getCell('A51').value, 'x-x-xNothing Followsx-x-x')
    assert.equal(sheet.getCell('B54').value, 'Professor Test')
    assert.equal(sheet.getCell('B55').value, 'CLINICAL INSTRUCTOR')
    assert.equal(sheet.getCell('A50').value, 40)
    assert.equal(sheet.getRow(50).height, 15)
    assert.equal(sheet.getCell('C50').border.bottom.style, 'thin')
    assert.equal(sheet.columnCount, count + 11)
    assert.equal(workbook.worksheets[1].getCell('A11').value, 'x-x-xNothing Followsx-x-x')
    assert.notEqual(sheet.name, workbook.worksheets[1].name)
    assert.ok(workbook.worksheets.every(sheet => sheet.name.length <= 31))
    await workbook.xlsx.writeBuffer()
  }
})
