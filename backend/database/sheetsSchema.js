export const SHEET_NAMES = {
  STUDENTS: 'Students',
  STUDENT_AUTH_ACCOUNTS: 'StudentAuthAccounts',
  INSTRUCTORS: 'Instructors',
  SUBJECTS: 'Subjects',
  SUBJECT_STUDENTS: 'SubjectStudents',
  GRADES: 'Grades',
  GRADE_PUBLICATIONS: 'GradePublications',
  GRADE_REQUESTS: 'GradeBreakdownRequests',
}

export const SHEET_HEADERS = {
  [SHEET_NAMES.STUDENTS]: [
    'student_id',
    'student_number',
    'email',
    'first_name',
    'middle_name',
    'last_name',
    'year_level',
    'phone',
    'address',
    'date_of_birth',
    'gender',
    'status',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.STUDENT_AUTH_ACCOUNTS]: [
    'account_id',
    'email',
    'username',
    'student_id',
    'created_by_instructor_id',
    'password_salt',
    'password_hash',
    'status',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.INSTRUCTORS]: [
    'instructor_id',
    'email',
    'first_name',
    'middle_name',
    'last_name',
    'status',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.SUBJECTS]: [
    'subject_id',
    'subject_code',
    'subject_name',
    'instructor_id',
    'semester',
    'school_year',
    'schedule',
    'room',
    'status',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.SUBJECT_STUDENTS]: [
    'subject_student_id',
    'subject_id',
    'student_id',
    'added_by',
    'added_at',
    'status',
  ],
  [SHEET_NAMES.GRADES]: [
    'grade_id',
    'subject_id',
    'student_id',
    'prelim',
    'midterm',
    'final',
    'current_grade',
    'remarks',
    'posted_by',
    'posted_at',
    'updated_at',
  ],
  [SHEET_NAMES.GRADE_PUBLICATIONS]: [
    'publication_id',
    'subject_id',
    'grading_period',
    'is_posted',
    'posted_by',
    'posted_at',
    'updated_at',
  ],
  [SHEET_NAMES.GRADE_REQUESTS]: [
    'request_id',
    'student_id',
    'subject_id',
    'grade_id',
    'reason',
    'status',
    'requested_at',
    'reviewed_at',
    'reviewed_by',
  ],
}

export const SHEET_ID_COLUMNS = {
  [SHEET_NAMES.STUDENTS]: 'student_id',
  [SHEET_NAMES.STUDENT_AUTH_ACCOUNTS]: 'account_id',
  [SHEET_NAMES.INSTRUCTORS]: 'instructor_id',
  [SHEET_NAMES.SUBJECTS]: 'subject_id',
  [SHEET_NAMES.SUBJECT_STUDENTS]: 'subject_student_id',
  [SHEET_NAMES.GRADES]: 'grade_id',
  [SHEET_NAMES.GRADE_PUBLICATIONS]: 'publication_id',
  [SHEET_NAMES.GRADE_REQUESTS]: 'request_id',
}

export const DATABASE_SHEETS = Object.values(SHEET_NAMES).map((name) => ({
  name,
  headers: SHEET_HEADERS[name],
  idColumn: SHEET_ID_COLUMNS[name],
}))

export function getSheetHeaders(sheetName) {
  const headers = SHEET_HEADERS[sheetName]

  if (!headers) {
    throw new Error(`Unknown Google Sheet tab "${sheetName}"`)
  }

  return headers
}
