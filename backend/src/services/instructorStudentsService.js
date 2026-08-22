import {
  createStudentAccount,
  getAuthAccounts,
  getInstructorAccountByUsername,
  getStudentAccountByStudentId,
  updateStudentAccountByStudentId,
} from '../../database/authStore.js'
import { randomBytes } from 'node:crypto'
import { SHEET_NAMES, SHEET_ID_COLUMNS } from '../../database/sheetsSchema.js'
import { sendStudentWelcomeEmail } from './emailService.js'
import {
  addStudentToSubject,
  createStudent,
  findRows,
  getAllRows,
  getInstructorSubjects,
  getRowById,
  updateRowById,
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

function formatSubjectLabel(subject) {
  const code = getDisplayValue(subject.subject_code, 'N/A')
  const title = getDisplayValue(subject.subject_name, 'Untitled Subject')
  return `${code} - ${title}`
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

async function resolveInstructorContext(username) {
  const normalizedUsername = username.trim()
  const account = getInstructorAccountByUsername(normalizedUsername)

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

function buildStudentName(student) {
  return [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter((part) => String(part ?? '').trim())
    .join(' ')
}

function mapStudentRecord({
  student,
  enrolledSubjects,
  gradesBySubjectId,
}) {
  return {
    id: student.student_id,
    studentId: getDisplayValue(student.student_number, student.student_id),
    fullName: buildStudentName(student) || 'Unnamed Student',
    email: getDisplayValue(student.email),
    yearSection: getDisplayValue(student.year_level),
    subjectCount: enrolledSubjects.length,
    subjects: enrolledSubjects.map((subject) => ({
      id: subject.subject_id,
      code: getDisplayValue(subject.subject_code, 'N/A'),
      name: getDisplayValue(subject.subject_name, 'Untitled Subject'),
      label: formatSubjectLabel(subject),
      finalGrade:
        gradesBySubjectId.get(subject.subject_id)?.current_grade ||
        gradesBySubjectId.get(subject.subject_id)?.final ||
        'Not posted',
    })),
  }
}

export async function getInstructorStudentsPayload(username) {
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
      instructorName: account.username,
      subjects: [],
      students: [],
    }
  }

  const [subjects, subjectStudents, students, grades] = await Promise.all([
    getInstructorSubjects(instructorId),
    getAllRows(SHEET_NAMES.SUBJECT_STUDENTS),
    getAllRows(SHEET_NAMES.STUDENTS),
    getAllRows(SHEET_NAMES.GRADES),
  ])

  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))
  const activeSubjectIds = new Set(activeSubjects.map((subject) => subject.subject_id))
  const activeLinks = subjectStudents.filter(
    (link) => isActiveStatus(link.status) && activeSubjectIds.has(link.subject_id),
  )
  const activeStudents = students.filter((student) => isActiveStatus(student.status))
  const subjectById = new Map(activeSubjects.map((subject) => [subject.subject_id, subject]))
  const studentById = new Map(activeStudents.map((student) => [student.student_id, student]))
  const studentAccounts = getAuthAccounts().filter(
    (account) =>
      account.role === 'STUDENT' &&
      account.status === 'ACTIVE' &&
      String(account.created_by_instructor_id ?? '').trim() === instructorId,
  )
  const linksByStudentId = new Map()
  const gradesByStudentId = new Map()

  for (const link of activeLinks) {
    const currentLinks = linksByStudentId.get(link.student_id) ?? []
    currentLinks.push(link)
    linksByStudentId.set(link.student_id, currentLinks)
  }

  for (const grade of grades) {
    if (!activeSubjectIds.has(grade.subject_id)) {
      continue
    }

    const currentGrades = gradesByStudentId.get(grade.student_id) ?? new Map()
    currentGrades.set(grade.subject_id, grade)
    gradesByStudentId.set(grade.student_id, currentGrades)
  }

  const visibleStudentIds = new Set([
    ...linksByStudentId.keys(),
    ...studentAccounts
      .map((account) => String(account.student_id ?? '').trim())
      .filter(Boolean),
  ])

  const roster = [...visibleStudentIds]
    .map((studentId) => {
      const student = studentById.get(studentId)

      if (!student) {
        return null
      }

      const studentLinks = linksByStudentId.get(studentId) ?? []
      const enrolledSubjects = studentLinks
        .map((link) => subjectById.get(link.subject_id) ?? null)
        .filter(Boolean)

      return mapStudentRecord({
        student,
        enrolledSubjects,
        gradesBySubjectId: gradesByStudentId.get(studentId) ?? new Map(),
      })
    })
    .filter(Boolean)
    .sort((left, right) => left.fullName.localeCompare(right.fullName))

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
    instructorName: formatInstructorName(instructorRecord, account.username),
    subjects: activeSubjects
      .map((subject) => ({
        id: subject.subject_id,
        code: getDisplayValue(subject.subject_code, 'N/A'),
        name: getDisplayValue(subject.subject_name, 'Untitled Subject'),
        label: formatSubjectLabel(subject),
      }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    students: roster,
  }
}

export async function updateInstructorStudentEnrollment({
  username,
  action,
  studentId,
  subjectId,
}) {
  const { instructorId } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 409
    throw error
  }

  if (!studentId?.trim()) {
    const error = new Error('Student id is required.')
    error.statusCode = 400
    throw error
  }

  if (!subjectId?.trim()) {
    const error = new Error('Subject id is required.')
    error.statusCode = 400
    throw error
  }

  if (action === 'add') {
    const result = await addStudentToSubject({
      subjectId,
      studentId,
      addedBy: instructorId,
    })

    return {
      success: true,
      message: result.success
        ? 'Student added to subject successfully.'
        : result.message ?? 'Student is already added to this subject.',
      changed: Boolean(result.success),
    }
  }

  if (action === 'remove') {
    const activeLink = (
      await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
        subject_id: subjectId,
        student_id: studentId,
        status: 'ACTIVE',
      })
    )[0]

    if (!activeLink) {
      return {
        success: true,
        message: 'Student is not currently enrolled in this subject.',
        changed: false,
      }
    }

    await updateRowById(
      SHEET_NAMES.SUBJECT_STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECT_STUDENTS],
      activeLink.subject_student_id,
      {
        status: 'INACTIVE',
      },
    )

    return {
      success: true,
      message: 'Student removed from subject successfully.',
      changed: true,
    }
  }

  const error = new Error('Enrollment action must be add or remove.')
  error.statusCode = 400
  throw error
}

