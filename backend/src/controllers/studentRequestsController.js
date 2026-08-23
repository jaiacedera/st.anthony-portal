import { readJsonBody } from '../utils/request.js'
import {
  getStudentRequestResponse,
  submitStudentBreakdownRequest,
} from '../services/studentRequestsService.js'
import { sendJson } from '../utils/http.js'

export async function getStudentRequestResponseData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const requestId = requestUrl.searchParams.get('requestId')?.trim() ?? ''
  const studentId = requestUrl.searchParams.get('studentId')?.trim() ?? ''
  const email = requestUrl.searchParams.get('email')?.trim() ?? ''

  if (!requestId || (!studentId && !email)) {
    sendJson(res, 400, {
      success: false,
      message: 'Request ID and student identity are required.',
    })
    return
  }

  const payload = await getStudentRequestResponse({
    requestId,
    studentId,
    email,
  })
  sendJson(res, 200, payload)
}

export async function postStudentBreakdownRequest(req, res) {
  const body = await readJsonBody(req)
  const subjectId = body?.subjectId?.trim?.() ?? ''
  const studentId = body?.studentId?.trim?.() ?? ''
  const email = body?.email?.trim?.() ?? ''
  const reason = body?.reason?.trim?.() ?? ''

  if (!subjectId || (!studentId && !email)) {
    sendJson(res, 400, {
      success: false,
      message: 'Subject ID and student identity are required.',
    })
    return
  }

  const payload = await submitStudentBreakdownRequest({
    subjectId,
    studentId,
    email,
    reason,
  })
  sendJson(res, 200, payload)
}
