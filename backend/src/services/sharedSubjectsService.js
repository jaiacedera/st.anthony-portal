import { SHEET_NAMES as S } from '../../database/sheetsSchema.js'
import { appendRow, updateRowById, getAllRows, getRowById, findRows, assertSubjectInstructor, assignedInstructorIds } from '../../database/sheetsService.js'
import { resolveInstructorContext } from './instructorSubjectsService.js'
import { sendProfessorAssignmentEmail } from './emailService.js'
import { withWriteLock } from '../utils/writeLock.js'

const active = row => row.status !== 'INACTIVE'
export const personName = row => [row?.first_name, row?.middle_name, row?.last_name].filter(Boolean).join(' ') || row?.email || 'Professor'
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }) }
export const withSubjectLock = withWriteLock
async function upsert(sheet, id, record) {
  const existing = await getRowById(sheet, 'id', id)
  return existing ? updateRowById(sheet, 'id', id, record) : appendRow(sheet, { id, ...record })
}
export async function subjectContext(username, subjectId) {
  const context = await resolveInstructorContext(username)
  if (!context.instructorId) fail('Your account is not linked to an instructor.', 403)
  return { ...context, subject: await assertSubjectInstructor(subjectId, context.instructorId) }
}

export async function getSubjectMembers({ username, subjectId }) {
  const { subject } = await subjectContext(username, subjectId)
  const [links, instructors, enrollments, students] = await Promise.all([
    getAllRows(S.SUBJECT_INSTRUCTORS), getAllRows(S.INSTRUCTORS),
    findRows(S.SUBJECT_STUDENTS, { subject_id: subjectId, status: 'ACTIVE' }), getAllRows(S.STUDENTS),
  ])
  const ids = assignedInstructorIds(subject, links)
  return {
    success: true,
    professors: instructors.filter(p => ids.includes(p.instructor_id)).map(p => ({ id: p.instructor_id, name: personName(p), email: p.email })),
    availableProfessors: instructors.filter(p => active(p) && !ids.includes(p.instructor_id)).map(p => ({ id: p.instructor_id, name: personName(p), email: p.email })),
    students: enrollments.map(link => {
      const student = students.find(s => s.student_id === link.student_id)
      return { id: link.student_id, name: personName(student), email: student?.email || '', yearLevel: student?.year_level || '' }
    }),
  }
}

export async function changeSubjectProfessor({ username, subjectId, instructorId, action }) {
  return withSubjectLock(subjectId, async () => {
    const context = await subjectContext(username, subjectId)
    if (!['add', 'remove'].includes(action)) fail('Action must be add or remove.')
    const [professor, links] = await Promise.all([
      getRowById(S.INSTRUCTORS, 'instructor_id', instructorId), getAllRows(S.SUBJECT_INSTRUCTORS),
    ])
    if (!professor || (action === 'add' && !active(professor))) fail('Professor was not found.', 404)
    const assigned = assignedInstructorIds(context.subject, links)
    const alreadyAssigned = assigned.includes(instructorId)
    if ((action === 'add' && alreadyAssigned) || (action === 'remove' && !alreadyAssigned)) {
      return { success: true, changed: false, message: action === 'add' ? 'Professor is already assigned.' : 'Professor is not assigned.' }
    }
    if (action === 'remove' && assigned.length === 1) fail('Keep at least one professor assigned.', 409)
    const timestamp = new Date().toISOString()
    // Materialize the legacy owner before adding/removing relations.
    for (const id of assigned) {
      if (!links.some(link => link.subject_id === subjectId && link.instructor_id === id)) {
        await upsert(S.SUBJECT_INSTRUCTORS, JSON.stringify([subjectId, id]), {
          subject_id: subjectId, instructor_id: id, assigned_by: context.instructorId, assigned_at: timestamp, status: 'ACTIVE',
        })
      }
    }
    await upsert(S.SUBJECT_INSTRUCTORS, JSON.stringify([subjectId, instructorId]), {
      subject_id: subjectId, instructor_id: instructorId, assigned_by: context.instructorId,
      assigned_at: timestamp, status: action === 'add' ? 'ACTIVE' : 'INACTIVE',
    })
    await updateRowById(S.SUBJECTS, 'subject_id', subjectId, { grading_mode: 'COLLABORATIVE', updated_at: timestamp })
    const email = action === 'add' ? await sendProfessorAssignmentEmail({
      recipientEmail: professor.email, subjectName: context.subject.subject_name,
      subjectCode: context.subject.subject_code, section: context.subject.section,
      addedByName: personName(context.instructorRecord),
    }) : null
    await recalculateSubject(subjectId)
    return { success: true, changed: true, message: action === 'remove' ? 'Professor removed.'
      : email.sent ? 'Professor assigned and notified by email.' : `Professor assigned. Email was not sent: ${email.reason}` }
  })
}

