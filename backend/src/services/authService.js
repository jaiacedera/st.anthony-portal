import {
  findInstructorAccountByUsername,
  verifyInstructorPassword,
} from '../../database/authStore.js'
import {
  getStudentAccountsByEmail,
  verifyAccountPassword,
} from '../../database/studentAuthStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getRowById } from '../../database/sheetsService.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
}

function logStudentAuthEvent(event, details) {
  console.info('[student-auth]', {
    event,
    ...details,
  })
}

async function loadStudentRecordById(studentId) {
  if (!studentId?.trim()) {
    return null
  }

  return getRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    studentId,
  )
}

function buildInvalidStudentCredentialsPayload() {
  return {
    success: false,
    message: 'Invalid email or password.',
  }
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
  return authenticateStudentWithResolver(email, password)
}

export async function authenticateStudentWithResolver(
  email,
  password,
  {
    loadStudentById = loadStudentRecordById,
    loadStudentAccountsByEmail = getStudentAccountsByEmail,
  } = {},
) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return {
      success: false,
      message: 'Email and password are required.',
    }
  }

  let accounts = []

  try {
    accounts = await loadStudentAccountsByEmail(normalizedEmail)
  } catch (error) {
    logStudentAuthEvent('AUTH_PROVIDER_ERROR', {
      normalizedEmail,
      message: error instanceof Error ? error.message : 'Unknown auth account lookup error.',
    })

    throw error
  }

  if (!accounts.length) {
    logStudentAuthEvent('ACCOUNT_NOT_FOUND', {
      normalizedEmail,
      accountFound: false,
    })

    return buildInvalidStudentCredentialsPayload()
  }

  for (const account of accounts) {
    if (String(account.status ?? '').trim().toUpperCase() !== 'ACTIVE') {
      logStudentAuthEvent('ACCOUNT_DISABLED', {
        normalizedEmail,
        accountId: account.account_id,
        accountStatus: account.status,
      })
      continue
    }

    if (!account.password_hash || !account.password_salt) {
      logStudentAuthEvent('MISSING_PASSWORD_HASH', {
        normalizedEmail,
        accountId: account.account_id,
        hasPasswordHash: Boolean(account.password_hash),
        hasPasswordSalt: Boolean(account.password_salt),
      })
      continue
    }

    if (!verifyAccountPassword(account, password)) {
      logStudentAuthEvent('PASSWORD_MISMATCH', {
        normalizedEmail,
        accountId: account.account_id,
        accountFound: true,
        accountStatus: account.status,
        hasPasswordHash: true,
        passwordMatched: false,
      })
      continue
    }

    let student = null

    try {
      student = account.student_id ? await loadStudentById(account.student_id) : null
    } catch (error) {
      logStudentAuthEvent('AUTH_PROVIDER_ERROR', {
        normalizedEmail,
        accountId: account.account_id,
        studentId: account.student_id,
        message: error instanceof Error ? error.message : 'Unknown student lookup error.',
      })
    }

    if (student && !isActiveStatus(student.status)) {
      logStudentAuthEvent('ACCOUNT_DISABLED', {
        normalizedEmail,
        accountId: account.account_id,
        studentId: account.student_id,
        studentStatus: student.status,
      })
      return buildInvalidStudentCredentialsPayload()
    }

    if (!student) {
      logStudentAuthEvent('STUDENT_RECORD_UNAVAILABLE', {
        normalizedEmail,
        accountId: account.account_id,
        studentId: account.student_id,
        passwordMatched: true,
      })
    } else {
      logStudentAuthEvent('LOGIN_SUCCESS', {
        normalizedEmail,
        accountId: account.account_id,
        studentId: account.student_id,
        accountFound: true,
        accountStatus: account.status,
        hasPasswordHash: true,
        passwordMatched: true,
      })
    }

    return {
      success: true,
      message: 'Student login successful.',
      account: {
        accountId: account.account_id,
        role: 'STUDENT',
        email: account.email ?? account.username,
        username: account.username,
        studentId: account.student_id,
        status: account.status,
      },
    }
  }

  return buildInvalidStudentCredentialsPayload()
}
