import {
  findInstructorAccountByUsername,
  findStudentAccountByEmail,
  verifyInstructorPassword,
  verifyStudentPassword,
} from '../../database/authStore.js'

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

  const account = findStudentAccountByEmail(normalizedEmail)

  if (!account || !verifyStudentPassword(normalizedEmail, password)) {
    return {
      success: false,
      message: 'Invalid email or password.',
    }
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
