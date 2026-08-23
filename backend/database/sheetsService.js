import { randomUUID } from 'node:crypto'
import { createSheetsClient, getSpreadsheetId } from './googleSheets.js'
import {
  SHEET_HEADERS,
  SHEET_ID_COLUMNS,
  SHEET_NAMES,
  getSheetHeaders,
} from './sheetsSchema.js'

function getSheetRange(sheetName, range) {
  return `'${sheetName}'!${range}`
}

function toCellValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function normalizeForComparison(value) {
  return toCellValue(value).trim()
}

function isActiveStatus(value) {
  return normalizeForComparison(value).toUpperCase() !== 'INACTIVE'
}

function resolveSheetHeaders(sheetName, values = []) {
  const schemaHeaders = getSheetHeaders(sheetName)
  const actualHeaders = Array.isArray(values[0])
    ? values[0]
        .map((header) => normalizeForComparison(header))
        .filter(Boolean)
    : []

  return actualHeaders.length ? actualHeaders : schemaHeaders
}

function toRowObject(headers, row = []) {
  return headers.reduce(
    (record, header, index) => ({
      ...record,
      [header]: row[index] ?? '',
    }),
    {},
  )
}

function columnNumberToName(columnNumber) {
  let current = columnNumber
  let name = ''

  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }

  return name
}

function buildRowValues(headers, record) {
  return headers.map((header) => toCellValue(record[header]))
}

async function ensureSheetInitialized(sheetName) {
  const sheetProperties = await getSheetPropertiesByName(sheetName)
  const headers = getSheetHeaders(sheetName)
  const sheets = createSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  if (!sheetProperties) {
    await runSheetsRequest(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      }),
    )

    await runSheetsRequest(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: getSheetRange(sheetName, 'A1'),
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      }),
    )

    return
  }

  const response = await runSheetsRequest(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: getSheetRange(sheetName, '1:1'),
    }),
  )
  const currentHeaderRow = response.data.values?.[0] ?? []
  const hasHeaderValues = currentHeaderRow.some(
    (value) => String(value ?? '').trim() !== '',
  )

  if (!hasHeaderValues) {
    await runSheetsRequest(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: getSheetRange(sheetName, 'A1'),
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      }),
    )

    return
  }

  const headersMatch = headers.every(
    (header, index) =>
      normalizeForComparison(currentHeaderRow[index]) === normalizeForComparison(header),
  )

  if (!headersMatch) {
    throw new Error(
      `Sheet "${sheetName}" has unexpected headers. Update the tab manually before continuing.`,
    )
  }
}

async function getSheetMatrix(sheetName) {
  await ensureSheetInitialized(sheetName)
  const sheets = createSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const response = await runSheetsRequest(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: getSheetRange(sheetName, 'A:ZZ'),
    }),
  )

  return {
    sheets,
    spreadsheetId,
    values: response.data.values ?? [],
  }
}

async function getSheetRowState(sheetName, idColumn, id) {
  const { sheets, spreadsheetId, values } = await getSheetMatrix(sheetName)
  const headers = resolveSheetHeaders(sheetName, values)
  const idColumnIndex = headers.indexOf(idColumn)

  if (idColumnIndex < 0) {
    throw new Error(`Unknown id column "${idColumn}" for sheet "${sheetName}"`)
  }

  const dataRows = values.slice(1)
  const rowIndex = dataRows.findIndex(
    (row) => normalizeForComparison(row[idColumnIndex]) === normalizeForComparison(id),
  )

  return {
    sheets,
    spreadsheetId,
    headers,
    dataRows,
    rowIndex,
    rowNumber: rowIndex >= 0 ? rowIndex + 2 : -1,
  }
}

async function getSheetPropertiesByName(sheetName) {
  const sheets = createSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const response = await runSheetsRequest(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    }),
  )

  return (response.data.sheets ?? []).find(
    (sheet) => sheet.properties?.title === sheetName,
  )?.properties
}

function assertRecordExists(record, message) {
  if (!record) {
    throw new Error(message)
  }
}

