import { findStudentAccountByEmail } from '../../database/authStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getAllRows, getRowById } from '../../database/sheetsService.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
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

function buildPersonName(record) {
  return [
    record?.first_name,
    record?.middle_name,
    record?.last_name,
  ]
    .filter((part) => String(part ?? '').trim())
    .join(' ')
}

function getOptionalValue(value) {
  const normalized = String(value ?? '').trim()
  return normalized || ''
}

function parseNumericGrade(value) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return null
  }

  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function formatAverage(values) {
  if (!values.length) {
    return ''
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return (total / values.length).toFixed(2)
}

async function resolveStudentRecord({ studentId, email }) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (normalizedStudentId) {
    const student = await getRowById(
      SHEET_NAMES.STUDENTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
      normalizedStudentId,
    )

    if (student) {
      return student
    }
  }

  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    const error = new Error('Student identity is required.')
    error.statusCode = 400
    throw error
  }

  const account = findStudentAccountByEmail(normalizedEmail)

  if (!account?.student_id) {
    const error = new Error('Student account was not found.')
    error.statusCode = 404
    throw error
  }

  const student = await getRowById(
    SHEET_NAMES.STUDENTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENTS],
    account.student_id,
  )

  if (!student) {
    const error = new Error('Student record was not found.')
    error.statusCode = 404
    throw error
  }

  return student
}

export async function getStudentDashboard({ studentId = '', email = '' }) {
  const student = await resolveStudentRecord({ studentId, email })

  const [subjects, subjectStudents, grades, gradeRequests, instructors] = await Promise.all([
    getAllRows(SHEET_NAMES.SUBJECTS),
    getAllRows(SHEET_NAMES.SUBJECT_STUDENTS),
    getAllRows(SHEET_NAMES.GRADES),
    getAllRows(SHEET_NAMES.GRADE_REQUESTS),
    getAllRows(SHEET_NAMES.INSTRUCTORS),
  ])

  const activeLinks = subjectStudents.filter(
    (link) =>
      isActiveStatus(link.status) &&
      String(link.student_id ?? '').trim() === String(student.student_id ?? '').trim(),
  )
  const activeSubjectIds = new Set(
    activeLinks.map((link) => String(link.subject_id ?? '').trim()).filter(Boolean),
  )
  const activeSubjects = subjects.filter(
    (subject) =>
      isActiveStatus(subject.status) &&
      activeSubjectIds.has(String(subject.subject_id ?? '').trim()),
  )
  const studentGrades = grades.filter(
    (grade) => String(grade.student_id ?? '').trim() === String(student.student_id ?? '').trim(),
  )
  const gradeBySubjectId = new Map(
    studentGrades.map((grade) => [String(grade.subject_id ?? '').trim(), grade]),
  )
  const instructorById = new Map(
    instructors.map((instructor) => [String(instructor.instructor_id ?? '').trim(), instructor]),
  )
  const currentNumericGrades = activeSubjects
    .map((subject) => {
      const grade = gradeBySubjectId.get(String(subject.subject_id ?? '').trim())
      return parseNumericGrade(grade?.current_grade || grade?.final)
    })
    .filter((value) => value !== null)
  const overallNumericGrades = studentGrades
    .map((grade) => parseNumericGrade(grade.current_grade || grade.final))
    .filter((value) => value !== null)
  const pendingRequests = gradeRequests.filter(
    (request) =>
      String(request.student_id ?? '').trim() === String(student.student_id ?? '').trim() &&
      String(request.status ?? '').trim().toUpperCase() === 'PENDING',
  )

  return {
    success: true,
    connected: true,
    header: {
      schoolYear: getDisplayValue(
        getMostCommonValue(activeSubjects.map((subject) => subject.school_year)),
      ),
      semester: getDisplayValue(
        getMostCommonValue(activeSubjects.map((subject) => subject.semester)),
      ),
    },
    student: {
      id: student.student_id,
      studentNumber: getDisplayValue(student.student_number),
      fullName: buildPersonName(student) || 'Student profile incomplete',
      email: getDisplayValue(student.email),
      yearLevel: getDisplayValue(student.year_level),
      phone: getOptionalValue(student.phone),
      address: getOptionalValue(student.address),
      dateOfBirth: getOptionalValue(student.date_of_birth),
      gender: getOptionalValue(student.gender),
      createdAt: getOptionalValue(student.created_at),
    },
    stats: {
      enrolledSubjectCount: activeSubjects.length,
      currentGwa: formatAverage(currentNumericGrades),
      pendingRequestCount: pendingRequests.length,
      overallGwa: formatAverage(overallNumericGrades),
    },
    subjects: activeSubjects
      .map((subject) => {
        const subjectId = String(subject.subject_id ?? '').trim()
        const grade = gradeBySubjectId.get(subjectId)
        const finalGrade = String(grade?.current_grade || grade?.final || '').trim()
        const instructor = instructorById.get(String(subject.instructor_id ?? '').trim())

        return {
          subjectId,
          subjectCode: getDisplayValue(subject.subject_code, 'N/A'),
          subjectName: getDisplayValue(subject.subject_name, 'Untitled Subject'),
          instructorName: buildPersonName(instructor) || 'Instructor not set',
          schedule: getDisplayValue(subject.schedule),
          room: getDisplayValue(subject.room),
          grade: finalGrade || '-',
          gradeLabel: finalGrade ? 'Final Grade' : 'No Grade Yet',
          hasPostedGrade: Boolean(finalGrade),
        }
      })
      .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode)),
    requests: pendingRequests.map((request) => ({
      requestId: String(request.request_id ?? '').trim(),
      subjectId: String(request.subject_id ?? '').trim(),
      status: getDisplayValue(request.status, 'PENDING'),
    })),
  }
}
