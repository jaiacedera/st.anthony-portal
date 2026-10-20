import {
  getInstructorAccountByUsername,
} from '../../database/instructorAuthStore.js'
import { randomBytes } from 'node:crypto'
import {
  deleteAccountByAccountId,
  deleteStudentAccountByStudentId,
  getAllStudentAccounts,
  getStudentAccountsByEmail,
  getStudentAccountByStudentId,
  upsertStudentAccount,
} from '../../database/studentAuthStore.js'
import { SHEET_NAMES, SHEET_ID_COLUMNS } from '../../database/sheetsSchema.js'
import { sendStudentWelcomeEmail } from './emailService.js'
import {
  addStudentToSubject,
  createStudent,
  deleteRowById,
  findRows,
  getAllRows,
  getInstructorSubjects,
  getRowById,
  updateRowById,
  assertSubjectInstructor,
} from '../../database/sheetsService.js'
import { recalculateSubject, readSubjectResults } from './sharedSubjectsService.js'
import { withWriteLock } from '../utils/writeLock.js'

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

function buildInstructorOwnershipKeys({ account, instructorId, instructorRecord }) {
  return new Set(
    [
      instructorId,
      account?.instructor_id,
      account?.username,
      account?.email,
      getEmailLocalPart(account?.email),
      instructorRecord?.instructor_id,
      instructorRecord?.email,
      getEmailLocalPart(instructorRecord?.email),
    ]
      .map((value) => normalizeValue(value))
      .filter(Boolean),
  )
}

