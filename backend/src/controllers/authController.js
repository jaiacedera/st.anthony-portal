import { authenticateInstructor, authenticateStudent } from '../services/authService.js'
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
  } catch (error) {
    sendJson(res, error?.statusCode ?? 400, {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid request body.',
    })
  }
}

export async function postStudentLogin(req, res) {
  try {
    const body = await readJsonBody(req)
    const email =
      typeof body.email === 'string'
        ? body.email
        : typeof body.credential === 'string'
          ? body.credential
          : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const payload = await authenticateStudent(email, password)

    sendJson(res, payload.success ? 200 : 401, payload)
  } catch (error) {
    sendJson(res, error?.statusCode ?? 400, {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid request body.',
    })
  }
}
