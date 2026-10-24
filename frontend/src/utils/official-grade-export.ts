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

// The bundled master only normalizes XML namespace prefixes for ExcelJS compatibility.
export async function createOfficialGradeWorkbook(metadata: {
  schoolYear: string; subject: string; description: string; area?: string; semester: string; date: string; professor?: string
}, groups: ExportGradeGroup[]) {
  const { default: ExcelJS } = await import('exceljs')
  const response = await fetch(`${import.meta.env?.BASE_URL ?? '/'}templates/grade-sheet-export-master.xlsx`)
  if (!response.ok) throw new Error('Unable to load grade sheet master')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await response.arrayBuffer())
  const master = workbook.worksheets[0]
  const model = structuredClone(master.model)
  const sourceRows = Array.from({ length: 31 }, (_, index) => {
    const row = master.getRow(index + 1)
    return { height: row.height, cells: Array.from({ length: 49 }, (_, col) => {
      const cell = row.getCell(col + 1)
      return { style: structuredClone(cell.style), value: cell.isMerged && cell.master !== cell ? null : cell.value }
    }) }
  })
  const widths = Array.from({ length: 49 }, (_, index) => master.getColumn(index + 1).width)
  const ranges = model.merges.map(range => {
    const [start, end] = range.split(':').map(address => master.getCell(address))
    return { top: Number(start.row), bottom: Number(end.row), left: Number(start.col), right: Number(end.col) }
  })
  const usedNames = new Set<string>()
  for (const [index, group] of groups.entries()) {
    const base = `${metadata.subject} ${group.name}`.replace(/[\\/*?:[\]]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Grades'
    let name = base.slice(0, 31), suffix = 1
    while (usedNames.has(name.toLowerCase())) { const tail = ` (${++suffix})`; name = base.slice(0, 31 - tail.length) + tail }
    usedNames.add(name.toLowerCase())
    const sheet = index === 0 ? master : workbook.addWorksheet(name)
    if (index > 0) sheet.model = structuredClone(model)
    sheet.name = name
    for (const range of model.merges) sheet.unMergeCells(range)
    sheet.model = { ...sheet.model, rows: [], cols: [], merges: [] } as typeof sheet.model
    // Drop unused template column definitions (the master defines columns to XFD).
    sheet.columns = []
    sheet.removeConditionalFormatting(() => true) // Old rules reference obsolete columns.
    const fields = categories.flatMap(category => group.fields.filter(field => field.category === category.key))
    const columns = [1, 2]
    const categoryStarts: number[] = []
    for (const [i, category] of categories.entries()) {
      categoryStarts.push(columns.length + 1)
      columns.push(...fields.filter(field => field.category === category.key).map(() => [4, 15, 38][i]), ...[[13, 14], [26, 27], [41, 42]][i])
    }
    columns.push(43, 44, 46)
    const width = columns.length
    const boundary = (col: number) => col <= 2 ? col : Math.min(width + 1, 3 + Math.floor((col - 3) * (width - 2) / 44))
    const footerRow = 11 + group.students.length
    const rowNumber = (row: number) => row >= 26 ? footerRow + row - 26 : row
    const copyCell = (row: number, col: number, originalRow: number, originalCol: number, value?: import('exceljs').CellValue) => {
      const source = sourceRows[originalRow - 1].cells[originalCol - 1]
      const cell = sheet.getCell(row, col)
      cell.style = structuredClone(source.style)
      cell.value = value === undefined ? source.value : value
    }
    // Retain the master header/footer cells and styles, remapping their spans to the new width.
    for (const oldRow of [...Array.from({ length: 7 }, (_, i) => i + 1), 26, 27, 28, 29, 30, 31]) {
      const row = rowNumber(oldRow)
      sheet.getRow(row).height = sourceRows[oldRow - 1].height
      for (let col = 1; col <= width; col++) copyCell(row, col, oldRow, columns[col - 1], null)
      sourceRows[oldRow - 1].cells.forEach((cell, col) => {
        if (cell.value !== null && cell.value !== undefined) copyCell(row, Math.min(width, boundary(col + 1)), oldRow, col + 1)
      })
    }
    for (const range of ranges.filter(range => range.top < 8 || range.top >= 26)) {
      const left = Math.min(width, boundary(range.left)), right = Math.max(left, Math.min(width, boundary(range.right + 1) - 1))
      if (left < right || range.top < range.bottom) sheet.mergeCells(rowNumber(range.top), left, rowNumber(range.bottom), right)
    }
    for (let row = 8; row < footerRow; row++) {
      sheet.getRow(row).height = sourceRows[Math.min(row, 11) - 1].height
      columns.forEach((original, col) => copyCell(row, col + 1, Math.min(row, 11), original, null))
    }
    columns.forEach((original, col) => { sheet.getColumn(col + 1).width = widths[original - 1] })
    sheet.mergeCells(8, 1, 9, 2)
    sheet.getCell(8, 1).value = 'NAME'
    for (const [i, category] of categories.entries()) {
      const active = fields.filter(field => field.category === category.key)
      const start = categoryStarts[i], total = start + active.length
      if (active.length > 1) sheet.mergeCells(8, start, 8, total - 1)
      if (active.length) sheet.getCell(8, start).value = category.label
      active.forEach((field, col) => { sheet.getCell(9, start + col).value = field.label })
      for (const [col, label] of [[total, 'TOTAL'], [total + 1, category.label]] as const) {
        sheet.mergeCells(8, col, 9, col); sheet.getCell(8, col).value = label
      }
    }
    for (const [i, label] of ['Final Score', 'Final Rating', 'Remarks'].entries()) {
      sheet.mergeCells(8, width - 2 + i, 9, width - 2 + i)
      sheet.getCell(8, width - 2 + i).value = label
    }
    sheet.getCell('B10').value = `GROUP: ${group.name}`
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
      values.push(student.isInc ? '-' : student.finalScore ?? '', student.isInc ? 'INC' : student.rating, student.remarks)
      values.forEach((value, col) => { sheet.getCell(11 + index, col + 1).value = value })
    })
    sheet.getCell(1, boundary(41)).value = `TERM GRADE SHEET\nAY ${metadata.schoolYear}`
    sheet.getCell('A4').value = `Subject: ${metadata.subject}`
    sheet.getCell('B5').value = `DESCRIPTION: ${metadata.description}`
    sheet.getCell('A6').value = `Semester: ${metadata.semester}`
    sheet.getCell(4, boundary(27)).value = `AREA: ${metadata.area ?? ''}`
    sheet.getCell(6, boundary(27)).value = `DATE: ${metadata.date}`
    if (metadata.professor) sheet.getCell(rowNumber(29), 2).value = metadata.professor
    sheet.getCell(footerRow, 1).value = 'x-x-xNothing Followsx-x-x'
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(width).letter}${rowNumber(31)}`
  }
  return workbook
}