export async function createInstructorStudentForUser({
  username,
  email,
  subjectIds,
}) {
  const { instructorId } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 409
    throw error
  }

  const normalizedSubjectIds = Array.isArray(subjectIds)
    ? [...new Set(subjectIds.map((subjectId) => String(subjectId ?? '').trim()).filter(Boolean))]
    : []

  if (!email?.trim()) {
    const error = new Error('Student email is required.')
    error.statusCode = 400
    throw error
  }

  let student

  try {
    student = await createStudent({
      email,
      studentNumber: '',
      firstName: '',
      middleName: '',
      lastName: '',
      yearLevel: '',
    })
  } catch (error) {
    if (error instanceof Error && !error.statusCode) {
      error.statusCode = 400
    }

    throw error
  }

  const defaultPassword = `SACC-${randomPasswordSuffix()}`

  try {
    createStudentAccount({
      email,
      studentId: student.student_id,
      defaultPassword,
      createdByInstructorId: instructorId,
    })
  } catch (error) {
    if (error instanceof Error && !error.statusCode) {
      error.statusCode = 400
    }

    throw error
  }

  const subjectLabels = []

  for (const subjectId of normalizedSubjectIds) {
    const enrollment = await addStudentToSubject({
      subjectId,
      studentId: student.student_id,
      addedBy: instructorId,
    })

    if (!enrollment.success) {
      const error = new Error(enrollment.message ?? 'Unable to add student to a selected subject.')
      error.statusCode = 400
      throw error
    }

    const matchedSubject = await findRows(SHEET_NAMES.SUBJECTS, {
      subject_id: subjectId,
      instructor_id: instructorId,
    })

    if (matchedSubject[0]) {
      subjectLabels.push(formatSubjectLabel(matchedSubject[0]))
    }
  }

  const emailResult = await sendStudentWelcomeEmail({
    recipientEmail: email.trim(),
    defaultPassword,
    subjectLabels,
  })

  return {
    success: true,
    message: emailResult.sent
      ? normalizedSubjectIds.length
        ? 'Student created successfully, added to the selected subjects, and sent a default password email.'
        : 'Student created successfully and sent a default password email.'
      : normalizedSubjectIds.length
        ? `Student created successfully and added to the selected subjects, but the default password email was not sent. ${emailResult.reason}`
        : `Student created successfully, but the default password email was not sent. ${emailResult.reason}`,
  }
}

export async function deleteInstructorStudentAccount({
  username,
  studentId,
}) {
  const { instructorId } = await resolveInstructorContext(username)

  if (!instructorId) {
    const error = new Error(
      'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    )
    error.statusCode = 409
    throw error
  }

  if (!studentId?.trim()) {
    const error = new Error('Student id is required.')
    error.statusCode = 400
    throw error
  }

  const student = await getRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    studentId,
  )

  if (!student || !isActiveStatus(student.status)) {
    const error = new Error('Student account was not found.')
    error.statusCode = 404
    throw error
  }

  const studentAccount = getStudentAccountByStudentId(studentId)

  if (!studentAccount || studentAccount.status !== 'ACTIVE') {
    const error = new Error('Student auth account was not found.')
    error.statusCode = 404
    throw error
  }

  if (String(studentAccount.created_by_instructor_id ?? '').trim() !== instructorId) {
    const error = new Error('Only students created by your account can be deleted.')
    error.statusCode = 403
    throw error
  }

  const subjectLinks = await findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
    student_id: studentId,
    status: 'ACTIVE',
  })

  for (const link of subjectLinks) {
    await updateRowById(
      SHEET_NAMES.SUBJECT_STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECT_STUDENTS],
      link.subject_student_id,
      {
        status: 'INACTIVE',
      },
    )
  }

  await updateRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    studentId,
    {
      status: 'INACTIVE',
      updated_at: new Date().toISOString(),
    },
  )

  updateStudentAccountByStudentId(studentId, {
    status: 'INACTIVE',
    updated_at: new Date().toISOString(),
  })

  return {
    success: true,
    message: 'Student account deleted successfully.',
  }
}

function randomPasswordSuffix() {
  return randomBytes(4).toString('hex').toUpperCase()
}
