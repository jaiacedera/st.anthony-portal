import { readInstructorAuth } from '../utils/instructorAuth'
import { readStudentAuth } from '../utils/studentAuth'

export function authenticatedFetch(role: 'INSTRUCTOR' | 'STUDENT') {
  return (input: RequestInfo | URL, init: RequestInit = {}) => {
    const session = role === 'INSTRUCTOR' ? readInstructorAuth() : readStudentAuth()
    const headers = new Headers(init.headers)
    if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
    return window.fetch(input, { ...init, headers, cache: 'no-store' })
  }
}
