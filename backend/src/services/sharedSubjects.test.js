import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { SHEET_NAMES as S, SHEET_HEADERS } from '../../database/sheetsSchema.js'

test('shared classes isolate grades, aggregate submissions, manage enrollments and authorize breakdowns', async () => {
  const previousVercel = process.env.VERCEL
  process.env.VERCEL = '1'
  const matrices = new Map(Object.entries(SHEET_HEADERS).map(([sheet, headers]) => [sheet, [[...headers]]]))
  const seed = (sheet, record) => matrices.get(sheet).push(SHEET_HEADERS[sheet].map(key => String(record[key] ?? '')))
  const records = sheet => matrices.get(sheet).slice(1).map(row => Object.fromEntries(SHEET_HEADERS[sheet].map((key, i) => [key, row[i] || ''])))
  let dropGradeWrite = false
  const rangeParts = range => /^'([^']+)'!(.*)$/.exec(range).slice(1)
  const sheets = { spreadsheets: {
    get: async () => ({ data: { sheets: [...matrices.keys()].map((title, sheetId) => ({ properties: { title, sheetId } })) } }),
    values: {
      get: async ({ range }) => {
        const [sheet, cells] = rangeParts(range)
        const values = matrices.get(sheet)
        return { data: { values: structuredClone(cells === '1:2' ? values.slice(0, 2) : values) } }
      },
      append: async ({ range, requestBody }) => {
        const [sheet] = rangeParts(range)
        if (!(dropGradeWrite && sheet === S.INSTRUCTOR_GRADES)) matrices.get(sheet).push(...structuredClone(requestBody.values))
        return { data: {} }
      },
      update: async ({ range, requestBody }) => {
        const [sheet, cells] = rangeParts(range)
        if (!(dropGradeWrite && sheet === S.INSTRUCTOR_GRADES)) {
          matrices.get(sheet)[Number(cells.match(/^A(\d+)/)[1]) - 1] = structuredClone(requestBody.values[0])
        }
        return { data: {} }
      },
    },
  } }
  for (const id of ['a', 'b', 'outsider']) {
    seed(S.INSTRUCTORS, { instructor_id: id, first_name: `Professor ${id}`, email: `${id}@school.test`, status: 'ACTIVE' })
    seed(S.INSTRUCTOR_AUTH_ACCOUNTS, { account_id: id, username: id, instructor_id: id, email: `${id}@school.test`, status: 'ACTIVE' })
  }
  seed(S.SUBJECTS, { subject_id: 'class', subject_code: 'NCM', subject_name: 'Nursing', instructor_id: 'a', section: '3-A', status: 'ACTIVE' })
  seed(S.STUDENTS, { student_id: 'student', first_name: 'Student One', email: 'student@school.test', status: 'ACTIVE' })
  seed(S.STUDENT_AUTH_ACCOUNTS, { account_id: 'student-account', student_id: 'student', email: 'student@school.test', status: 'ACTIVE', password_hash: 'unchanged' })
  seed(S.SUBJECT_STUDENTS, { subject_student_id: 'enrollment', subject_id: 'class', student_id: 'student', status: 'ACTIVE' })
  const emails = []
  const google = mock.module('../../database/googleSheets.js', { namedExports: { createSheetsClient: () => sheets, getSpreadsheetId: () => 'fixture' } })
  const email = mock.module('./emailService.js', { namedExports: {
    sendProfessorAssignmentEmail: async data => { emails.push(data); return { sent: true } },
    sendStudentWelcomeEmail: async () => ({ sent: true }),
  } })
  try {
    const db = await import('../../database/sheetsService.js')
    const shared = await import('./sharedSubjectsService.js')
    const requests = await import('./sharedGradeRequestsService.js')
    const studentRequests = await import('./studentRequestsService.js')
    const students = await import('./instructorStudentsService.js')
    const dashboard = await import('./studentDashboardService.js')
    const subjects = await import('./instructorSubjectsService.js')

    const created = await subjects.createInstructorSubjectForUser({ username: 'a', subjectCode: 'NEW', subjectName: 'New Subject', section: '1-A' })
    assert.equal(created.subject.gradingMode, 'COLLABORATIVE')
    assert.ok(records(S.SUBJECT_INSTRUCTORS).some(link => link.subject_id === created.subject.id && link.instructor_id === 'a'))
    await assert.rejects(shared.changeSubjectProfessor({ username: 'outsider', subjectId: 'class', instructorId: 'b', action: 'add' }), { statusCode: 403 })
    await Promise.all([1, 2].map(() => shared.changeSubjectProfessor({ username: 'a', subjectId: 'class', instructorId: 'b', action: 'add' })))
    assert.equal(emails.length, 1)
    assert.deepEqual(emails[0], { recipientEmail: 'b@school.test', subjectName: 'Nursing', subjectCode: 'NCM', section: '3-A', addedByName: 'Professor a' })
    assert.equal((await db.getInstructorSubjects('b'))[0].subject_id, 'class')
    assert.equal((await shared.getSubjectMembers({ username: 'b', subjectId: 'class' })).professors.length, 2)
    assert.equal(records(S.FINAL_GRADES)[0].status, 'PENDING')

    const input = { subjectId: 'class', studentId: 'student', knowledge: 90, performance: 80, attitude: 100 }
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'outsider' }), { statusCode: 403 })
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'a', studentId: 'other' }), { statusCode: 403 })
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'a', knowledge: '' }), { statusCode: 400 })
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'a', attitude: 101 }), { statusCode: 400 })
    await shared.saveProfessorGrade({ ...input, username: 'a', instructorId: 'b' })
    assert.equal(records(S.INSTRUCTOR_GRADES)[0].instructor_id, 'a')
    assert.equal(records(S.FINAL_GRADES)[0].final_grade, '90.00')
    assert.equal(records(S.FINAL_GRADES)[0].status, 'PENDING')
    assert.equal((await shared.getProfessorGrades({ username: 'b', subjectId: 'class' })).rows[0].knowledge, '')
    await shared.saveProfessorGrade({ ...input, username: 'b', knowledge: 80, performance: 80, attitude: 80 })
    assert.equal(records(S.FINAL_GRADES)[0].final_grade, '85.00')
    assert.equal(records(S.FINAL_GRADES)[0].status, 'FINAL')
    await shared.saveProfessorGrade({ ...input, username: 'a', knowledge: 100, performance: 100, attitude: 100 })
    assert.equal(records(S.INSTRUCTOR_GRADES).length, 2)
    assert.equal(records(S.FINAL_GRADES)[0].final_grade, '90.00')
    assert.equal(records(S.INSTRUCTOR_GRADES).find(g => g.instructor_id === 'b').knowledge_grade, '80')
    dropGradeWrite = true
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'a', knowledge: 12 }), { statusCode: 503 })
    dropGradeWrite = false
    await assert.rejects(db.upsertGrade({ subjectId: 'class', studentId: 'student', postedBy: 'a', final: 10 }), { statusCode: 409 })

    const view = await dashboard.getStudentDashboard({ studentId: 'student' })
    assert.equal(view.subjects[0].grade, '90.00')
    assert.equal(view.subjects[0].gradeStatus, 'FINAL')
    assert.equal(view.subjects[0].knowledge, undefined)
    assert.equal(view.subjects[0].professorGrades, undefined)
    const request = await studentRequests.submitStudentBreakdownRequest({ subjectId: 'class', studentId: 'student', gradingPeriod: 'final' })
    const duplicate = await requests.createSharedBreakdownRequest({ subjectId: 'class', studentId: 'student' })
    assert.equal(duplicate.requestId, request.requestId)
    await assert.rejects(requests.createSharedBreakdownRequest({ subjectId: 'class', studentId: 'unrelated' }), { statusCode: 403 })
    await assert.rejects(requests.reviewSharedBreakdown({ username: 'outsider', requestId: request.requestId, status: 'APPROVED' }), { statusCode: 403 })
    await assert.rejects(studentRequests.getStudentRequestResponse({ requestId: request.requestId, studentId: 'student' }), { statusCode: 404 })
    await requests.reviewSharedBreakdown({ username: 'b', requestId: request.requestId, status: 'APPROVED' })
    assert.equal(records(S.GRADE_REQUESTS)[0].reviewed_by, 'b')
    const response = await studentRequests.getStudentRequestResponse({ requestId: request.requestId, studentId: 'student' })
    assert.equal(response.response.knowledge.sections.length, 2)
    assert.equal(response.response.finalGrade, 90)
    await assert.rejects(requests.reviewSharedBreakdown({ username: 'a', requestId: request.requestId, status: 'REJECTED' }), { statusCode: 409 })

    await students.createInstructorStudentForUser({ username: 'b', email: 'STUDENT@school.test', name: 'No overwrite', yearLevel: '4', subjectIds: ['class'] })
    assert.equal(records(S.SUBJECT_STUDENTS).length, 1)
    assert.equal(records(S.STUDENT_AUTH_ACCOUNTS)[0].password_hash, 'unchanged')
    await assert.rejects(students.updateInstructorStudentEnrollment({ username: 'outsider', subjectId: 'class', studentId: 'student', action: 'remove' }), { statusCode: 403 })
    await shared.changeSubjectProfessor({ username: 'a', subjectId: 'class', instructorId: 'b', action: 'remove' })
    assert.equal(records(S.FINAL_GRADES)[0].final_grade, '100.00')
    assert.equal((await db.getInstructorSubjects('b')).length, 0)
    await assert.rejects(shared.saveProfessorGrade({ ...input, username: 'b' }), { statusCode: 403 })
    await assert.rejects(shared.changeSubjectProfessor({ username: 'a', subjectId: 'class', instructorId: 'a', action: 'remove' }), { statusCode: 409 })
    await students.updateInstructorStudentEnrollment({ username: 'a', subjectId: 'class', studentId: 'student', action: 'remove' })
    assert.equal((await dashboard.getStudentDashboard({ studentId: 'student' })).subjects.length, 0)
    await assert.rejects(studentRequests.getStudentRequestResponse({ requestId: request.requestId, studentId: 'student' }), { statusCode: 403 })
    await students.updateInstructorStudentEnrollment({ username: 'a', subjectId: 'class', studentId: 'student', action: 'add' })
    assert.equal(records(S.SUBJECT_STUDENTS).length, 1)
    await assert.rejects(students.createInstructorStudentForUser({ username: 'a', email: 'new@school.test', subjectIds: ['class'], createAccount: false }), { statusCode: 409 })
    await assert.rejects(students.createInstructorStudentForUser({ username: 'outsider', email: 'new@school.test', subjectIds: ['class'] }), { statusCode: 403 })
    assert.equal(records(S.STUDENTS).length, 1)
    const newStudent = await students.createInstructorStudentForUser({
      username: 'a', email: 'new@school.test', name: 'New Student', yearLevel: '3', subjectIds: ['class'], createAccount: true,
    })
    assert.equal(newStudent.student.fullName, 'New Student')
    assert.equal(newStudent.student.yearSection, '3')
    assert.ok(records(S.STUDENT_AUTH_ACCOUNTS).find(a => a.email === 'new@school.test').password_hash)
    const newDashboard = await dashboard.getStudentDashboard({ studentId: newStudent.student.id })
    assert.equal(newDashboard.subjects[0].gradeStatus, 'PENDING')
    assert.equal(newDashboard.subjects[0].canRequestBreakdown, true)
    const rejected = await requests.createSharedBreakdownRequest({ subjectId: 'class', studentId: newStudent.student.id })
    await requests.reviewSharedBreakdown({ username: 'a', requestId: rejected.requestId, status: 'REJECTED' })
    assert.equal(records(S.GRADE_REQUESTS).find(r => r.request_id === rejected.requestId).reviewed_by, 'a')
    await assert.rejects(studentRequests.getStudentRequestResponse({ requestId: request.requestId, studentId: newStudent.student.id }), { statusCode: 403 })
    await assert.rejects(studentRequests.getStudentRequestResponse({ requestId: rejected.requestId, studentId: newStudent.student.id }), { statusCode: 404 })
    const zero = shared.calculateFinalGrade(['a', 'b'], [
      { instructor_id: 'a', instructor_final_grade: 0, submitted_at: 'now', updated_at: 'now' },
      { instructor_id: 'outsider', instructor_final_grade: 100, submitted_at: 'now', updated_at: 'now' },
    ])
    assert.equal(zero.final_grade, '0.00')
    assert.equal(zero.status, 'PENDING')
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previousVercel
    google.restore()
    email.restore()
  }
})
