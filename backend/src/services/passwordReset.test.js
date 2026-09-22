import assert from 'node:assert/strict'
import { createHash, scryptSync } from 'node:crypto'
import { mock, test } from 'node:test'

test('student reset request, email link, password change, and failure cases', async () => {
  process.env.VERCEL = '1'
  process.env.FRONTEND_ORIGIN = 'https://portal.example.test/'
  let account = {
    account_id: 'test-account', email: 'student@example.test', username: 'student@example.test',
    student_id: 'test-student', status: 'ACTIVE', password_salt: 'test-salt',
    password_hash: scryptSync('old-password', 'test-salt', 64).toString('hex'),
  }
  const sent = []
  let writeFails = false
  let emailFails = false
  const sheets = mock.module('../../database/sheetsService.js', { namedExports: {
    getAllRows: async () => [{ ...account }],
    getRowById: async () => null,
    updateRowById: async (_sheet, _column, id, updates) => {
      if (writeFails) return null
      assert.equal(id, account.account_id)
      account = { ...account, ...updates }
      return { ...account }
    },
    appendRow: async () => { throw new Error('Unexpected account creation') },
    deleteRowById: async () => { throw new Error('Unexpected account deletion') },
  } })
  const email = mock.module('./emailService.js', { namedExports: {
    sendStudentPasswordResetEmail: async message => {
      if (emailFails) return { sent: false, reason: 'Email unavailable' }
      sent.push(message)
      return { sent: true }
    },
  } })
  try {
    const { requestStudentPasswordReset, resetStudentPassword, changeStudentPassword, authenticateStudentWithResolver } = await import('./authService.js')
    const { verifyAccountPassword } = await import('../../database/studentAuthStore.js')
    assert.equal((await requestStudentPasswordReset('invalid')).success, false)
    const unknown = await requestStudentPasswordReset('missing@example.test')
    assert.equal(sent.length, 0)
    const result = await requestStudentPasswordReset(' STUDENT@example.test ')
    assert.deepEqual(result, unknown)
    assert.equal(sent[0].recipientEmail, 'student@example.test')
    const url = new URL(sent[0].resetUrl)
    assert.equal(url.origin, 'https://portal.example.test')
    assert.equal(url.pathname, '/student/reset-password')
    const firstToken = url.searchParams.get('token')
    assert.equal(account.password_reset_token_hash, createHash('sha256').update(firstToken).digest('hex'))
    assert.ok(Date.parse(account.password_reset_expires_at) > Date.now())
    assert.equal((await resetStudentPassword(firstToken, 'short', 'short')).success, false)
    assert.equal((await resetStudentPassword(firstToken, 'new-password', 'different-password')).success, false)
    await requestStudentPasswordReset('student@example.test')
    assert.equal((await resetStudentPassword(firstToken, 'new-password', 'new-password')).success, false)
    const token = new URL(sent.at(-1).resetUrl).searchParams.get('token')
    assert.equal((await resetStudentPassword(token, 'new-password', 'new-password')).success, true)
    assert.equal(verifyAccountPassword(account, 'new-password'), true)
    assert.equal(verifyAccountPassword(account, 'old-password'), false)
    assert.equal(account.password_reset_token_hash, '')
    assert.equal((await resetStudentPassword(token, 'another-password', 'another-password')).success, false)
    await requestStudentPasswordReset('student@example.test')
    const expiredToken = new URL(sent.at(-1).resetUrl).searchParams.get('token')
    account.password_reset_expires_at = new Date(Date.now() - 1000).toISOString()
    assert.equal((await resetStudentPassword(expiredToken, 'new-password', 'new-password')).success, false)
    account.password_reset_expires_at = new Date(Date.now() + 60000).toISOString()
    account.status = 'INACTIVE'
    assert.equal((await resetStudentPassword(expiredToken, 'new-password', 'new-password')).success, false)
    const count = sent.length
    assert.deepEqual(await requestStudentPasswordReset('student@example.test'), unknown)
    assert.equal(sent.length, count)
    account.status = 'ACTIVE'
    writeFails = true
    await assert.rejects(requestStudentPasswordReset('student@example.test'), /Unable to prepare/)
    assert.equal(sent.length, count)
    assert.equal((await resetStudentPassword(expiredToken, 'new-password', 'new-password')).success, false)
    writeFails = false
    emailFails = true
    assert.equal((await requestStudentPasswordReset('student@example.test')).success, false)

    const change = {
      email: 'student@example.test', studentId: 'test-student', currentPassword: 'new-password',
      newPassword: 'profile-password', confirmPassword: 'profile-password',
    }
    const before = { ...account }
    for (const invalid of [
      { currentPassword: 'wrong-password' }, { studentId: 'another-student' },
      { email: 'another@example.test' }, { currentPassword: '' },
      { newPassword: 'short', confirmPassword: 'short' }, { confirmPassword: 'mismatch' },
      { newPassword: 'new-password', confirmPassword: 'new-password' },
    ]) {
      assert.equal((await changeStudentPassword({ ...change, ...invalid })).success, false)
      assert.deepEqual(account, before)
    }
    account.status = 'INACTIVE'
    assert.equal((await changeStudentPassword(change)).success, false)
    account.status = 'ACTIVE'
    writeFails = true
    assert.equal((await changeStudentPassword(change)).success, false)
    writeFails = false
    const emailsBeforeChange = sent.length
    assert.equal((await changeStudentPassword(change)).success, true)
    assert.equal(sent.length, emailsBeforeChange)
    assert.equal(account.password_reset_token_hash, '')
    assert.equal(account.password_reset_expires_at, '')
    assert.equal(verifyAccountPassword(account, 'profile-password'), true)
    assert.equal(verifyAccountPassword(account, 'new-password'), false)
    assert.notEqual(account.password_salt, before.password_salt)
    const reloaded = await import('../../database/studentAuthStore.js?profile-change')
    const persisted = await reloaded.getStudentAccountByStudentId(change.studentId)
    assert.equal(reloaded.verifyAccountPassword(persisted, 'profile-password'), true)
    const resolver = { loadStudentAccountsByEmail: reloaded.getStudentAccountsByEmail, loadStudentById: async () => ({ status: 'ACTIVE' }) }
    assert.equal((await authenticateStudentWithResolver(change.email, 'profile-password', resolver)).success, true)
    assert.equal((await authenticateStudentWithResolver(change.email, 'new-password', resolver)).success, false)
  } finally {
    sheets.restore()
    email.restore()
    delete process.env.VERCEL
    delete process.env.FRONTEND_ORIGIN
  }
})
