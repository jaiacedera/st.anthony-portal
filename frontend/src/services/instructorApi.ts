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
