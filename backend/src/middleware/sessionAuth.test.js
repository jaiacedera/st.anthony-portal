import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { readJsonBody } from '../utils/request.js'

test('protected endpoints require a valid session and reject identity and role spoofing', async () => {
  const sessions = []
  const sheets = mock.module('../../database/sheetsService.js', { namedExports: {
    appendRow: async (sheet, row) => { assert.equal(sheet, 'AuthSessions'); sessions.push(row) },
    getRowById: async (sheet, key, value) => { assert.equal(sheet, 'AuthSessions'); return sessions.find(row => row[key] === value) },
  } })
  try {
    const { issueSession, authenticateRequest } = await import('./sessionAuth.js')
    const instructor = await issueSession({ username: 'professor' }, 'INSTRUCTOR')
    const student = await issueSession({ username: 'student', studentId: 'student-id', email: 'student@school.test' }, 'STUDENT')
    assert.notEqual(sessions[0].token_hash, instructor)
    const request = (url, token, body) => ({ url, headers: token ? { authorization: `Bearer ${token}` } : {}, method: body ? 'POST' : 'GET', ...(body ? { body } : {}) })
    for (const path of ['/api/instructor/subjects', '/api/student/dashboard', '/api/database/google-sheets/init', '/api/auth/student/change-password']) {
      await assert.rejects(authenticateRequest(request(path), path), { statusCode: 401 })
    }
    const path = '/api/instructor/grades/independent'
    await assert.rejects(authenticateRequest(request(path, student), path), { statusCode: 401 })
    await assert.rejects(authenticateRequest(request(`${path}?username=someone-else`, instructor), path), { statusCode: 403 })
    await assert.rejects(authenticateRequest(request(path, instructor, { username: 'someone-else' }), path), { statusCode: 403 })
    const valid = request(path, instructor, { subjectId: 'class' })
    await authenticateRequest(valid, path)
    assert.equal((await readJsonBody(valid)).username, 'professor')
    assert.equal(valid.auth.username, 'professor')
    const studentPath = '/api/student/dashboard'
    await assert.rejects(authenticateRequest(request(`${studentPath}?studentId=other-student`, student), studentPath), { statusCode: 403 })
    const studentRead = request(studentPath, student)
    await authenticateRequest(studentRead, studentPath)
    assert.equal(new URL(studentRead.url, 'http://localhost').searchParams.get('studentId'), 'student-id')
    sessions[0].expires_at = '2000-01-01T00:00:00.000Z'
    await assert.rejects(authenticateRequest(request(path, instructor), path), { statusCode: 401 })
    await authenticateRequest(request('/api/auth/student/login'), '/api/auth/student/login')
  } finally { sheets.restore() }
})
