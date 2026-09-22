import { getInstructorAccountByUsername } from '../../database/instructorAuthStore.js'
import { SHEET_NAMES } from '../../database/sheetsSchema.js'
import {
  createSubject,
  getAllRows,
  getInstructorSubjects,
  updateSubject,
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

function getDisplayValue(value, fallback = 'Not set') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
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

function formatInstructorName(instructor, username) {
  const fullName = [
    instructor?.first_name,
    instructor?.middle_name,
    instructor?.last_name,
  ]
    .filter((part) => String(part ?? '').trim())
    .join(' ')

  return fullName || username || 'Instructor'
}

function mapSubjectRecord(subject, studentCountById, instructorName) {
  return {
    id: subject.subject_id,
    code: getDisplayValue(subject.subject_code, 'N/A'),
    title: getDisplayValue(subject.subject_name, 'Untitled Subject'),
    units: getDisplayValue(subject.units),
    schedule: getDisplayValue(subject.schedule),
    room: getDisplayValue(subject.room),
    students: studentCountById.get(subject.subject_id) ?? 0,
    instructor: instructorName,
    semester: getDisplayValue(subject.semester),
    schoolYear: getDisplayValue(subject.school_year),
  }
}

async function resolveInstructorContext(username) {
  const normalizedUsername = username.trim()
  const account = await getInstructorAccountByUsername(normalizedUsername)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const instructorId = resolveInstructorId(account, instructors)
  const instructorRecord = instructors.find(
    (instructor) => instructor.instructor_id === instructorId,
  ) ?? null

  return {
    account,
    instructorId,
    instructorRecord,
  }
}

export async function getInstructorSubjectsPayload(username) {
  const { account, instructorId, instructorRecord } = await resolveInstructorContext(username)

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
      subjects: [],
    }
  }

  const [subjects, subjectStudents] = await Promise.all([
    getInstructorSubjects(instructorId),
    getAllRows(SHEET_NAMES.SUBJECT_STUDENTS),
  ])

  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))
  const subjectIds = new Set(activeSubjects.map((subject) => subject.subject_id))
  const activeSubjectStudents = subjectStudents.filter(
    (link) => isActiveStatus(link.status) && subjectIds.has(link.subject_id),
  )
  const subjectStudentCountById = new Map()

  for (const link of activeSubjectStudents) {
    subjectStudentCountById.set(
      link.subject_id,
      (subjectStudentCountById.get(link.subject_id) ?? 0) + 1,
    )
  }

  const instructorName = formatInstructorName(instructorRecord, account.username)
  const sortedSubjects = [...activeSubjects].sort((left, right) =>
    String(left.subject_code ?? '').localeCompare(String(right.subject_code ?? '')),
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
    subjects: sortedSubjects.map((subject) =>
      mapSubjectRecord(subject, subjectStudentCountById, instructorName),
    ),
  }
}

export async function createInstructorSubjectForUser({
  username,
  subjectCode,
  subjectName,
  units,
  semester,
  schoolYear,
  schedule,
  room,
}) {
  const { account, instructorId, instructorRecord } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 409
    throw error
  }

  const subject = await createSubject({
    instructorId,
    subjectCode,
    subjectName,
    units,
    semester,
    schoolYear,
    schedule,
    room,
  })

  return {
    success: true,
    connected: true,
    needsBinding: false,
    message: 'Subject created successfully.',
    subject: mapSubjectRecord(
      subject,
      new Map(),
      formatInstructorName(instructorRecord, account.username),
    ),
  }
}

export async function updateInstructorSubjectForUser({
  username,
  subjectId,
  subjectCode,
  subjectName,
  units,
  semester,
  schoolYear,
  schedule,
  room,
}) {
  const { account, instructorId, instructorRecord } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 409
    throw error
  }

  if (!subjectId?.trim()) {
    const error = new Error('Subject id is required.')
    error.statusCode = 400
    throw error
  }

  const subject = await updateSubject({
    subjectId,
    instructorId,
    subjectCode,
    subjectName,
    units,
    semester,
    schoolYear,
    schedule,
    room,
  })

  return {
    success: true,
    connected: true,
    needsBinding: false,
    message: 'Subject updated successfully.',
    subject: mapSubjectRecord(
      subject,
      new Map(),
      formatInstructorName(instructorRecord, account.username),
    ),
  }
}
