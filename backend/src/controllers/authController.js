import {
  changeStudentPassword,
  authenticateInstructor,
  authenticateStudent,
  requestStudentPasswordReset,
  resetStudentPassword,
} from '../services/authService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function postStudentPasswordChange(req, res) {
  const body = await readJsonBody(req)
  const input = Object.fromEntries(
    ['email', 'studentId', 'currentPassword', 'newPassword', 'confirmPassword']
      .map(key => [key, typeof body[key] === 'string' ? body[key] : '']),
  )
  const payload = await changeStudentPassword(input)
  sendJson(res, payload.success ? 200 : 400, payload)
}

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

export async function postStudentForgotPassword(req, res) {
  try {
    const body = await readJsonBody(req)
    const email = typeof body.email === 'string' ? body.email : ''
    const payload = await requestStudentPasswordReset(email)

    sendJson(res, payload.success ? 200 : 400, payload)
  } catch (error) {
    sendJson(res, error?.statusCode ?? 400, {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid request body.',
    })
  }
}

export async function postStudentResetPassword(req, res) {
  try {
    const body = await readJsonBody(req)
    const token = typeof body.token === 'string' ? body.token : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
    const payload = await resetStudentPassword(token, password, confirmPassword)

    sendJson(res, payload.success ? 200 : 400, payload)
  } catch (error) {
    sendJson(res, error?.statusCode ?? 400, {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid request body.',
    })
  }
}
