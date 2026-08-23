import {
  changeInstructorPassword,
  getInstructorProfile,
  updateInstructorProfile,
} from '../services/instructorProfileService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function getInstructorProfileData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username is required.',
    })
    return
  }

  const payload = await getInstructorProfile(username)
  sendJson(res, 200, payload)
}

export async function postInstructorProfile(req, res) {
  try {
    const body = await readJsonBody(req)
    const payload = await updateInstructorProfile({
      username: typeof body.username === 'string' ? body.username : '',
      fullName: typeof body.fullName === 'string' ? body.fullName : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      dateOfBirth: typeof body.dateOfBirth === 'string' ? body.dateOfBirth : '',
      gender: typeof body.gender === 'string' ? body.gender : '',
      address: typeof body.address === 'string' ? body.address : '',
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

export async function postInstructorPasswordChange(req, res) {
  try {
    const body = await readJsonBody(req)
    const payload = await changeInstructorPassword({
      username: typeof body.username === 'string' ? body.username : '',
      currentPassword: typeof body.currentPassword === 'string' ? body.currentPassword : '',
      newPassword: typeof body.newPassword === 'string' ? body.newPassword : '',
      confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : '',
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
