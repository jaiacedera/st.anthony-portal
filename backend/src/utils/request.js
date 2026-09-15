import { env } from '../config/env.js'

const bodies = new WeakMap()

export function readJsonBody(req, maxBytes = env.abuseLimits.maxBodyBytes) {
  if (bodies.has(req)) return bodies.get(req)
  const body = new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const cleanup = () => {
      req.removeListener('data', onData)
      req.removeListener('end', onEnd)
      req.removeListener('error', onError)
      req.removeListener('aborted', onAborted)
    }
    const fail = (message, statusCode) => {
      cleanup()
      req.pause()
      reject(Object.assign(new Error(message), { statusCode }))
    }
    const onData = chunk => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      size += buffer.length
      if (size > maxBytes) { fail('Request body is too large.', 413); return }
      chunks.push(buffer)
    }
    const onEnd = () => {
      cleanup()
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim()
        const value = raw ? JSON.parse(raw) : {}
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body')
        resolve(value)
      } catch {
        reject(Object.assign(new Error('Request body must be a valid JSON object.'), { statusCode: 400 }))
      }
    }
    const onError = () => fail('Unable to read request body.', 400)
    const onAborted = () => fail('Request was interrupted.', 400)
    if (Number(req.headers?.['content-length']) > maxBytes) {
      fail('Request body is too large.', 413)
      return
    }
    req.on('data', onData)
    req.once('end', onEnd)
    req.once('error', onError)
    req.once('aborted', onAborted)
  })
  bodies.set(req, body)
  return body
}
