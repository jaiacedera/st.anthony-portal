import { getApiBaseUrl } from '../utils/apiBaseUrl'

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

export type InstructorRequestRecord = {
  requestId: string
  studentId: string
  studentName: string
  subjectId: string
  subjectCode: string
  subjectTitle: string
  requestType: string
  gradingPeriod?: string
  message: string
  status: string
  requestedAt: string
  processedAt: string
  processedBy: string
  processedByName: string
  gradeId: string
}

export type InstructorProfileRecord = {
  id: string
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  employeeId: string
  department: string
  contactNumber: string
  dateOfBirth: string
  gender: string
  address: string
  joinedAt: string
  lastLogin: string
  username: string
  status: string
  role: string
  profilePhoto: string
}

export type InstructorProfilePayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  header: {
    schoolYear: string
    semester: string
  }
  profile: InstructorProfileRecord
}

export type UpdateInstructorProfileInput = {
  username: string
  fullName: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
}

export type ChangeInstructorPasswordInput = {
  username: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
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

export type InstructorRequestsPayload = {
  success: boolean
  connected: boolean
  needsBinding: boolean
  message?: string
  header: {
    schoolYear: string
    semester: string
  }
  requests: InstructorRequestRecord[]
}

export type InstructorSubjectRecord = {
  id: string
  code: string
  title: string
  units: string
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
  units: string
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

export type UpdateInstructorSubjectInput = {
  username: string
  subjectId: string
  subjectCode: string
  subjectName: string
  units: string
  semester: string
  schoolYear: string
  schedule: string
  room: string
}

export type UpdateInstructorSubjectPayload = {
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
  firstName: string
  lastName: string
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
  student?: InstructorStudentRecord
}

export type DeleteInstructorStudentInput = {
  username: string
  studentId: string
}

export type DeleteInstructorStudentPayload = {
  success: boolean
  message?: string
}

export type InstructorGradePublication = {
  subjectId: string
  gradingPeriod: 'midterm' | 'final'
  isPosted: boolean
  postedAt: string
  postedBy: string
  postedByName: string
}

export type InstructorGradePublicationPayload = {
  success: boolean
  publication: InstructorGradePublication
}

export type ReviewInstructorRequestInput = {
  username: string
  requestId: string
  status: 'APPROVED' | 'REJECTED'
  approvedBreakdown?: Record<string, unknown>
}

export type ReviewInstructorRequestPayload = {
  success: boolean
  request: Pick<
    InstructorRequestRecord,
    'requestId' | 'status' | 'processedAt' | 'processedBy' | 'processedByName'
  >
}

export type PostInstructorGradesInput = {
  username: string
  subjectId: string
  gradingPeriod: 'midterm' | 'final'
  grades: Array<{
    studentId: string
    grade: string
    remarks: string
  }>
}

const apiBaseUrl = getApiBaseUrl()

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

export async function fetchInstructorProfile(
  username: string,
  signal?: AbortSignal,
): Promise<InstructorProfilePayload> {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${apiBaseUrl}/api/instructor/profile?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as InstructorProfilePayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function updateInstructorProfile(
  input: UpdateInstructorProfileInput,
): Promise<InstructorProfilePayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/profile`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as InstructorProfilePayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function changeInstructorPassword(
  input: ChangeInstructorPasswordInput,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/profile/password`, {
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

export async function updateInstructorSubject(
  input: UpdateInstructorSubjectInput,
): Promise<UpdateInstructorSubjectPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/subjects/update`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as UpdateInstructorSubjectPayload & {
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

export async function fetchInstructorRequests(
  username: string,
  signal?: AbortSignal,
): Promise<InstructorRequestsPayload> {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${apiBaseUrl}/api/instructor/requests?${query.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const payload = (await response.json()) as InstructorRequestsPayload & {
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

export async function deleteInstructorStudent(
  input: DeleteInstructorStudentInput,
): Promise<DeleteInstructorStudentPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/students/delete`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as DeleteInstructorStudentPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function fetchInstructorGradePublication(
  input: {
    username: string
    subjectId: string
    gradingPeriod: 'midterm' | 'final'
  },
  signal?: AbortSignal,
): Promise<InstructorGradePublicationPayload> {
  const query = new URLSearchParams({
    username: input.username,
    subjectId: input.subjectId,
    gradingPeriod: input.gradingPeriod,
  })
  const response = await fetch(
    `${apiBaseUrl}/api/instructor/grades/publication?${query.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  )

  const payload = (await response.json()) as InstructorGradePublicationPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function postInstructorGrades(
  input: PostInstructorGradesInput,
): Promise<InstructorGradePublicationPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/grades/post`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as InstructorGradePublicationPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}

export async function reviewInstructorRequest(
  input: ReviewInstructorRequestInput,
): Promise<ReviewInstructorRequestPayload> {
  const response = await fetch(`${apiBaseUrl}/api/instructor/requests/review`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as ReviewInstructorRequestPayload & {
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? `Backend request failed with ${response.status}`)
  }

  return payload
}
