export type InstructorDashboardSubjectPreview = {
  subjectId: string
  subjectCode: string
  subjectName: string
  schedule: string
  studentCount: number
}

export type InstructorGradePostingPreview = {
  subjectId: string
  subjectCode: string
  subjectName: string
  studentCount: number
}

export type InstructorPendingRequestPreview = {
  requestId: string
  studentName: string
  subjectCode: string
  status: string
}

export type InstructorDashboardPayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  header: {
    schoolYear: string
    semester: string
  }
  stats: {
    subjectCount: number
    studentCount: number
    gradesPostedCount: number
    pendingRequestCount: number
  }
  previews: {
    subjects: InstructorDashboardSubjectPreview[]
    gradePosting: InstructorGradePostingPreview[]
    pendingRequests: InstructorPendingRequestPreview[]
  }
}

export type InstructorSubjectRecord = {
  id: string
  code: string
  title: string
  schedule: string
  room: string
  students: number
  instructor: string
  semester: string
  schoolYear: string
}

export type InstructorSubjectsPayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  header: {
    schoolYear: string
    semester: string
  }
  subjects: InstructorSubjectRecord[]
}

export type CreateInstructorSubjectInput = {
  username: string
  subjectCode: string
  subjectName: string
  semester: string
  schoolYear: string
  schedule: string
  room: string
}

export type CreateInstructorSubjectPayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  subject?: InstructorSubjectRecord
}

export type InstructorStudentSubjectRecord = {
  id: string
  code: string
  name: string
  label: string
  finalGrade: string
}

export type InstructorStudentRecord = {
  id: string
  studentId: string
  fullName: string
  email: string
  yearSection: string
  subjectCount: number
  subjects: InstructorStudentSubjectRecord[]
}

export type InstructorRosterSubject = {
  id: string
  code: string
  name: string
  label: string
}

export type InstructorStudentsPayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  instructorName: string
  header: {
    schoolYear: string
    semester: string
  }
  subjects: InstructorRosterSubject[]
  students: InstructorStudentRecord[]
}

export type UpdateInstructorStudentEnrollmentInput = {
  username: string
  action: 'add' | 'remove'
  studentId: string
  subjectId: string
}

export type UpdateInstructorStudentEnrollmentPayload = {
  success: boolean
  message?: string
  changed?: boolean
}

export type CreateInstructorStudentInput = {
  username: string
  email: string
  subjectIds: string[]
}

export type CreateInstructorStudentPayload = {
  success: boolean
  message?: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export async function fetchInstructorDashboard(
  username: string,
  signal?: AbortSignal,
): Promise<InstructorDashboardPayload> {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${apiBaseUrl}/api/instructor/dashboard?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as InstructorDashboardPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function fetchInstructorSubjects(
  username: string,
  signal?: AbortSignal,
): Promise<InstructorSubjectsPayload> {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${apiBaseUrl}/api/instructor/subjects?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as InstructorSubjectsPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function createInstructorSubject(
  input: CreateInstructorSubjectInput,
): Promise<CreateInstructorSubjectPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/subjects`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as CreateInstructorSubjectPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function fetchInstructorStudents(
  username: string,
  signal?: AbortSignal,
): Promise<InstructorStudentsPayload> {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${apiBaseUrl}/api/instructor/students?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as InstructorStudentsPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function updateInstructorStudentEnrollment(
  input: UpdateInstructorStudentEnrollmentInput,
): Promise<UpdateInstructorStudentEnrollmentPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/students/enrollment`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as UpdateInstructorStudentEnrollmentPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function createInstructorStudent(
  input: CreateInstructorStudentInput,
): Promise<CreateInstructorStudentPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/students`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as CreateInstructorStudentPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}