function toGoogleSheetsServiceError(error) {
  const responseMessage =
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    error.response.data.error &&
    typeof error.response.data.error === 'object' &&
    'message' in error.response.data.error
      ? String(error.response.data.error.message ?? '').trim()
      : ''
  const fallbackMessage =
    error instanceof Error ? error.message.trim() : 'Unable to reach Google Sheets.'
  const nextError = new Error(responseMessage || fallbackMessage || 'Unable to reach Google Sheets.')
  nextError.statusCode = 503
  nextError.expose = true
  return nextError
}

async function runSheetsRequest(request) {
  try {
    return await request()
  } catch (error) {
    throw toGoogleSheetsServiceError(error)
  }
}

export async function getAllRows(sheetName) {
  const { values } = await getSheetMatrix(sheetName)
  const headers = resolveSheetHeaders(sheetName, values)

  return values.slice(1).map((row) => toRowObject(headers, row))
}

export async function getRowById(sheetName, idColumn, id) {
  const rows = await getAllRows(sheetName)

  return (
    rows.find(
      (row) => normalizeForComparison(row[idColumn]) === normalizeForComparison(id),
    ) ?? null
  )
}

export async function findRows(sheetName, filters = {}) {
  const rows = await getAllRows(sheetName)

  return rows.filter((row) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined) {
        return true
      }

      return normalizeForComparison(row[key]) === normalizeForComparison(value)
    }),
  )
}

export async function appendRow(sheetName, record) {
  const { sheets, spreadsheetId, values } = await getSheetMatrix(sheetName)
  const headers = resolveSheetHeaders(sheetName, values)
  const rowValues = buildRowValues(headers, record)

  await runSheetsRequest(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: getSheetRange(sheetName, 'A:ZZ'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    }),
  )

  return toRowObject(headers, rowValues)
}

export async function updateRowById(sheetName, idColumn, id, updates) {
  const rowState = await getSheetRowState(sheetName, idColumn, id)

  if (rowState.rowIndex < 0) {
    return null
  }

  const existingRecord = toRowObject(
    rowState.headers,
    rowState.dataRows[rowState.rowIndex],
  )
  const nextRecord = {
    ...existingRecord,
    ...updates,
  }
  const lastColumn = columnNumberToName(rowState.headers.length)

  await runSheetsRequest(() =>
    rowState.sheets.spreadsheets.values.update({
      spreadsheetId: rowState.spreadsheetId,
      range: getSheetRange(
        sheetName,
        `A${rowState.rowNumber}:${lastColumn}${rowState.rowNumber}`,
      ),
      valueInputOption: 'RAW',
      requestBody: {
        values: [buildRowValues(rowState.headers, nextRecord)],
      },
    }),
  )

  return nextRecord
}

export async function deleteRowById(sheetName, idColumn, id) {
  const rowState = await getSheetRowState(sheetName, idColumn, id)

  if (rowState.rowIndex < 0) {
    return false
  }

  const sheetProperties = await getSheetPropertiesByName(sheetName)

  if (sheetProperties?.sheetId === undefined) {
    throw new Error(`Unable to resolve sheet id for "${sheetName}"`)
  }

  await runSheetsRequest(() =>
    rowState.sheets.spreadsheets.batchUpdate({
      spreadsheetId: rowState.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetProperties.sheetId,
                dimension: 'ROWS',
                startIndex: rowState.rowNumber - 1,
                endIndex: rowState.rowNumber,
              },
            },
          },
        ],
      },
    }),
  )

  return true
}

export async function createSubject({
  instructorId,
  subjectCode,
  subjectName,
  semester,
  schoolYear,
  schedule,
  room,
}) {
  const instructor = await getRowById(
    SHEET_NAMES.INSTRUCTORS,
    SHEET_ID_COLUMNS[SHEET_NAMES.INSTRUCTORS],
    instructorId,
  )

  assertRecordExists(instructor, 'Instructor does not exist.')

  if (!subjectCode?.trim()) {
    throw new Error('Subject code is required.')
  }

  if (!subjectName?.trim()) {
    throw new Error('Subject name is required.')
  }

  const timestamp = new Date().toISOString()

  return appendRow(SHEET_NAMES.SUBJECTS, {
    subject_id: randomUUID(),
    subject_code: subjectCode.trim(),
    subject_name: subjectName.trim(),
    instructor_id: instructorId,
    semester: toCellValue(semester),
    school_year: toCellValue(schoolYear),
    schedule: toCellValue(schedule),
    room: toCellValue(room),
    status: 'ACTIVE',
    created_at: timestamp,
    updated_at: timestamp,
  })
}

