import { readJsonBody } from '../utils/request.js'
import {
  getInstructorGradePublicationState,
  postInstructorGrades,
} from '../services/instructorGradesService.js'
import { sendJson } from '../utils/http.js'

export async function getInstructorGradePublicationData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''
  const subjectId = requestUrl.searchParams.get('subjectId')?.trim() ?? ''
  const gradingPeriod = requestUrl.searchParams.get('gradingPeriod')?.trim() ?? ''

  if (!username || !subjectId || !gradingPeriod) {
    sendJson(res, 400, {
      success: false,
      message: 'Username, subject ID, and grading period are required.',
    })
    return
  }

  const payload = await getInstructorGradePublicationState({
    username,
    subjectId,
    gradingPeriod,
  })
  sendJson(res, 200, payload)
}

export async function postInstructorGradesData(req, res) {
  const body = await readJsonBody(req)
  const username = body?.username?.trim?.() ?? ''
  const subjectId = body?.subjectId?.trim?.() ?? ''
  const gradingPeriod = body?.gradingPeriod?.trim?.() ?? ''
  const grades = Array.isArray(body?.grades) ? body.grades : null

  if (!username || !subjectId || !gradingPeriod || !grades) {
    sendJson(res, 400, {
      success: false,
      message: 'Username, subject ID, grading period, and grades are required.',
    })
    return
  }

  const payload = await postInstructorGrades({
    username,
    subjectId,
    gradingPeriod,
    grades,
  })
  sendJson(res, 200, payload)
}
