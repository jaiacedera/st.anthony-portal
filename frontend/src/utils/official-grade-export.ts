import type { FileCategory, GradeFileField } from './grade-files'

type ExportStudent = {
  name: string
  scores: Record<string, number | 'INC' | null>
  categories: { key: FileCategory; total: number | null; weighted: number | null; isInc: boolean }[]
  finalScore: number | null; rating: string; remarks: string; isInc: boolean
}
export type ExportGradeGroup = { name: string; fields: GradeFileField[]; students: ExportStudent[] }
const categories = [
  { key: 'knowledge', label: 'Knowledge 40%' },
  { key: 'skills', label: 'Skills 40%' },
  { key: 'attitude', label: 'Attitude 20%' },
] as const

// Official grading-sheet structure, with dynamic columns instead of copied workbook formulas.
export async function createOfficialGradeWorkbook(metadata: {
  schoolYear: string; subject: string; description: string; area?: string; semester: string; date: string
}, groups: ExportGradeGroup[]) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const width = Math.max(11, ...groups.map(group => 11 + group.fields.length))
  const sheet = workbook.addWorksheet('RLE Final Ratings', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 9, showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      horizontalCentered: true, margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } },
  })
  const mergeText = (row: number, start: number, end: number, text: string, bottom = row) => {
    if (start !== end || row !== bottom) sheet.mergeCells(row, start, bottom, end)
    sheet.getCell(row, start).value = text
  }
  const split = Math.max(3, Math.floor(width * 0.68))
  mergeText(1, 1, split, 'ST. ANTHONY COLLEGE')
  mergeText(1, split + 1, width, 'TERM GRADE SHEET')
  mergeText(2, 1, split, 'Bayanan I, City of Calapan')
  mergeText(2, split + 1, width, `School Year: ${metadata.schoolYear}`)
  mergeText(4, 1, split, `Subject: ${metadata.subject}`)
  mergeText(4, split + 1, width, `Area: ${metadata.area ?? ''}`)
  mergeText(5, 1, width, `Description: ${metadata.description}`)
  mergeText(6, 1, split, `Semester: ${metadata.semester}`)
  mergeText(6, split + 1, width, `Date: ${metadata.date}`)
  mergeText(7, 1, width, 'RLE FINAL RATINGS')
  let cursor = 8
  const headerRows = new Set([7])
  const groupRows = new Set<number>()
  const summaryColumns = new Map<number, Set<number>>()
  for (const group of groups) {
    const fields = categories.flatMap(category => group.fields.filter(field => field.category === category.key))
    const start = cursor
    headerRows.add(start); headerRows.add(start + 1)
    mergeText(start, 1, 2, 'NAME', start + 1)
    let column = 3
    const totals = new Set<number>()
    for (const category of categories) {
      const active = fields.filter(field => field.category === category.key)
      if (active.length) {
        mergeText(start, column, column + active.length - 1, category.label)
        for (const field of active) sheet.getCell(start + 1, column++).value = field.label
      }
      totals.add(column)
      mergeText(start, column, column, 'Total', start + 1); column++
      totals.add(column)
      mergeText(start, column, column, category.label, start + 1); column++
    }
    for (const label of ['Final Score', 'Final Rating', 'Remarks']) {
      totals.add(column)
      mergeText(start, column, column, label, start + 1); column++
    }
    cursor += 2
    groupRows.add(cursor)
    mergeText(cursor++, 1, width, /^group\b/i.test(group.name) ? group.name.toUpperCase() : `GROUP: ${group.name}`)
    group.students.forEach((student, index) => {
      const values: (string | number)[] = [index + 1, student.name]
      for (const category of categories) {
        for (const field of fields.filter(field => field.category === category.key)) {
          const score = student.scores[field.id]
          values.push(score === 'INC' ? '-' : score ?? '')
        }
        const result = student.categories.find(item => item.key === category.key)
        values.push(result?.isInc ? '-' : result?.total ?? '', result?.isInc ? '-' : result?.weighted ?? '')
      }
      values.push(student.isInc ? '-' : student.finalScore ?? '', student.rating, student.remarks)
      sheet.getRow(cursor).values = values
      summaryColumns.set(cursor, totals)
      cursor++
    })
  }
  for (let col = 1; col <= width; col++) sheet.getColumn(col).width = col === 1 ? 5 : col === 2 ? 30 : 11
  for (let row = 1; row < cursor; row++) {
    sheet.getRow(row).height = row === 1 ? 48 : row === 3 ? 8 : headerRows.has(row) ? 34 : 24
    for (let col = 1; col <= width; col++) {
      const cell = sheet.getCell(row, col)
      const header = headerRows.has(row)
      const group = groupRows.has(row)
      cell.font = { name: 'Century Gothic', size: row === 1 ? 14 : 10, bold: row <= 9 || header || group || col === 2,
        color: { argb: header ? 'FFFFFFFF' : 'FF222222' } }
      cell.alignment = { vertical: 'middle', horizontal: row <= 2 || header || (row >= 8 && col !== 2 && !group) ? 'center' : 'left', wrapText: true }
      if (header || group) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: header ? 'FF800A09' : 'FFF7E3E3' } }
      if (row >= 7) cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      if (row > 9 && !header && !group && col > 2) cell.numFmt = '0.00'
      if (summaryColumns.get(row)?.has(col)) cell.font = { ...cell.font, bold: true }
    }
  }
  sheet.pageSetup.printTitlesRow = '1:9'
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(width).letter}${cursor - 1}`
  return workbook
}
