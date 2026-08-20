import { getInstructorAccountByUsername } from '../../database/authStore.js'
import { SHEET_NAMES } from '../../database/sheetsSchema.js'
import { getAllRows, getInstructorSubjects } from '../../database/sheetsService.js'

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

export async function getInstructorDashboard(username) {
  const account = getInstructorAccountByUsername(username)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const instructorId = resolveInstructorId(account, instructors)

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
      stats: {
        subjectCount: 0,
        studentCount: 0,
        gradesPostedCount: 0,
        pendingRequestCount: 0,
      },
      previews: {
        subjects: [],
        gradePosting: [],
        pendingRequests: [],
      },
    }
  }

  const [subjects, subjectStudents, grades, gradeRequests, students] = await Promise.all([
    getInstructorSubjects(instructorId),
    getAllRows(SHEET_NAMES.SUBJECT_STUDENTS),
    getAllRows(SHEET_NAMES.GRADES),
    getAllRows(SHEET_NAMES.GRADE_REQUESTS),
    getAllRows(SHEET_NAMES.STUDENTS),
  ])

  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))
  const subjectIds = new Set(activeSubjects.map((subject) => subject.subject_id))
  const activeSubjectStudents = subjectStudents.filter(
    (link) => isActiveStatus(link.status) && subjectIds.has(link.subject_id),
  )
  const uniqueStudentIds = new Set(
    activeSubjectStudents.map((link) => String(link.student_id ?? '').trim()).filter(Boolean),
  )
  const postedGrades = grades.filter(
    (grade) =>
      subjectIds.has(grade.subject_id) &&
      [
        grade.current_grade,
        grade.final,
        grade.midterm,
        grade.prelim,
        grade.remarks,
        grade.posted_at,
      ].some((value) => String(value ?? '').trim() !== ''),
  )
  const pendingRequests = gradeRequests.filter(
    (request) =>
      subjectIds.has(request.subject_id) &&
      String(request.status ?? '').trim().toUpperCase() === 'PENDING',
  )

  const subjectStudentCountById = new Map()

  for (const link of activeSubjectStudents) {
    subjectStudentCountById.set(
      link.subject_id,
      (subjectStudentCountById.get(link.subject_id) ?? 0) + 1,
    )
  }

  const studentById = new Map(
    students.map((student) => [student.student_id, student]),
  )
  const subjectById = new Map(
    activeSubjects.map((subject) => [subject.subject_id, subject]),
  )

  return {
    success: true,
    connected: true,
    needsBinding: false,
    header: {
      schoolYear: getDisplayValue(getMostCommonValue(activeSubjects.map((subject) => subject.school_year))),
      semester: getDisplayValue(getMostCommonValue(activeSubjects.map((subject) => subject.semester))),
    },
    stats: {
      subjectCount: activeSubjects.length,
      studentCount: uniqueStudentIds.size,
      gradesPostedCount: postedGrades.length,
      pendingRequestCount: pendingRequests.length,
    },
    previews: {
      subjects: activeSubjects.slice(0, 3).map((subject) => ({
        subjectId: subject.subject_id,
        subjectCode: getDisplayValue(subject.subject_code, 'N/A'),
        subjectName: getDisplayValue(subject.subject_name, 'Untitled Subject'),
        schedule: getDisplayValue(subject.schedule, 'Schedule not set'),
        studentCount: subjectStudentCountById.get(subject.subject_id) ?? 0,
      })),
      gradePosting: activeSubjects.slice(0, 3).map((subject) => ({
        subjectId: subject.subject_id,
        subjectCode: getDisplayValue(subject.subject_code, 'N/A'),
        subjectName: getDisplayValue(subject.subject_name, 'Untitled Subject'),
        studentCount: subjectStudentCountById.get(subject.subject_id) ?? 0,
      })),
      pendingRequests: pendingRequests.slice(0, 3).map((request) => {
        const student = studentById.get(request.student_id)
        const subject = subjectById.get(request.subject_id)
        const studentName = [
          student?.first_name,
          student?.middle_name,
          student?.last_name,
        ]
          .filter((part) => String(part ?? '').trim())
          .join(' ')

        return {
          requestId: request.request_id,
          studentName: studentName || 'Unknown Student',
          subjectCode: getDisplayValue(subject?.subject_code, 'N/A'),
          status: getDisplayValue(request.status, 'PENDING'),
        }
      }),
    },
  }
}
