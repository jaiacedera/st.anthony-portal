import { getInstructorAccountByUsername } from '../../database/instructorAuthStore.js'
import {
  deleteGradeBreakdownResponse,
  getAllRows,
  getInstructorSubjects,
  reviewGradeBreakdownRequest,
  upsertGradeBreakdownResponse,
} from '../../database/sheetsService.js'
import { SHEET_NAMES } from '../../database/sheetsSchema.js'
import {
  GRADE_BREAKDOWN_REQUEST_TYPE,
  parseGradeRequestReason,
} from '../utils/gradeRequestMetadata.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getEmailLocalPart(value) {
  const normalized = normalizeValue(value)
  const separatorIndex = normalized.indexOf('@')

  if (separatorIndex <= 0) {
    return ''
  }

  return normalized.slice(0, separatorIndex)
}

function getDisplayValue(value, fallback = 'Not set') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function getOptionalValue(value) {
  return String(value ?? '').trim()
}

function getMostCommonValue(items) {
  const counts = new Map()

  for (const item of items) {
    const key = String(item ?? '').trim()

    if (!key) {
      continue
    }

    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? ''
}

function buildPersonName(person) {
  return [
    person?.first_name,
    person?.middle_name,
    person?.last_name,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

function resolveInstructorId(account, instructors) {
  const activeInstructors = instructors.filter((instructor) => isActiveStatus(instructor.status))
  const accountInstructorId = normalizeValue(account.instructor_id)
  const accountEmail = normalizeValue(account.email)
  const accountUsername = normalizeValue(account.username)
  const matchedInstructors = activeInstructors.filter((instructor) => {
    const instructorId = normalizeValue(instructor.instructor_id)
    const instructorEmail = normalizeValue(instructor.email)
    const instructorEmailLocalPart = getEmailLocalPart(instructor.email)

    return (
      (accountInstructorId && instructorId === accountInstructorId) ||
      (accountEmail && instructorEmail === accountEmail) ||
      (accountUsername &&
        (instructorId === accountUsername || instructorEmailLocalPart === accountUsername))
    )
  })

  if (matchedInstructors.length === 1) {
    return matchedInstructors[0].instructor_id
  }

  if (activeInstructors.length === 1) {
    return activeInstructors[0].instructor_id
  }

  return null
}

function normalizeRequestStatus(value) {
  const normalized = String(value ?? '').trim().toUpperCase()

  if (normalized === 'APPROVED' || normalized === 'REJECTED') {
    return normalized
  }

  return 'PENDING'
}

function formatRequestTypeLabel(value) {
  if (value === GRADE_BREAKDOWN_REQUEST_TYPE) {
    return 'Grade Breakdown'
  }

  return 'Request'
}

function assertRestrictedBreakdownPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Approved grade breakdown payload is required.')
  }

  const knowledge = payload.knowledge
  const skills = payload.skills
  const attitude = payload.attitude

  if (!knowledge || typeof knowledge !== 'object' || !Array.isArray(knowledge.sections)) {
    throw new Error('Knowledge breakdown data is required.')
  }

  if (
    skills &&
    typeof skills === 'object' &&
    ('sections' in skills || 'items' in skills || 'details' in skills)
  ) {
    throw new Error('Skills breakdown must include only the weighted summary.')
  }

  if (
    attitude &&
    typeof attitude === 'object' &&
    ('sections' in attitude || 'items' in attitude || 'details' in attitude)
  ) {
    throw new Error('Attitude breakdown must include only the weighted summary.')
  }
}

async function resolveInstructorContext(username) {
  const account = await getInstructorAccountByUsername(username)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const instructorId = resolveInstructorId(account, instructors)

  return {
    account,
    instructorId,
  }
}

export async function getInstructorRequests(username) {
  const { instructorId } = await resolveInstructorContext(username)

  if (!instructorId) {
    return {
      success: true,
      connected: true,
      needsBinding: true,
      message:
        'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
      header: {
        schoolYear: 'Not set',
        semester: 'Not set',
      },
      requests: [],
    }
  }

  const [subjects, gradeRequests, students, instructors] = await Promise.all([
    getInstructorSubjects(instructorId),
    getAllRows(SHEET_NAMES.GRADE_REQUESTS),
    getAllRows(SHEET_NAMES.STUDENTS),
    getAllRows(SHEET_NAMES.INSTRUCTORS),
  ])

  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))
  const subjectIds = new Set(
    activeSubjects.map((subject) => String(subject.subject_id ?? '').trim()).filter(Boolean),
  )
  const subjectById = new Map(
    activeSubjects.map((subject) => [String(subject.subject_id ?? '').trim(), subject]),
  )
  const studentById = new Map(
    students.map((student) => [String(student.student_id ?? '').trim(), student]),
  )
  const instructorById = new Map(
    instructors.map((instructor) => [String(instructor.instructor_id ?? '').trim(), instructor]),
  )

  return {
    success: true,
    connected: true,
    needsBinding: false,
    header: {
      schoolYear: getDisplayValue(
        getMostCommonValue(activeSubjects.map((subject) => subject.school_year)),
      ),
      semester: getDisplayValue(
        getMostCommonValue(activeSubjects.map((subject) => subject.semester)),
      ),
    },
    requests: gradeRequests
      .filter((request) => subjectIds.has(String(request.subject_id ?? '').trim()))
      .map((request) => {
        const subjectId = String(request.subject_id ?? '').trim()
        const subject = subjectById.get(subjectId)
        const student = studentById.get(String(request.student_id ?? '').trim())
        const reviewedBy = getOptionalValue(request.reviewed_by)
        const reviewedByRecord = reviewedBy ? instructorById.get(reviewedBy) : null
        const requestMetadata = parseGradeRequestReason(request.reason)

        return {
          requestId: String(request.request_id ?? '').trim(),
          studentId: String(request.student_id ?? '').trim(),
          studentName: buildPersonName(student) || 'Unknown Student',
          subjectId,
          subjectCode: getDisplayValue(subject?.subject_code, 'N/A'),
          subjectTitle: getDisplayValue(subject?.subject_name, 'Untitled Subject'),
          requestType: formatRequestTypeLabel(requestMetadata.requestType),
          gradingPeriod: requestMetadata.gradingPeriod,
          message: requestMetadata.message,
          status: normalizeRequestStatus(request.status),
          requestedAt: getOptionalValue(request.requested_at),
          processedAt: getOptionalValue(request.reviewed_at),
          processedBy: reviewedBy,
          processedByName: buildPersonName(reviewedByRecord) || reviewedBy,
          gradeId: String(request.grade_id ?? '').trim(),
        }
      })
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)),
  }
}

