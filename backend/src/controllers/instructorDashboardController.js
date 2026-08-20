import { getInstructorDashboard } from '../services/instructorDashboardService.js'
import { sendJson } from '../utils/http.js'

export async function getInstructorDashboardData(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const username = requestUrl.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    sendJson(res, 400, {
      success: false,
      message: 'Instructor username is required.',
    })
    return
  }

  const payload = await getInstructorDashboard(username)
  sendJson(res, 200, payload)
}
