import { getInstructorAccountByUsername } from '../../database/instructorAuthStore.js'
import { SHEET_NAMES } from '../../database/sheetsSchema.js'
import {
  findRows,
  getAllRows,
  getGradePublication,
  getInstructorSubjects,
  upsertGrade,
  upsertGradePublication,
} from '../../database/sheetsService.js'

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

function buildInstructorName(instructor, username) {
  const fullName = [
    instructor?.first_name,
    instructor?.middle_name,
    instructor?.last_name,
  ]
    .filter((part) => String(part ?? '').trim())
    .join(' ')

  return fullName || username || 'Instructor'
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

async function resolveInstructorContext(username) {
  const normalizedUsername = String(username ?? '').trim()
  const account = await getInstructorAccountByUsername(normalizedUsername)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const instructorId = resolveInstructorId(account, instructors)
  const instructorRecord =
    instructors.find((instructor) => instructor.instructor_id === instructorId) ?? null

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 403
    throw error
  }

  return {
    account,
    instructorId,
    instructorRecord,
  }
}

function normalizeGradingPeriod(gradingPeriod) {
  const normalizedValue = String(gradingPeriod ?? '').trim().toLowerCase()

  if (normalizedValue !== 'midterm' && normalizedValue !== 'final') {
    const error = new Error('Grading period must be either "midterm" or "final".')
    error.statusCode = 400
    throw error
  }

  return normalizedValue
}

function normalizeScore(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return ''
  }

  const parsed = Number.parseFloat(normalizedValue)

  if (!Number.isFinite(parsed)) {
    const error = new Error('Grade scores must be numeric.')
    error.statusCode = 400
    throw error
  }

  return parsed.toFixed(2)
}

function normalizeRemarks(value) {
  return String(value ?? '').trim().toUpperCase()
}

export async function getInstructorGradePublicationState({
  username,
  subjectId,
  gradingPeriod,
}) {
  const { instructorId, instructorRecord } = await resolveInstructorContext(username)
  const normalizedSubjectId = String(subjectId ?? '').trim()
  const normalizedGradingPeriod = normalizeGradingPeriod(gradingPeriod)
  const subjects = await getInstructorSubjects(instructorId)
  const subject = subjects.find(
    (currentSubject) =>
      isActiveStatus(currentSubject.status) &&
      String(currentSubject.subject_id ?? '').trim() === normalizedSubjectId,
  )

  if (!subject) {
    const error = new Error('Subject was not found for this instructor.')
    error.statusCode = 404
    throw error
  }

  const publication = await getGradePublication({
    subjectId: normalizedSubjectId,
    gradingPeriod: normalizedGradingPeriod,
  })

  return {
    success: true,
    publication: {
      subjectId: normalizedSubjectId,
      gradingPeriod: normalizedGradingPeriod,
      isPosted: String(publication?.is_posted ?? '').trim().toUpperCase() === 'TRUE',
      postedAt: String(publication?.posted_at ?? '').trim(),
      postedBy: String(publication?.posted_by ?? '').trim(),
      postedByName: buildInstructorName(instructorRecord, username),
    },
  }
}

export async function postInstructorGrades({
  username,
  subjectId,
  gradingPeriod,
  grades,
}) {
  const { instructorId, instructorRecord } = await resolveInstructorContext(username)
  const normalizedSubjectId = String(subjectId ?? '').trim()
  const normalizedGradingPeriod = normalizeGradingPeriod(gradingPeriod)
  const subjects = await getInstructorSubjects(instructorId)
  const subject = subjects.find(
    (currentSubject) =>
      isActiveStatus(currentSubject.status) &&
      String(currentSubject.subject_id ?? '').trim() === normalizedSubjectId,
  )

  if (!subject) {
    const error = new Error('Subject was not found for this instructor.')
    error.statusCode = 404
    throw error
  }

  if (!Array.isArray(grades) || grades.length === 0) {
    const error = new Error('At least one student grade is required to post grades.')
    error.statusCode = 400
    throw error
  }

  const [subjectStudents, existingGrades] = await Promise.all([
    findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
      subject_id: normalizedSubjectId,
      status: 'ACTIVE',
    }),
    findRows(SHEET_NAMES.GRADES, {
      subject_id: normalizedSubjectId,
    }),
  ])
  const activeStudentIds = new Set(
    subjectStudents.map((link) => String(link.student_id ?? '').trim()).filter(Boolean),
  )
  const existingGradesByStudentId = new Map(
    existingGrades.map((grade) => [String(grade.student_id ?? '').trim(), grade]),
  )

  for (const gradeEntry of grades) {
    const studentId = String(gradeEntry?.studentId ?? '').trim()

    if (!studentId || !activeStudentIds.has(studentId)) {
      const error = new Error('One or more students do not belong to the selected subject.')
      error.statusCode = 400
      throw error
    }
  }

  for (const gradeEntry of grades) {
    const studentId = String(gradeEntry.studentId ?? '').trim()
    const gradeValue = normalizeScore(gradeEntry.grade)
    const remarks = normalizeRemarks(gradeEntry.remarks)
    const existingGrade = existingGradesByStudentId.get(studentId)

    await upsertGrade({
      subjectId: normalizedSubjectId,
      studentId,
      midterm:
        normalizedGradingPeriod === 'midterm'
          ? gradeValue
          : String(existingGrade?.midterm ?? '').trim(),
      final:
        normalizedGradingPeriod === 'final'
          ? gradeValue
          : String(existingGrade?.final ?? '').trim(),
      currentGrade:
        normalizedGradingPeriod === 'final'
          ? gradeValue
          : String(existingGrade?.current_grade ?? '').trim(),
      remarks,
      postedBy: instructorId,
    })
  }

  const publication = await upsertGradePublication({
    subjectId: normalizedSubjectId,
    gradingPeriod: normalizedGradingPeriod,
    postedBy: instructorId,
  })

  return {
    success: true,
    publication: {
      subjectId: normalizedSubjectId,
      gradingPeriod: normalizedGradingPeriod,
      isPosted: true,
      postedAt: String(publication?.posted_at ?? '').trim(),
      postedBy: String(publication?.posted_by ?? '').trim(),
      postedByName: buildInstructorName(instructorRecord, username),
    },
  }
}
