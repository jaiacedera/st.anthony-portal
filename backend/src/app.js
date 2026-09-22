import { createServer } from 'node:http'
import { URL } from 'node:url'
import { handleServerError } from './middleware/errorHandler.js'
import { applyCors } from './middleware/cors.js'
import { handleNotFound } from './middleware/notFound.js'
import { findRoute } from './routes/systemRoutes.js'
import { env } from './config/env.js'
import { createAbuseProtection } from './middleware/abuseProtection.js'
import { readJsonBody } from './utils/request.js'
import { sendJson } from './utils/http.js'

export function createRequestHandler({ limits = env.abuseLimits, routeResolver = findRoute } = {}) {
  const protection = createAbuseProtection(limits)
  return (req, res) => {
    applyCors(res)
    return Promise.resolve().then(async () => {
      const requestUrl = new URL(req.url ?? '/', 'http://localhost')
      if (!protection.beforeRequest(req, res, requestUrl.pathname)) return
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }
      const routeHandler = routeResolver(req.method ?? 'GET', requestUrl.pathname)
      if (!routeHandler) {
        handleNotFound(res, requestUrl.pathname)
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req, limits.maxBodyBytes)
        if (!protection.beforeBodyAction(req, res, requestUrl.pathname, body)) return
      }
      await routeHandler(req, res)
    }).catch(error => {
      if (res.destroyed || res.writableEnded) return
      if ([400, 413].includes(error?.statusCode)) {
        res.setHeader('Connection', 'close')
        sendJson(res, error.statusCode, { success: false, message: error.message })
      } else {
        handleServerError(res, error)
      }
    })
  }
}

export function createApp(options) {
  return createServer({ requestTimeout: 15000, headersTimeout: 10000, connectionsCheckingInterval: 1000, maxHeaderSize: 16384 }, createRequestHandler(options))
}