export async function reviewInstructorRequest({
  username,
  requestId,
  status,
  approvedBreakdown = null,
}) {
  const { instructorId } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 403
    throw error
  }

  if (status === 'APPROVED') {
    assertRestrictedBreakdownPayload(approvedBreakdown)
  }

  const updatedRequest = await reviewGradeBreakdownRequest({
    requestId,
    status,
    reviewedBy: instructorId,
  })

  if (status === 'APPROVED' && approvedBreakdown) {
    await upsertGradeBreakdownResponse({
      requestId,
      studentId: String(updatedRequest.student_id ?? '').trim(),
      subjectId: String(updatedRequest.subject_id ?? '').trim(),
      gradingPeriod: String(approvedBreakdown.gradingPeriod ?? '').trim().toLowerCase(),
      breakdownPayload: approvedBreakdown,
    })
  }

  if (status === 'REJECTED') {
    await deleteGradeBreakdownResponse(requestId)
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const reviewedByRecord = instructors.find(
    (instructor) => String(instructor.instructor_id ?? '').trim() === instructorId,
  )

  return {
    success: true,
    request: {
      requestId: String(updatedRequest.request_id ?? '').trim(),
      status: normalizeRequestStatus(updatedRequest.status),
      processedAt: getOptionalValue(updatedRequest.reviewed_at),
      processedBy: getOptionalValue(updatedRequest.reviewed_by),
      processedByName:
        buildPersonName(reviewedByRecord) || getOptionalValue(updatedRequest.reviewed_by),
    },
  }
}
