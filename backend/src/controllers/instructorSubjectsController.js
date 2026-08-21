import {
  createInstructorSubjectForUser,
  getInstructorSubjectsPayload,
} from '../services/instructorSubjectsService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function getInstructorSubjectsData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username is required.',
    })
    return
  }

  const payload = await getInstructorSubjectsPayload(username)
  sendJson(res, 200, payload)
}

export async function postInstructorSubject(req, res) {
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

    const payload = await createInstructorSubjectForUser({
      username,
      subjectCode: typeof body.subjectCode === 'string' ? body.subjectCode : '',
      subjectName: typeof body.subjectName === 'string' ? body.subjectName : '',
      semester: typeof body.semester === 'string' ? body.semester : '',
      schoolYear: typeof body.schoolYear === 'string' ? body.schoolYear : '',
      schedule: typeof body.schedule === 'string' ? body.schedule : '',
      room: typeof body.room === 'string' ? body.room : '',
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
