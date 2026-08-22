export type StudentAuthSession = {
  accountId?: string
  studentId?: string
  email?: string
  username: string
  role: string
  rememberMe?: boolean
  signedInAt?: string
}

export function readStudentAuth(): StudentAuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue =
    window.localStorage.getItem('student-auth') ??
    window.sessionStorage.getItem('student-auth')

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

  window.localStorage.removeItem('student-auth')
  window.sessionStorage.removeItem('student-auth')
}

export function isInvalidStudentSessionMessage(message: string) {
  const normalizedMessage = String(message ?? '').trim()

  return (
    normalizedMessage === 'Student session is no longer available. Please sign in again.' ||
    normalizedMessage === 'Student record was not found.' ||
    normalizedMessage === 'Student account was not found.'
  )
}
