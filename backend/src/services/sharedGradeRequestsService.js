import { randomUUID } from 'node:crypto'
import { SHEET_NAMES as S } from '../../database/sheetsSchema.js'
import { appendRow, findRows, getAllRows, getRowById, updateRowById, upsertGradeBreakdownResponse } from '../../database/sheetsService.js'
import { readSubjectResults, subjectContext, withSubjectLock, personName } from './sharedSubjectsService.js'
import { buildGradeBreakdownReason } from '../utils/gradeRequestMetadata.js'

export async function createSharedBreakdownRequest({ subjectId, studentId, reason }) {
  return withSubjectLock(subjectId, async () => {
    const [enrollment] = await findRows(S.SUBJECT_STUDENTS, { subject_id: subjectId, student_id: studentId, status: 'ACTIVE' })
    if (!enrollment) throw Object.assign(new Error('You are not enrolled in this subject.'), { statusCode: 403 })
    const [existing] = await findRows(S.GRADE_REQUESTS, { subject_id: subjectId, student_id: studentId })
    if (existing) {
      if (!existing.subject_student_id) await updateRowById(S.GRADE_REQUESTS, 'request_id', existing.request_id, {
        subject_student_id: enrollment.subject_student_id, requested_by: studentId,
      })
      return { success: true, requestId: existing.request_id, message: 'A breakdown request already exists for this enrollment.' }
    }
    const requestId = randomUUID()
    await appendRow(S.GRADE_REQUESTS, {
      request_id: requestId, subject_student_id: enrollment.subject_student_id,
      student_id: studentId, subject_id: subjectId, requested_by: studentId,
      reason: buildGradeBreakdownReason({ gradingPeriod: 'final', message: reason || '' }),
      status: 'PENDING', requested_at: new Date().toISOString(), reviewed_at: '', reviewed_by: '',
    })
    return { success: true, requestId, message: 'Grade breakdown requested.' }
  })
}

export async function reviewSharedBreakdown({ username, requestId, status }) {
  const request = await getRowById(S.GRADE_REQUESTS, 'request_id', requestId)
  if (!request) throw Object.assign(new Error('Request was not found.'), { statusCode: 404 })
  return withSubjectLock(request.subject_id, async () => {
    const { instructorId, instructorRecord, subject } = await subjectContext(username, request.subject_id)
    const current = await getRowById(S.GRADE_REQUESTS, 'request_id', requestId)
    if (current.status !== 'PENDING') throw Object.assign(new Error('This request has already been reviewed.'), { statusCode: 409 })
    if (!['APPROVED', 'REJECTED'].includes(status)) throw Object.assign(new Error('Invalid review status.'), { statusCode: 400 })
    const data = await readSubjectResults(request.subject_id)
    const enrollment = data.enrollments.find(e => request.subject_student_id
      ? e.subject_student_id === request.subject_student_id : e.student_id === request.student_id)
    if (!enrollment) throw Object.assign(new Error('Student is no longer enrolled.'), { statusCode: 409 })
    const reviewedAt = new Date().toISOString()
    if (status === 'APPROVED') {
      const instructors = await getAllRows(S.INSTRUCTORS)
      const result = data.results.find(r => r.subject_student_id === enrollment.subject_student_id)
      const entries = data.instructorIds.map(id => {
        const grade = data.grades.filter(g => g.subject_student_id === enrollment.subject_student_id && g.instructor_id === id)
          .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]
        return {
          label: personName(instructors.find(p => p.instructor_id === id)), weight: 100,
          items: [
            { label: 'Knowledge', score: grade ? Number(grade.knowledge_grade) : null },
            { label: 'Performance', score: grade ? Number(grade.performance_grade) : null },
            { label: 'Attitude', score: grade ? Number(grade.attitude_grade) : null },
          ],
          average: grade ? Number(grade.instructor_final_grade) : null,
          weighted: grade ? Number(grade.instructor_final_grade) : null,
        }
      })
      await upsertGradeBreakdownResponse({
        requestId, studentId: request.student_id, subjectId: request.subject_id, gradingPeriod: 'final',
        breakdownPayload: {
          collaborative: true,
          requestId, subjectId: request.subject_id, subjectCode: subject.subject_code, subjectTitle: subject.subject_name,
          studentId: request.student_id, gradingPeriod: 'final',
          knowledge: { label: 'Professor grades (each category contributes one third)', weight: 100, weighted: result.final_grade === '' ? null : Number(result.final_grade), sections: entries },
          skills: null, attitude: null, finalGrade: result.status === 'FINAL' ? Number(result.final_grade) : null,
          rating: '', remarks: result.status === 'FINAL' ? 'Final' : 'Pending professor submissions', generatedAt: reviewedAt,
        },
      })
    }
    // Publish approval only after the server-generated snapshot was written successfully.
    await updateRowById(S.GRADE_REQUESTS, 'request_id', requestId, {
      status, reviewed_by: instructorId, reviewed_at: reviewedAt,
      subject_student_id: enrollment.subject_student_id, requested_by: request.student_id,
    })
    return { success: true, request: {
      requestId, status, processedAt: reviewedAt, processedBy: instructorId, processedByName: personName(instructorRecord),
    } }
  })
}
