import { sendJson } from '../utils/http.js'

export function handleNotFound(res, pathname) {
  sendJson(res, 404, {
    status: 'error',
    message: `No route registered for ${pathname}`,
  })
}