export async function createStudent({
  studentNumber,
  email,
  firstName,
  middleName,
  lastName,
  yearLevel,
}) {
  if (!email?.trim()) {
    throw new Error('Student email is required.')
  }

  if (studentNumber?.trim()) {
    const duplicateStudentNumber = await findRows(SHEET_NAMES.STUDENTS, {
      student_number: studentNumber.trim(),
    })

    if (duplicateStudentNumber.some((student) => isActiveStatus(student.status))) {
      throw new Error('A student with this student number already exists.')
    }
  }

  const duplicateEmail = await findRows(SHEET_NAMES.STUDENTS, {
    email: email.trim(),
  })

  if (duplicateEmail.some((student) => isActiveStatus(student.status))) {
    throw new Error('A student with this email already exists.')
  }

  const timestamp = new Date().toISOString()

  return appendRow(SHEET_NAMES.STUDENTS, {
    student_id: randomUUID(),
    student_number: toCellValue(studentNumber),
    email: email.trim(),
    first_name: toCellValue(firstName),
    middle_name: toCellValue(middleName),
    last_name: toCellValue(lastName),
    year_level: toCellValue(yearLevel),
    status: 'ACTIVE',
    created_at: timestamp,
    updated_at: timestamp,
  })
}

export async function addStudentToSubject({ subjectId, studentId, addedBy }) {
  const [student, subject] = await Promise.all([
    getRowById(
      SHEET_NAMES.STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
      studentId,
    ),
    getRowById(
      SHEET_NAMES.SUBJECTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
      subjectId,
    ),
  ])

  assertRecordExists(student, 'Student does not exist.')
  assertRecordExists(subject, 'Subject does not exist.')

  if (subject.instructor_id !== addedBy) {
    throw new Error('Instructor does not own this subject.')
  }

  const duplicates = await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
    subject_id: subjectId,
    student_id: studentId,
    status: 'ACTIVE',
  })

  if (duplicates.length > 0) {
    return {
      success: false,
      message: 'Student is already added to this subject.',
    }
  }

  return {
    success: true,
    record: await appendRow(SHEET_NAMES.SUBJECT_STUDENTS, {
      subject_student_id: randomUUID(),
      subject_id: subjectId,
      student_id: studentId,
      added_by: addedBy,
      added_at: new Date().toISOString(),
      status: 'ACTIVE',
    }),
  }
}

export async function upsertGrade({
  subjectId,
  studentId,
  prelim = '',
  midterm = '',
  final = '',
  currentGrade = '',
  remarks = '',
  postedBy,
}) {
  const [subject, student] = await Promise.all([
    getRowById(
      SHEET_NAMES.SUBJECTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
      subjectId,
    ),
    getRowById(
      SHEET_NAMES.STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
      studentId,
    ),
  ])

  assertRecordExists(subject, 'Subject does not exist.')
  assertRecordExists(student, 'Student does not exist.')

  if (subject.instructor_id !== postedBy) {
    throw new Error('Instructor does not own this subject.')
  }

  const subjectStudent = await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
    subject_id: subjectId,
    student_id: studentId,
    status: 'ACTIVE',
  })

  if (subjectStudent.length === 0) {
    throw new Error('Student is not added to this subject.')
  }

  const existingGrade = await findRows(SHEET_NAMES.GRADES, {
    subject_id: subjectId,
    student_id: studentId,
  })
  const timestamp = new Date().toISOString()

  if (existingGrade.length > 0) {
    return updateRowById(
      SHEET_NAMES.GRADES,
      SHEET_ID_COLUMNS[SHEET_NAMES.GRADES],
      existingGrade[0].grade_id,
      {
        prelim: toCellValue(prelim),
        midterm: toCellValue(midterm),
        final: toCellValue(final),
        current_grade: toCellValue(currentGrade),
        remarks: toCellValue(remarks),
        posted_by: postedBy,
        updated_at: timestamp,
      },
    )
  }

  return appendRow(SHEET_NAMES.GRADES, {
    grade_id: randomUUID(),
    subject_id: subjectId,
    student_id: studentId,
    prelim: toCellValue(prelim),
    midterm: toCellValue(midterm),
    final: toCellValue(final),
    current_grade: toCellValue(currentGrade),
    remarks: toCellValue(remarks),
    posted_by: postedBy,
    posted_at: timestamp,
    updated_at: timestamp,
  })
}

