import {
  deleteAccountByAccountId,
  findInstructorAccountByUsername,
  getStudentAccountsByEmail,
  verifyInstructorPassword,
  verifyAccountPassword,
} from '../../database/authStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getRowById } from '../../database/sheetsService.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
}

export async function authenticateInstructor(username, password) {
  const normalizedUsername = username.trim()

  if (!normalizedUsername || !password) {
    return {
      success: false,
      message: 'Username and password are required.',
    }
  }

  const account = findInstructorAccountByUsername(normalizedUsername)

  if (!account || !verifyInstructorPassword(normalizedUsername, password)) {
    return {
      success: false,
      message: 'Invalid username or password.',
    }
  }

  return {
    success: true,
    message: 'Instructor login successful.',
    account: {
      accountId: account.account_id,
      role: account.role,
      username: account.username,
      status: account.status,
    },
  }
}

export async function authenticateStudent(email, password) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return {
      success: false,
      message: 'Email and password are required.',
    }
  }

  const accounts = getStudentAccountsByEmail(normalizedEmail)

  for (const account of accounts) {
    if (!verifyAccountPassword(account, password)) {
      continue
    }

    const student = account.student_id
      ? await getRowById(
          SHEET_NAMES.STUDENTS,
          SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
          account.student_id,
        )
      : null

    if (!student || !isActiveStatus(student.status)) {
      deleteAccountByAccountId(account.account_id)
      continue
    }

    return {
      success: true,
      message: 'Student login successful.',
      account: {
        accountId: account.account_id,
        role: account.role,
        email: account.email ?? account.username,
        username: account.username,
        studentId: account.student_id,
        status: account.status,
      },
    }
  }

  return {
    success: false,
    message: 'Invalid email or password.',
  }
}
