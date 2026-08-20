import {
  getGoogleSheetsDatabaseStatus,
  initializeGoogleSheets,
} from '../services/databaseService.js'
import { sendJson } from '../utils/http.js'

export async function getDatabaseStatus(_req, res) {
  const payload = await getGoogleSheetsDatabaseStatus()
  const statusCode = payload.success ? 200 : 503

  sendJson(res, statusCode, payload)
}

export async function postDatabaseInitialization(_req, res) {
  const payload = await initializeGoogleSheets()

  sendJson(res, 200, payload)
}
