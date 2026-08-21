import { sendJson } from '../utils/http.js'

export function handleServerError(res, error) {
  console.error(error)

  const statusCode =
    typeof error?.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500
  const message =
    statusCode === 500
      ? 'Internal server error'
      : error?.message || 'Request failed'

  sendJson(res, statusCode, {
    status: 'error',
    message,
  })
}
