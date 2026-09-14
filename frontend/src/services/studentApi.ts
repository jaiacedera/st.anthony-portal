import { getApiBaseUrl } from '../utils/apiBaseUrl'
import { getLocalStudentDashboard, isLocalStudent, updateLocalStudentProfile } from '../utils/localStudent'

export type StudentDashboardSubjectRecord = {
  subjectId: string
  subjectCode: string
  subjectName: string
  units: string
  instructorName: string
  schedule: string
  room: string
  grade: string
  gradeLabel: string
  hasPostedGrade: boolean
  postedGradingPeriods: Array<'midterm' | 'final'>
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
    gradingPeriod: string
    message: string
    status: string
    requestedAt: string
  }>
}

export type StudentApprovedBreakdownResponse = {
  requestId: string
  subjectId: string
  subjectCode: string
  subjectTitle: string
  studentId: string
  studentName: string
  gradingPeriod: 'midterm' | 'final'
  knowledge: {
    label: string
    weight: number
    weighted: number | null
    sections: Array<{
      label: string
      weight: number
      items: Array<{
        label: string
        score: number | null
      }>
      average: number | null
      weighted: number | null
    }>
  }
  skills: {
    label: string
    weight: number
    weighted: number | null
  } | null
  attitude: {
    label: string
    weight: number
    weighted: number | null
  } | null
  finalGrade: number | null
  rating: string
  remarks: string
  generatedAt: string
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

export type CreateStudentBreakdownRequestInput = {
  subjectId: string
  gradingPeriod: 'midterm' | 'final'
  requestType?: 'grade_breakdown'
  studentId?: string
  email?: string
  reason?: string
}

const apiBaseUrl = getApiBaseUrl()

export async function fetchStudentDashboard(
  input: {
    studentId?: string
    email?: string
  },
  signal?: AbortSignal,
): Promise<StudentDashboardPayload> {
  if (isLocalStudent(input.studentId)) return getLocalStudentDashboard()

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
  if (isLocalStudent(input.studentId)) return updateLocalStudentProfile(input)

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

export async function fetchStudentRequestResponse(
  input: {
    requestId: string
    studentId?: string
    email?: string
  },
  signal?: AbortSignal,
): Promise<{ success: boolean; response: StudentApprovedBreakdownResponse }> {
  if (isLocalStudent(input.studentId)) throw new Error('No grade responses are available for the local demo account.')

  const query = new URLSearchParams({
    requestId: input.requestId,
  })

  if (input.studentId) {
    query.set('studentId', input.studentId)
  }

  if (input.email) {
    query.set('email', input.email)
  }

  const response = await fetch(
    `${apiBaseUrl}/api/student/requests/response?${query.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  const payload = (await response.json()) as {
    success: boolean
    response: StudentApprovedBreakdownResponse
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function createStudentBreakdownRequest(
  input: CreateStudentBreakdownRequestInput,
): Promise<{ success: boolean; message?: string; requestId?: string }> {
  if (isLocalStudent(input.studentId)) throw new Error('The local demo account has no enrolled subjects to request grades for.')

  const response = await fetch(`${apiBaseUrl}/api/student/requests`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as {
    success: boolean
    message?: string
    requestId?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}
