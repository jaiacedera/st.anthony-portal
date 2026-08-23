import { getStudentApprovedGradeBreakdownResponse } from '../../database/sheetsService.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getRowById } from '../../database/sheetsService.js'
import { findStudentAccountByEmail } from '../../database/studentAuthStore.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
}

async function resolveStudentRecord({ studentId, email }) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (normalizedStudentId) {
    const student = await getRowById(
      SHEET_NAMES.STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
      normalizedStudentId,
    )

    if (student && isActiveStatus(student.status)) {
      return student
    }

    const error = new Error('Student session is no longer available. Please sign in again.')
    error.statusCode = 401
    throw error
  }

  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    const error = new Error('Student identity is required.')
    error.statusCode = 400
    throw error
  }

  const account = await findStudentAccountByEmail(normalizedEmail)

  if (!account?.student_id) {
    const error = new Error('Student account was not found.')
    error.statusCode = 404
    throw error
  }

  const student = await getRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    account.student_id,
  )

  if (!student || !isActiveStatus(student.status)) {
    const error = new Error('Student record was not found.')
    error.statusCode = 404
    throw error
  }

  return student
}

export async function getStudentRequestResponse({
  requestId,
  studentId = '',
  email = '',
}) {
  const student = await resolveStudentRecord({ studentId, email })
  const response = await getStudentApprovedGradeBreakdownResponse({
    requestId,
    studentId: String(student.student_id ?? '').trim(),
  })

  return {
    success: true,
    response,
  }
}