function isOwnedByInstructor(ownerValue, context) {
  const normalizedOwnerValue = normalizeValue(ownerValue)

  if (!normalizedOwnerValue) {
    return false
  }

  return buildInstructorOwnershipKeys(context).has(normalizedOwnerValue)
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

async function purgeStaleStudentAccountsByEmail(email) {
  const studentAccounts = await getStudentAccountsByEmail(email)

  for (const account of studentAccounts) {
    const student = account.student_id
      ? await getRowById(
          SHEET_NAMES.STUDENTS,
          SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
          account.student_id,
        )
      : null

    if (!student || !isActiveStatus(student.status)) {
      await deleteAccountByAccountId(account.account_id)
    }
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
    firstName: String(student.first_name ?? '').trim(),
    lastName: String(student.last_name ?? '').trim(),
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

  const [subjects, subjectStudents, students, grades, studentAccounts] = await Promise.all([
    getInstructorSubjects(instructorId),
    getAllRows(SHEET_NAMES.SUBJECT_STUDENTS),
    getAllRows(SHEET_NAMES.STUDENTS),
    getAllRows(SHEET_NAMES.GRADES),
    getAllStudentAccounts(),
  ])

  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))
  const activeSubjectIds = new Set(activeSubjects.map((subject) => subject.subject_id))
  const activeLinks = subjectStudents.filter(
    (link) => isActiveStatus(link.status) && activeSubjectIds.has(link.subject_id),
  )
  const activeStudents = students.filter((student) => isActiveStatus(student.status))
  const subjectById = new Map(activeSubjects.map((subject) => [subject.subject_id, subject]))
  const studentById = new Map(activeStudents.map((student) => [student.student_id, student]))
  const ownershipContext = {
    account,
    instructorId,
    instructorRecord,
  }
  const ownedStudentAccounts = studentAccounts.filter(
    (account) =>
      account.status === 'ACTIVE' &&
      isOwnedByInstructor(account.created_by_instructor_id, ownershipContext),
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

  for (const subject of activeSubjects.filter(subject => subject.grading_mode === 'COLLABORATIVE')) {
    const { results } = await readSubjectResults(subject.subject_id)
    for (const result of results) {
      const currentGrades = gradesByStudentId.get(result.student_id) ?? new Map()
      currentGrades.set(subject.subject_id, { current_grade: result.status === 'FINAL' ? result.final_grade : 'Pending' })
      gradesByStudentId.set(result.student_id, currentGrades)
    }
  }

  const visibleStudentIds = new Set([
    ...linksByStudentId.keys(),
    ...ownedStudentAccounts
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
        gradingMode: subject.grading_mode || 'LEGACY',
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
    await recalculateSubject(subjectId)

    return {
      success: true,
      message: result.success
        ? 'Student added to subject successfully.'
        : result.message ?? 'Student is already added to this subject.',
      changed: Boolean(result.success),
    }
  }

  if (action === 'remove') {
    await assertSubjectInstructor(subjectId, instructorId)
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
    await recalculateSubject(subjectId)

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

export async function createInstructorStudentForUser(input) {
  return withWriteLock(`student:${normalizeValue(input.email)}`, () => createStudentForUser(input))
}

async function createStudentForUser({ username, email, subjectIds, name = '', yearLevel = '', createAccount = true }) {
  const { instructorId } = await resolveInstructorContext(username)
  if (!instructorId) throw Object.assign(new Error('Instructor account is not linked.'), { statusCode: 403 })
  const ids = Array.isArray(subjectIds) ? [...new Set(subjectIds.map(String).filter(Boolean))] : []
  const subjects = []
  // Validate every assignment before creating any account or enrollment.
  for (const id of ids) subjects.push(await assertSubjectInstructor(id, instructorId))
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw Object.assign(new Error('A valid student email is required.'), { statusCode: 400 })
  let student = (await getAllRows(SHEET_NAMES.STUDENTS)).find(s => isActiveStatus(s.status) && normalizeValue(s.email) === normalizedEmail)
  const accounts = await getStudentAccountsByEmail(normalizedEmail)
  let account = accounts.find(a => a.status === 'ACTIVE')
  if (!account && !createAccount) throw Object.assign(new Error('No account exists. Enable Create account to add this student.'), { statusCode: 409 })
  if (!student) {
    if (account) throw Object.assign(new Error('This account has no active student profile. Repair the existing profile before enrolling.'), { statusCode: 409 })
    await purgeStaleStudentAccountsByEmail(normalizedEmail)
    student = await createStudent({ email: normalizedEmail, firstName: String(name).trim(), middleName: '', lastName: '', yearLevel: String(yearLevel).trim(), studentNumber: '' })
  }
  if (account && account.student_id !== student.student_id) throw Object.assign(new Error('The email account is linked to a different student profile.'), { statusCode: 409 })
  let emailResult = null
  if (!account) {
    const defaultPassword = 'SACC-' + randomPasswordSuffix()
    account = await upsertStudentAccount({ email: normalizedEmail, studentId: student.student_id, defaultPassword, createdByInstructorId: instructorId })
    emailResult = await sendStudentWelcomeEmail({ recipientEmail: normalizedEmail, defaultPassword, subjectLabels: subjects.map(formatSubjectLabel) })
  }
  for (const subjectId of ids) {
    await addStudentToSubject({ subjectId, studentId: student.student_id, addedBy: instructorId })
    await recalculateSubject(subjectId)
  }
  return {
    success: true,
    student: mapStudentRecord({ student, enrolledSubjects: subjects, gradesBySubjectId: new Map() }),
    message: emailResult && !emailResult.sent
      ? 'Student added, but the account email was not sent. ' + emailResult.reason
      : emailResult ? 'Student account created, enrolled, and emailed.' : 'Existing student enrolled. Their password was not changed.',
  }
}

export async function deleteInstructorStudentAccount({
  username,
  studentId,
}) {
  const { account, instructorId, instructorRecord } = await resolveInstructorContext(username)

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

  const studentAccount = await getStudentAccountByStudentId(studentId)

  if (!studentAccount || studentAccount.status !== 'ACTIVE') {
    const error = new Error('Student auth account was not found.')
    error.statusCode = 404
    throw error
  }

  if (
    !isOwnedByInstructor(studentAccount.created_by_instructor_id, {
      account,
      instructorId,
      instructorRecord,
    })
  ) {
    const error = new Error('Only students created by your account can be deleted.')
    error.statusCode = 403
    throw error
  }

  const [subjectLinks, grades, gradeRequests] = await Promise.all([
    findRows(SHEET_NAMES.SUBJECT_STUDENTS, {
      student_id: studentId,
    }),
    findRows(SHEET_NAMES.GRADES, {
      student_id: studentId,
    }),
    findRows(SHEET_NAMES.GRADE_REQUESTS, {
      student_id: studentId,
    }),
  ])

  // A professor must not delete an account used by another professor's class.
  const ownSubjects = await getInstructorSubjects(instructorId)
  const ownedIds = new Set(ownSubjects.map(subject => subject.subject_id))
  if (subjectLinks.some(link => isActiveStatus(link.status) && !ownedIds.has(link.subject_id))) {
    throw Object.assign(new Error('This student is enrolled in another class. Remove them from your class instead of deleting the account.'), { statusCode: 403 })
  }

  for (const link of subjectLinks) {
    await deleteRowById(
      SHEET_NAMES.SUBJECT_STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.SUBJECT_STUDENTS],
      link.subject_student_id,
    )
  }

  for (const grade of grades) {
    await deleteRowById(
      SHEET_NAMES.GRADES,
      SHEET_ID_COLUMNS[SHEET_NAMES.GRADES],
      grade.grade_id,
    )
  }

  for (const request of gradeRequests) {
    await deleteRowById(
      SHEET_NAMES.GRADE_REQUESTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.GRADE_REQUESTS],
      request.request_id,
    )
  }

  await deleteRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    studentId,
  )

  await deleteStudentAccountByStudentId(studentId)

  return {
    success: true,
    message: 'Student account deleted successfully.',
  }
}

function randomPasswordSuffix() {
  return randomBytes(4).toString('hex').toUpperCase()
}
