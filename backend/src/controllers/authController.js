import { authenticateInstructor } from '../services/authService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function postInstructorLogin(req, res) {
  try {
    const body = await readJsonBody(req)
    const username =
      typeof body.username === 'string'
        ? body.username
        : typeof body.credential === 'string'
          ? body.credential
          : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const payload = await authenticateInstructor(username, password)

    sendJson(res, payload.success ? 200 : 401, payload)
  } catch {
    sendJson(res, 400, {
      success: false,
      message: 'Invalid request body.',
    })
  }
}