export async function getGradePublication({ subjectId, gradingPeriod }) {
  return (
    (
      await findRows(SHEET_NAMES.GRADE_PUBLICATIONS, {
        subject_id: subjectId,
        grading_period: gradingPeriod,
      })
    )[0] ?? null
  )
}

export async function upsertGradePublication({
  subjectId,
  gradingPeriod,
  postedBy,
}) {
  const subject = await getRowById(
    SHEET_NAMES.SUBJECTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
    subjectId,
  )

  assertRecordExists(subject, 'Subject does not exist.')

  if (subject.instructor_id !== postedBy) {
    throw new Error('Instructor does not own this subject.')
  }

  const existingPublication = await getGradePublication({ subjectId, gradingPeriod })
  const timestamp = new Date().toISOString()

  if (existingPublication) {
    return updateRowById(
      SHEET_NAMES.GRADE_PUBLICATIONS,
      SHEET_ID_COLUMNS[SHEET_NAMES.GRADE_PUBLICATIONS],
      existingPublication.publication_id,
      {
        is_posted: 'TRUE',
        posted_by: postedBy,
        posted_at: timestamp,
        updated_at: timestamp,
      },
    )
  }

  return appendRow(SHEET_NAMES.GRADE_PUBLICATIONS, {
    publication_id: randomUUID(),
    subject_id: subjectId,
    grading_period: gradingPeriod,
    is_posted: 'TRUE',
    posted_by: postedBy,
    posted_at: timestamp,
    updated_at: timestamp,
  })
}

export async function createGradeBreakdownRequest({
  studentId,
  subjectId,
  gradeId,
  reason,
}) {
  const [student, subject, grade] = await Promise.all([
    getRowById(
      SHEET_NAMES.STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
      studentId,
    ),
    getRowById(
      SHEET_NAMES.SUBJECTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
      subjectId,
    ),
    getRowById(
      SHEET_NAMES.GRADES,
      SHEET_ID_COLUMNS[SHEET_NAMES.GRADES],
      gradeId,
    ),
  ])

  assertRecordExists(student, 'Student does not exist.')
  assertRecordExists(subject, 'Subject does not exist.')
  assertRecordExists(grade, 'Grade does not exist.')

  const subjectStudent = await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
    subject_id: subjectId,
    student_id: studentId,
    status: 'ACTIVE',
  })

  if (subjectStudent.length === 0) {
    throw new Error('Student does not belong to this subject.')
  }

  const gradePublications = await findRows(SHEET_NAMES.GRADE_PUBLICATIONS, {
    subject_id: subjectId,
    is_posted: 'TRUE',
  })

  if (gradePublications.length === 0) {
    const error = new Error('Grades have not been posted yet.')
    error.statusCode = 403
    throw error
  }

  const pendingRequests = await findRows(SHEET_NAMES.GRADE_REQUESTS, {
    student_id: studentId,
    subject_id: subjectId,
    grade_id: gradeId,
    status: 'PENDING',
  })

  if (pendingRequests.length > 0) {
    return {
      success: false,
      message: 'A pending grade breakdown request already exists.',
    }
  }

  return {
    success: true,
    record: await appendRow(SHEET_NAMES.GRADE_REQUESTS, {
      request_id: randomUUID(),
      student_id: studentId,
      subject_id: subjectId,
      grade_id: gradeId,
      reason: toCellValue(reason),
      status: 'PENDING',
      requested_at: new Date().toISOString(),
      reviewed_at: '',
      reviewed_by: '',
    }),
  }
}

