import { getApiBaseUrl } from '../utils/apiBaseUrl'

export type StudentDashboardSubjectRecord = {
  subjectId: string
  subjectCode: string
  subjectName: string
  instructorName: string
  schedule: string
  room: string
  grade: string
  gradeLabel: string
  hasPostedGrade: boolean
}

export type StudentDashboardPayload = {
  success: boolean
  connected: boolean
  header: {
    schoolYear: string
    semester: string
  }
  student: {
    id: string
    studentNumber: string
    fullName: string
    firstName: string
    middleName: string
    lastName: string
    email: string
    yearLevel: string
    phone: string
    address: string
    dateOfBirth: string
    gender: string
    createdAt: string
  }
  stats: {
    enrolledSubjectCount: number
    currentGwa: string
    pendingRequestCount: number
    overallGwa: string
  }
  subjects: StudentDashboardSubjectRecord[]
  requests: Array<{
    requestId: string
    subjectId: string
    subjectCode: string
    subjectName: string
    requestType: string
    status: string
    requestedAt: string
  }>
}

export type UpdateStudentProfileInput = {
  studentId?: string
  email?: string
  studentNumber: string
  firstName: string
  middleName: string
  lastName: string
  yearLevel: string
  phone: string
  address: string
  dateOfBirth: string
  gender: string
}

export type UpdateStudentProfilePayload = {
  success: boolean
  message?: string
  student: StudentDashboardPayload['student']
}

const apiBaseUrl = getApiBaseUrl()

export async function fetchStudentDashboard(
  input: {
    studentId?: string
    email?: string
  },
  signal?: AbortSignal,
): Promise<StudentDashboardPayload> {
  const query = new URLSearchParams()

  if (input.studentId) {
    query.set('studentId', input.studentId)
  }

  if (input.email) {
    query.set('email', input.email)
  }

  const response = await fetch(`${apiBaseUrl}/api/student/dashboard?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as StudentDashboardPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function updateStudentProfile(
  input: UpdateStudentProfileInput,
): Promise<UpdateStudentProfilePayload> {
  const response = await fetch(`${apiBaseUrl}/api/student/profile`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as UpdateStudentProfilePayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}
