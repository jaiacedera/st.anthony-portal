export type FileCategory = 'knowledge' | 'skills' | 'attitude'
export type GradeFileField = { id: string; category: FileCategory; label: string; aliases?: string[] }
export type GradeFileStudent = { id: string; fullName: string; email: string }
export type GradeFileScope = { instructor: string; subject: string; group: string }
export type GradeImportPreview = ReturnType<typeof previewGradeRows>
export const categoryLabels = { knowledge: 'Knowledge (40%)', skills: 'Skills (40%)', attitude: 'Attitude (20%)' }
const normalize = (value: unknown) => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
const normalizeName = (value: unknown) => normalize(value).replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).sort().join(' ')
const categoryOf = (value: unknown) => /^(knowledge|skills|attitude)(?:\s*\(\s*\d+%\s*\))?$/i.exec(String(value ?? '').trim())?.[1].toLowerCase() as FileCategory | undefined
const calculated = (value: string) => /\b(total|average|weighted|final score|final rating|rating|remarks)\b/i.test(value)

export function previewGradeRows(rows: unknown[][], fields: GradeFileField[], students: GradeFileStudent[], scope: GradeFileScope) {
  let headerIndex = rows.findIndex(row => row.some(value => ['student name', 'email'].includes(normalize(value))))
  if (headerIndex < 0) throw new Error('Include Student Name or Email and category/subgrade headers.')
  const identityRow = rows[headerIndex]
  if (identityRow.some(value => categoryOf(value))) headerIndex++
  if (!rows[headerIndex]) throw new Error('Include a subgrade header row below the categories.')
  const headers = rows[headerIndex].map((value, index) => String(value || (['student name', 'email', 'student id'].includes(normalize(identityRow[index])) ? identityRow[index] : '')).trim())
  const categories = rows[headerIndex - 1] ?? []
  const detected: Partial<GradeFileScope> = {}
  for (const row of rows.slice(0, headerIndex)) {
    const key = normalize(row[0])
    if (['instructor', 'subject', 'group'].includes(key) && row[1]) detected[key as keyof GradeFileScope] = String(row[1]).trim()
  }
  const scopeErrors = Object.entries(detected).filter(([key, value]) => normalize(value) !== normalize(scope[key as keyof GradeFileScope])).map(([key, value]) => `${key}: file says "${value}", selected "${scope[key as keyof GradeFileScope]}".`)
  const duplicateHeaders: string[] = []
  const invalidValues: string[] = []
  const columns: { index: number; field: GradeFileField; isNew: boolean }[] = []
  const seen = new Set<string>()
  let category: FileCategory | undefined
  headers.forEach((label, index) => {
    const categoryCell = String(categories[index] ?? '').trim()
    if (categoryCell) category = categoryOf(categoryCell)
    const qualified = /^(knowledge|skills|attitude)(?:\s*\(\d+%\))?\s*[:/|]\s*(.+)$/i.exec(label)
    const columnCategory = qualified ? qualified[1].toLowerCase() as FileCategory : category
    const name = qualified?.[2] ?? label
    if (!name || calculated(name)) return
    if (['student name', 'email', 'student id'].includes(normalize(name))) {
      const key = normalize(name)
      if (seen.has(key)) duplicateHeaders.push(name)
      seen.add(key)
      return
    }
    const matches = fields.filter(field => (!columnCategory || field.category === columnCategory) && [field.label, ...(field.aliases ?? [])].some(alias => normalize(alias) === normalize(name)))
    if (matches.length > 1 || (!columnCategory && matches.length !== 1)) {
      invalidValues.push(`Header "${label}" needs an unambiguous category.`)
      return
    }
    const field = matches[0] ?? { id: `import-${index}`, category: columnCategory!, label: name }
    const key = `${field.category}:${normalize(field.label)}`
    if (seen.has(key)) duplicateHeaders.push(`${field.category}: ${name}`)
    seen.add(key)
    columns.push({ index, field, isNew: !matches.length })
  })
  const emailIndex = headers.findIndex(header => normalize(header) === 'email')
  const nameIndex = headers.findIndex(header => normalize(header) === 'student name')
  const matchedStudents: string[] = []
  const unmatchedStudents: string[] = []
  const scores: { studentId: string; fieldId: string; value: number | 'INC' }[] = []
  const seenStudents = new Set<string>()
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (!row.some(value => String(value ?? '').trim())) return
    const email = normalize(row[emailIndex])
    const name = normalizeName(row[nameIndex])
    if (!email && !name) return
    let matches = email ? students.filter(student => normalize(student.email) === email) : []
    if (!matches.length && name) matches = students.filter(student => normalizeName(student.fullName) === name)
    const description = String(row[emailIndex] || row[nameIndex] || `Row ${headerIndex + offset + 2}`)
    if (matches.length !== 1) { unmatchedStudents.push(`${description}${matches.length > 1 ? ' (ambiguous)' : ''}`); return }
    const student = matches[0]
    if (seenStudents.has(student.id)) { invalidValues.push(`${description}: duplicate student row (skipped).`); return }
    seenStudents.add(student.id)
    matchedStudents.push(`${student.fullName} (${student.email})`)
    for (const { index, field } of columns) {
      const raw = String(row[index] ?? '').trim()
      if (!raw) continue
      const value = /^(inc|-)$/i.test(raw) ? 'INC' : /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN
      if (value !== 'INC' && (!Number.isFinite(value) || value < 0 || value > 100)) {
        invalidValues.push(`Row ${headerIndex + offset + 2}, ${field.label}: "${raw}" (skipped).`)
      } else scores.push({ studentId: student.id, fieldId: field.id, value })
    }
  })
  return { detected, scopeErrors, matchedStudents, unmatchedStudents, duplicateHeaders, invalidValues, scores,
    newFields: columns.filter(column => column.isNew).map(column => column.field),
    missingFields: fields.filter(field => !columns.some(column => column.field.id === field.id)) }
}

