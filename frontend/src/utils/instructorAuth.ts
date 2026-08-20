export type InstructorAuthSession = {
  accountId?: string
  instructorId?: string
  username: string
  role: string
  rememberMe?: boolean
  signedInAt?: string
}

export function readInstructorAuth(): InstructorAuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue =
    window.localStorage.getItem('instructor-auth') ??
    window.sessionStorage.getItem('instructor-auth')

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as InstructorAuthSession
  } catch {
    return null
  }
}