export function calculateFinalGrade(instructorIds, entries) {
  const latest = new Map()
  for (const entry of entries) {
    if (!instructorIds.includes(entry.instructor_id) || !entry.submitted_at || entry.instructor_final_grade === '') continue
    const score = Number(entry.instructor_final_grade)
    if (!Number.isFinite(score) || score < 0 || score > 100) continue
    const previous = latest.get(entry.instructor_id)
    if (!previous || String(entry.updated_at) >= String(previous.updated_at)) latest.set(entry.instructor_id, entry)
  }
  const values = [...latest.values()].map(entry => Number(entry.instructor_final_grade))
  return {
    final_grade: values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '',
    status: instructorIds.length > 0 && values.length === instructorIds.length ? 'FINAL' : 'PENDING',
    submitted_count: values.length, assigned_count: instructorIds.length,
  }
}

export async function readSubjectResults(subjectId) {
  const [subject, assignments, enrollments, grades] = await Promise.all([
    getRowById(S.SUBJECTS, 'subject_id', subjectId), getAllRows(S.SUBJECT_INSTRUCTORS),
    findRows(S.SUBJECT_STUDENTS, { subject_id: subjectId, status: 'ACTIVE' }), getAllRows(S.INSTRUCTOR_GRADES),
  ])
  if (!subject) fail('Subject was not found.', 404)
  const instructorIds = assignedInstructorIds(subject, assignments)
  return { subject, instructorIds, enrollments, grades,
    results: enrollments.map(link => ({
      subject_student_id: link.subject_student_id, student_id: link.student_id,
      ...calculateFinalGrade(instructorIds, grades.filter(g => g.subject_student_id === link.subject_student_id)),
    })),
  }
}

export async function recalculateSubject(subjectId) {
  const data = await readSubjectResults(subjectId)
  for (const result of data.results) {
    await upsert(S.FINAL_GRADES, result.subject_student_id, { ...result, calculated_at: new Date().toISOString() })
  }
  return data
}

export async function getProfessorGrades({ username, subjectId }) {
  const { instructorId } = await subjectContext(username, subjectId)
  const [data, students] = await Promise.all([readSubjectResults(subjectId), getAllRows(S.STUDENTS)])
  return { success: true, rows: data.enrollments.map(link => {
    const grade = data.grades.filter(g => g.subject_student_id === link.subject_student_id && g.instructor_id === instructorId)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]
    return {
      studentId: link.student_id, studentName: personName(students.find(s => s.student_id === link.student_id)),
      knowledge: grade?.knowledge_grade ?? '', performance: grade?.performance_grade ?? '',
      attitude: grade?.attitude_grade ?? '', myGrade: grade?.instructor_final_grade ?? '',
      status: grade?.submitted_at ? 'SUBMITTED' : 'PENDING',
    }
  }) }
}

export async function saveProfessorGrade({ username, subjectId, studentId, knowledge, performance, attitude }) {
  const scores = [knowledge, performance, attitude]
  if (scores.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)) fail('Enter all three grades as numbers from 0 to 100.')
  return withSubjectLock(subjectId, async () => {
    const { instructorId, subject } = await subjectContext(username, subjectId)
    if (subject.grading_mode !== 'COLLABORATIVE') fail('This subject uses the existing gradebook.', 409)
    const [enrollment] = await findRows(S.SUBJECT_STUDENTS, { subject_id: subjectId, student_id: studentId, status: 'ACTIVE' })
    if (!enrollment) fail('Student is not enrolled in this subject.', 403)
    const id = JSON.stringify([enrollment.subject_student_id, instructorId])
    const timestamp = new Date().toISOString()
    const record = {
      subject_student_id: enrollment.subject_student_id, instructor_id: instructorId,
      knowledge_grade: knowledge, performance_grade: performance, attitude_grade: attitude,
      instructor_final_grade: (knowledge + performance + attitude) / 3,
      submitted_at: timestamp, updated_at: timestamp,
    }
    await upsert(S.INSTRUCTOR_GRADES, id, record)
    const persisted = await getRowById(S.INSTRUCTOR_GRADES, 'id', id)
    if (!persisted || Object.entries(record).some(([key, value]) => String(persisted[key]) !== String(value))) {
      fail('Google Sheets could not verify your grade. Reload before retrying.', 503)
    }
    await recalculateSubject(subjectId)
    return { success: true, message: 'Your grade was saved and verified. The subject grade has been recalculated.' }
  })
}
