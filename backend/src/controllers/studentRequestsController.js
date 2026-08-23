import { getStudentRequestResponse } from '../services/studentRequestsService.js'
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
