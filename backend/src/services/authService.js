import {
  findInstructorAccountByUsername,
  touchInstructorAccountLastLogin,
  verifyInstructorPassword,
} from '../../database/instructorAuthStore.js'
import {
  changeStudentAccountPassword,
  getStudentAccountsByEmail,
  setStudentAccountPasswordByResetToken,
  setStudentPasswordResetTokenByEmail,
  verifyAccountPassword,
} from '../../database/studentAuthStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getRowById } from '../../database/sheetsService.js'
import { sendStudentPasswordResetEmail } from './emailService.js'
import { env } from '../config/env.js'
import { randomBytes } from 'node:crypto'

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

  const account = await findInstructorAccountByUsername(normalizedUsername)

  if (!account || !(await verifyInstructorPassword(normalizedUsername, password))) {
    return {
      success: false,
      message: 'Invalid username or password.',
    }
  }

  const refreshedAccount =
    await touchInstructorAccountLastLogin(normalizedUsername) ?? account

  return {
    success: true,
    message: 'Instructor login successful.',
    account: {
      accountId: refreshedAccount.account_id,
      role: refreshedAccount.role,
      username: refreshedAccount.username,
      status: refreshedAccount.status,
    },
  }
}

export async function authenticateStudent(email, password) {
  return authenticateStudentWithResolver(email, password)
}

function buildStudentPasswordResetSuccessPayload() {
  return {
    success: true,
    message: 'If an active account uses that email, you will receive a password reset link.',
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(String(email ?? '').trim())
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

export async function requestStudentPasswordReset(email) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: 'Enter a valid email address.',
    }
  }

  const accounts = await getStudentAccountsByEmail(normalizedEmail)
  const activeAccount =
    accounts.find((account) => String(account.status ?? '').trim().toUpperCase() === 'ACTIVE') ??
    null

  if (!activeAccount?.account_id) {
    return buildStudentPasswordResetSuccessPayload()
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const savedAccount = await setStudentPasswordResetTokenByEmail(normalizedEmail, token, expiresAt)
  if (!savedAccount) throw new Error('Unable to prepare a reset link. Please try again later.')

  const resetUrl = `${String(env.frontendOrigin || 'http://localhost:5173').trim().replace(/\/+$/, '')}/student/reset-password?token=${encodeURIComponent(token)}`
  const emailResult = await sendStudentPasswordResetEmail({
    recipientEmail: normalizedEmail,
    resetUrl,
  })

  if (!emailResult.sent) {
    return {
      success: false,
      message: emailResult.reason || 'Password reset is unavailable right now.',
    }
  }

  return buildStudentPasswordResetSuccessPayload()
}

export async function resetStudentPassword(token, password, confirmPassword) {
  const normalizedToken = String(token ?? '').trim()
  const nextPassword = String(password ?? '')
  const nextConfirmPassword = String(confirmPassword ?? '')

  if (!normalizedToken) {
    return {
      success: false,
      message: 'This password reset link is invalid or has expired.',
    }
  }

  if (!nextPassword || nextPassword.length < 8) {
    return {
      success: false,
      message: 'Password must be at least 8 characters long.',
    }
  }

  if (nextPassword !== nextConfirmPassword) {
    return {
      success: false,
      message: 'Passwords do not match.',
    }
  }

  const account = await setStudentAccountPasswordByResetToken(normalizedToken, nextPassword)

  if (!account) {
    return {
      success: false,
      message: 'This password reset link is invalid or has expired.',
    }
  }

  return {
    success: true,
    message: 'Your password has been reset successfully. You can now sign in.',
  }
}

export async function changeStudentPassword({ email, studentId, currentPassword, newPassword, confirmPassword }) {
  if (!email?.trim() || !studentId?.trim() || !currentPassword || !newPassword || !confirmPassword) {
    return { success: false, message: 'Your student account and all password fields are required.' }
  }
  if (newPassword.length < 8) return { success: false, message: 'Use at least 8 characters for your new password.' }
  if (newPassword !== confirmPassword) return { success: false, message: 'Passwords do not match.' }
  if (currentPassword === newPassword) return { success: false, message: 'Choose a password different from your current password.' }
  const saved = await changeStudentAccountPassword({ email, studentId, currentPassword, newPassword })
  if (!saved) return { success: false, message: 'Unable to change password. Check your current password and student account, then try again.' }
  return { success: true, message: 'Password changed successfully. Use your new password the next time you sign in.' }
}
