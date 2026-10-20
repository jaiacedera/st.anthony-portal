import { createHash, randomBytes } from 'node:crypto'
import { appendRow, getRowById } from '../../database/sheetsService.js'
import { SHEET_NAMES } from '../../database/sheetsSchema.js'
import { readJsonBody } from '../utils/request.js'

const hash = token => createHash('sha256').update(token).digest('hex')

export async function issueSession(account, role) {
  const token = randomBytes(32).toString('hex')
  await appendRow(SHEET_NAMES.AUTH_SESSIONS, {
    token_hash: hash(token), role, username: account.username,
    student_id: account.studentId || '', email: account.email || '',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
  return token
}

// Keep the existing controllers, but bind every identity argument to a verified session.
export async function authenticateRequest(req, pathname) {
  const role = pathname.startsWith('/api/instructor/') || pathname.startsWith('/api/database/')
    ? 'INSTRUCTOR'
    : pathname.startsWith('/api/student/') || pathname === '/api/auth/student/change-password'
      ? 'STUDENT' : null
  if (!role) return
  const token = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{64})$/)?.[1]
  const session = token ? await getRowById(SHEET_NAMES.AUTH_SESSIONS, 'token_hash', hash(token)) : null
  if (!session || session.role !== role || !(Date.parse(session.expires_at) > Date.now())) {
    throw Object.assign(new Error('Please sign in again. Your session is missing or expired.'), { statusCode: 401 })
  }
  const identity = role === 'INSTRUCTOR'
    ? { username: session.username }
    : { studentId: session.student_id, email: session.email }
  const url = new URL(req.url, 'http://localhost')
  const body = req.method === 'POST' ? await readJsonBody(req) : null
  for (const [key, value] of Object.entries(identity)) {
    const supplied = body?.[key] ?? url.searchParams.get(key)
    if (supplied && supplied !== value) {
      throw Object.assign(new Error('You cannot access another account.'), { statusCode: 403 })
    }
    url.searchParams.set(key, value)
    if (body) body[key] = value
  }
  req.url = `${url.pathname}${url.search}`
  req.auth = { ...session, ...identity }
}