export async function reviewGradeBreakdownRequest({
  requestId,
  status,
  reviewedBy,
}) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new Error('Review status must be APPROVED or REJECTED.')
  }

  const request = await getRowById(
    SHEET_NAMES.GRADE_REQUESTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.GRADE_REQUESTS],
    requestId,
  )

  assertRecordExists(request, 'Grade breakdown request does not exist.')

  const subject = await getRowById(
    SHEET_NAMES.SUBJECTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
    request.subject_id,
  )

  assertRecordExists(subject, 'Subject does not exist.')

  if (subject.instructor_id !== reviewedBy) {
    throw new Error('Instructor does not own this subject.')
  }

  return updateRowById(
    SHEET_NAMES.GRADE_REQUESTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.GRADE_REQUESTS],
    requestId,
    {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    },
  )
}

export async function getStudentSubjects(studentId) {
  const subjectLinks = await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
    student_id: studentId,
    status: 'ACTIVE',
  })
  const subjects = await getAllRows(SHEET_NAMES.SUBJECTS)

  return subjectLinks
    .map((link) =>
      subjects.find((subject) => subject.subject_id === link.subject_id) ?? null,
    )
    .filter(Boolean)
}

export async function getStudentGrades(studentId) {
  const [subjectLinks, grades, subjects] = await Promise.all([
    findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
      student_id: studentId,
      status: 'ACTIVE',
    }),
    getAllRows(SHEET_NAMES.GRADES),
    getAllRows(SHEET_NAMES.SUBJECTS),
  ])
  const subjectIds = new Set(subjectLinks.map((link) => link.subject_id))

  return grades
    .filter((grade) => grade.student_id === studentId && subjectIds.has(grade.subject_id))
    .map((grade) => {
      const subject = subjects.find(
        (currentSubject) => currentSubject.subject_id === grade.subject_id,
      )

      return {
        subject_id: grade.subject_id,
        subject_code: subject?.subject_code ?? '',
        subject_name: subject?.subject_name ?? '',
        final_grade: grade.current_grade || grade.final,
        remarks: grade.remarks,
      }
    })
}

export async function getStudentGradeRequests(studentId) {
  return findRows(SHEET_NAMES.GRADE_REQUESTS, {
    student_id: studentId,
  })
}

export async function getInstructorSubjects(instructorId) {
  return findRows(SHEET_NAMES.SUBJECTS, {
    instructor_id: instructorId,
  })
}

export async function getSubjectStudents(subjectId, instructorId) {
  const subject = await getRowById(
    SHEET_NAMES.SUBJECTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECTS],
    subjectId,
  )

  assertRecordExists(subject, 'Subject does not exist.')

  if (subject.instructor_id !== instructorId) {
    throw new Error('Instructor does not own this subject.')
  }

  const [links, students] = await Promise.all([
    findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
      subject_id: subjectId,
      status: 'ACTIVE',
    }),
    getAllRows(SHEET_NAMES.STUDENTS),
  ])

  return links
    .map((link) =>
      students.find((student) => student.student_id === link.student_id) ?? null,
    )
    .filter(Boolean)
}

export async function getApprovedGradeBreakdown({ gradeId, studentId }) {
  const grade = await getRowById(
    SHEET_NAMES.GRADES,
    SHEET_ID_COLUMNS[SHEET_NAMES.GRADES],
    gradeId,
  )

  assertRecordExists(grade, 'Grade does not exist.')

  const approvedRequest = (
    await findRows(SHEET_NAMES.GRADE_REQUESTS, {
      grade_id: gradeId,
      student_id: studentId,
      status: 'APPROVED',
    })
  )[0]

  if (!approvedRequest) {
    const error = new Error('Grade breakdown has not been approved.')
    error.statusCode = 403
    throw error
  }

  return {
    grade_id: grade.grade_id,
    subject_id: grade.subject_id,
    student_id: grade.student_id,
    prelim: grade.prelim,
    midterm: grade.midterm,
    final: grade.final,
    current_grade: grade.current_grade,
    remarks: grade.remarks,
    posted_at: grade.posted_at,
    updated_at: grade.updated_at,
  }
}

export function getGoogleSheetsSchemaSummary() {
  return Object.entries(SHEET_HEADERS).map(([sheetName, headers]) => ({
    sheetName,
    headers,
  }))
}
