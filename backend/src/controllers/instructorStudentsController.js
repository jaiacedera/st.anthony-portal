import {
  createInstructorStudentForUser,
  getInstructorStudentsPayload,
  updateInstructorStudentEnrollment,
} from '../services/instructorStudentsService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function getInstructorStudentsData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username is required.',
    })
    return
  }

  const payload = await getInstructorStudentsPayload(username)
  sendJson(res, 200, payload)
}

export async function postInstructorStudentEnrollment(req, res) {
  try {
    const body = await readJsonBody(req)
    const username = typeof body.username === 'string' ? body.username.trim() : ''

    if (!username) {
      sendJson(res, 400, {
        success: false,
        message: 'Instructor username is required.',
      })
      return
    }

    const payload = await updateInstructorStudentEnrollment({
      username,
      action: typeof body.action === 'string' ? body.action : '',
      studentId: typeof body.studentId === 'string' ? body.studentId : '',
      subjectId: typeof body.subjectId === 'string' ? body.subjectId : '',
    })

    sendJson(res, 200, payload)
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid request body.',
      })
      return
    }

    throw error
  }
}

export async function postInstructorStudent(req, res) {
  try {
    const body = await readJsonBody(req)
    const username = typeof body.username === 'string' ? body.username.trim() : ''

    if (!username) {
      sendJson(res, 400, {
        success: false,
        message: 'Instructor username is required.',
      })
      return
    }

    const payload = await createInstructorStudentForUser({
      username,
      email: typeof body.email === 'string' ? body.email : '',
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds : [],
    })

    sendJson(res, 201, payload)
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid request body.',
      })
      return
    }

    throw error
  }
}
