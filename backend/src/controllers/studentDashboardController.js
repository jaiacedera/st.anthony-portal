import { getStudentDashboard } from '../services/studentDashboardService.js'
import { sendJson } from '../utils/http.js'

export async function getStudentDashboardData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const studentId = requestUrl.searchParams.get('studentId')?.trim() ?? ''
  const email = requestUrl.searchParams.get('email')?.trim() ?? ''

  if (!studentId && !email) {
    sendJson(res, 400, {
      success: false,
      message: 'Student identity is required.',
    })
    return
  }

  const payload = await getStudentDashboard({ studentId, email })
  sendJson(res, 200, payload)
}
