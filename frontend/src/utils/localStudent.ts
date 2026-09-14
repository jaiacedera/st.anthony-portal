import type { StudentDashboardPayload, UpdateStudentProfileInput } from '../services/studentApi'

export const LOCAL_STUDENT_ID = 'local-demo-student'
const PROFILE_KEY = 'local-demo-student-profile'

export function isLocalStudentEnvironment() {
  return import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

export function getLocalStudentLogin(username: string, password: string) {
  if (!import.meta.env.DEV || !isLocalStudentEnvironment() || username.trim().toLowerCase() !== 'student') {
    return null
  }

  if (password !== 'student123') {
    return { success: false, message: 'Invalid email or password.' }
  }

  return {
    success: true,
    account: {
      accountId: LOCAL_STUDENT_ID,
      studentId: LOCAL_STUDENT_ID,
      username: 'student',
      email: 'student',
      role: 'STUDENT',
    },
  }
}

export function isLocalStudent(studentId?: string) {
  return isLocalStudentEnvironment() && studentId === LOCAL_STUDENT_ID
}

export function getLocalStudentDashboard(): StudentDashboardPayload {
  if (!isLocalStudentEnvironment()) throw new Error('Local student access is unavailable.')

  let student: StudentDashboardPayload['student'] = {
    id: LOCAL_STUDENT_ID,
    studentNumber: 'LOCAL-001',
    fullName: 'Local Student',
    firstName: 'Local',
    middleName: '',
    lastName: 'Student',
    email: 'student',
    yearLevel: '1st Year',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    createdAt: '',
  }
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(PROFILE_KEY) ?? 'null')
    if (saved?.id === LOCAL_STUDENT_ID) student = { ...student, ...saved }
  } catch { /* Use the default profile if local storage data is malformed. */ }

  return {
    success: true,
    connected: false,
    header: { schoolYear: 'Local preview', semester: 'Not set' },
    student,
    stats: { enrolledSubjectCount: 0, currentGwa: '—', pendingRequestCount: 0, overallGwa: '—' },
    subjects: [],
    requests: [],
  }
}

export function updateLocalStudentProfile(input: UpdateStudentProfileInput) {
  const student = {
    ...getLocalStudentDashboard().student,
    studentNumber: input.studentNumber,
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    fullName: [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' '),
    yearLevel: input.yearLevel,
    phone: input.phone,
    address: input.address,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
  }
  window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(student))
  return { success: true, message: 'Local profile updated.', student }
}
