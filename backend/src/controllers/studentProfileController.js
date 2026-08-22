import {
  updateStudentProfile,
} from '../services/studentDashboardService.js'
import { sendJson } from '../utils/http.js'
import { readJsonBody } from '../utils/request.js'

export async function postStudentProfile(req, res) {
  try {
    const body = await readJsonBody(req)
    const payload = await updateStudentProfile({
      studentId: typeof body.studentId === 'string' ? body.studentId : '',
      email: typeof body.email === 'string' ? body.email : '',
      studentNumber: typeof body.studentNumber === 'string' ? body.studentNumber : '',
      firstName: typeof body.firstName === 'string' ? body.firstName : '',
      middleName: typeof body.middleName === 'string' ? body.middleName : '',
      lastName: typeof body.lastName === 'string' ? body.lastName : '',
      yearLevel: typeof body.yearLevel === 'string' ? body.yearLevel : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      address: typeof body.address === 'string' ? body.address : '',
      dateOfBirth: typeof body.dateOfBirth === 'string' ? body.dateOfBirth : '',
      gender: typeof body.gender === 'string' ? body.gender : '',
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
