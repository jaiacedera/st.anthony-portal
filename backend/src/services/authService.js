import { findInstructorAccountByUsername, verifyInstructorPassword } from '../../database/authStore.js'

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
