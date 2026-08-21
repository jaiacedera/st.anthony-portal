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
