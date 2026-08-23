export type StudentAuthSession = {
  accountId?: string
  studentId?: string
  email?: string
  username: string
  role: string
  rememberMe?: boolean
  signedInAt?: string
}

const STUDENT_AUTH_STORAGE_KEY = 'student-auth'
const STUDENT_REMEMBERED_EMAIL_KEY = 'student-remembered-email'

export function readStudentAuth(): StudentAuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue =
    window.localStorage.getItem(STUDENT_AUTH_STORAGE_KEY) ??
    window.sessionStorage.getItem(STUDENT_AUTH_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as StudentAuthSession
  } catch {
    return null
  }
}

export function clearStudentAuth() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STUDENT_AUTH_STORAGE_KEY)
  window.sessionStorage.removeItem(STUDENT_AUTH_STORAGE_KEY)
}

export function readRememberedStudentEmail() {
  if (typeof window === 'undefined') {
    return ''
  }

  return String(window.localStorage.getItem(STUDENT_REMEMBERED_EMAIL_KEY) ?? '').trim()
}

export function writeRememberedStudentEmail(email: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedEmail = String(email ?? '').trim()

  if (!normalizedEmail) {
    window.localStorage.removeItem(STUDENT_REMEMBERED_EMAIL_KEY)
    return
  }

  window.localStorage.setItem(STUDENT_REMEMBERED_EMAIL_KEY, normalizedEmail)
}

export function clearRememberedStudentEmail() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STUDENT_REMEMBERED_EMAIL_KEY)
}

export function isInvalidStudentSessionMessage(message: string) {
  const normalizedMessage = String(message ?? '').trim()

  return (
    normalizedMessage === 'Student session is no longer available. Please sign in again.' ||
    normalizedMessage === 'Student record was not found.' ||
    normalizedMessage === 'Student account was not found.'
  )
}