export async function readGradeFile(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) {
    const text = await file.text()
    const rows: string[][] = [[]]
    let cell = '', quoted = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
      else if (!quoted && (ch === ',' || ch === '\n')) {
        rows[rows.length - 1].push(cell.replace(/\r$/, '')); cell = ''
        if (ch === '\n') rows.push([])
      } else cell += ch
    }
    rows[rows.length - 1].push(cell)
    return rows
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx or .csv file.')
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  try { await workbook.xlsx.load(buffer) } catch (error) {
    // Some OpenXML writers prefix main-namespace elements; ExcelJS expects unprefixed tags.
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(buffer)
    let normalized = false
    for (const entry of Object.values(zip.files).filter(entry => entry.name.endsWith('.xml'))) {
      const xml = await entry.async('string')
      const namespace = /xmlns:([\w]+)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/.exec(xml)
      if (!namespace) continue
      zip.file(entry.name, xml.replace(namespace[0], 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(new RegExp(`(<\\/?)${namespace[1]}:`, 'g'), '$1'))
      normalized = true
    }
    if (!normalized) throw error
    await workbook.xlsx.load(await zip.generateAsync({ type: 'arraybuffer' }))
  }
  const sheets = workbook.worksheets.filter(sheet => sheet.state === 'visible')
  if (sheets.length !== 1) throw new Error('Import a workbook with one visible grade sheet.')
  const sheet = sheets[0]
  return Array.from({ length: sheet.rowCount }, (_, row) => Array.from({ length: sheet.columnCount }, (_, col) => {
    const cell = sheet.getCell(row + 1, col + 1)
    return cell.type === ExcelJS.ValueType.Formula ? '=FORMULA' : cell.text
  }))
}

export async function createGradeWorkbook(fields: GradeFileField[], scope: GradeFileScope, rows: unknown[][] = [], calculatedHeaders: string[] = []) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Grades', { views: [{ state: 'frozen', ySplit: 7, xSplit: 2 }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  const width = Math.max(2, 2 + fields.length + calculatedHeaders.length)
  sheet.addRow(['ST. ANTHONY COLLEGE — CALAPAN CITY INC.'])
  sheet.mergeCells(1, 1, 1, width)
  sheet.addRow(['Instructor', scope.instructor])
  sheet.addRow(['Subject', scope.subject])
  sheet.addRow(['Group', scope.group])
  sheet.addRow(['GRADE SHEET — Raw scores: 0–100 or INC. Blank cells preserve existing scores on import.'])
  sheet.mergeCells(5, 1, 5, width)
  sheet.addRow(['', '', ...fields.map(field => categoryLabels[field.category]), ...calculatedHeaders.map(() => 'System Calculated')])
  sheet.addRow(['Student Name', 'Email', ...fields.map(field => field.label), ...calculatedHeaders])
  sheet.addRows(rows.length ? rows : [Array(width).fill('')])
  for (let start = 3; start <= width;) {
    let end = start
    while (end < width && sheet.getCell(6, end + 1).value === sheet.getCell(6, start).value) end++
    if (end > start) sheet.mergeCells(6, start, 6, end)
    start = end + 1
  }
  sheet.columns.forEach((column, i) => { column.width = i < 2 ? 30 : 18 })
  sheet.eachRow((row, index) => {
    row.height = index === 6 || index === 7 ? 34 : 24
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Arial', size: 10, bold: index <= 7, color: { argb: index === 1 || index === 6 ? 'FFFFFFFF' : 'FF222222' } }
      cell.alignment = { vertical: 'middle', horizontal: index <= 1 || Number(cell.col) > 2 ? 'center' : 'left', wrapText: true }
      if (index === 1 || index === 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1D24' } }
      if (index >= 6) cell.border = { bottom: { style: 'thin', color: { argb: 'FFD8D8D8' } } }
      if (index > 7 && Number(cell.col) > 2 && Number(cell.col) <= 2 + fields.length) cell.numFmt = '0.00'
    })
  })
  sheet.pageSetup.printTitlesRow = '1:7'
  sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: width } }
  return workbook
}

export async function downloadGradeWorkbook(filename: string, ...args: Parameters<typeof createGradeWorkbook>) {
  const workbook = await createGradeWorkbook(...args)
  await downloadWorkbook(filename, workbook)
}

export async function downloadWorkbook(filename: string, workbook: Awaited<ReturnType<typeof createGradeWorkbook>>) {
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url; link.download = `${filename}.xlsx`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
