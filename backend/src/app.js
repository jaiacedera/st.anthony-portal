import { createServer } from 'node:http'
import { URL } from 'node:url'
import { handleServerError } from './middleware/errorHandler.js'
import { applyCors } from './middleware/cors.js'
import { handleNotFound } from './middleware/notFound.js'
import { findRoute } from './routes/systemRoutes.js'

export function createApp() {
  return createServer((req, res) => {
    applyCors(res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    const routeHandler = findRoute(req.method ?? 'GET', requestUrl.pathname)

    if (!routeHandler) {
      handleNotFound(res, requestUrl.pathname)
      return
    }

    Promise.resolve(routeHandler(req, res)).catch((error) => {
      handleServerError(res, error)
    })
  })
}
