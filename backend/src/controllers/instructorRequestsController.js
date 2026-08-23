import { readJsonBody } from '../utils/request.js'
import {
  getInstructorRequests,
  reviewInstructorRequest,
} from '../services/instructorRequestsService.js'
import { sendJson } from '../utils/http.js'

export async function getInstructorRequestsData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username is required.',
    })
    return
  }

  const payload = await getInstructorRequests(username)
  sendJson(res, 200, payload)
}

export async function postInstructorRequestReview(req, res) {
  const body = await readJsonBody(req)
  const username = body?.username?.trim?.() ?? ''
  const requestId = body?.requestId?.trim?.() ?? ''
  const status = body?.status?.trim?.().toUpperCase?.() ?? ''

  if (!username || !requestId || !status) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username, request ID, and review status are required.',
    })
    return
  }

  const payload = await reviewInstructorRequest({
    username,
    requestId,
    status,
  })
  sendJson(res, 200, payload)
}
