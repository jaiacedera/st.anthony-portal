import { sendJson } from '../utils/http.js'

export function handleServerError(res, error) {
  console.error(error)

  sendJson(res, 500, {
    status: 'error',
    message: 'Internal server error',
  })
}
