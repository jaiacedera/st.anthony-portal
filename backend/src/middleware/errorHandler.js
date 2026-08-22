import { sendJson } from '../utils/http.js'

function getPublicErrorMessage(error, statusCode) {
  if (typeof error?.publicMessage === 'string' && error.publicMessage.trim()) {
    return error.publicMessage.trim()
  }

  if (error?.expose && typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  if (statusCode !== 500 && typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return 'Internal server error'
}

export function handleServerError(res, error) {
  console.error(error)

  const statusCode =
    typeof error?.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500
  const message = getPublicErrorMessage(error, statusCode)

  sendJson(res, statusCode, {
    status: 'error',
    message,
  })
}
