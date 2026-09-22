import assert from 'node:assert/strict'
import { randomBytes, scryptSync } from 'node:crypto'
import { mock, test } from 'node:test'

test('Vercel instructor password/profile updates persist through module reloads', async () => {
  const previous = process.env.VERCEL
  process.env.VERCEL = '1'
  const salt = randomBytes(16).toString('hex')
  let row = {
    account_id: 'instructor-test', username: 'instructor', status: 'ACTIVE',
    password_salt: salt, password_hash: scryptSync('old-password', salt, 64).toString('hex'),
  }
  const sheets = mock.module('./sheetsService.js', { namedExports: {
    getAllRows: async sheet => {
      assert.equal(sheet, 'InstructorAuthAccounts')
      return [{ ...row }]
    },
    updateRowById: async (sheet, column, id, updates) => {
      assert.equal(sheet, 'InstructorAuthAccounts')
      assert.equal(column, 'account_id')
      assert.equal(id, row.account_id)
      row = { ...row, ...updates }
      return { ...row }
    },
  } })
  try {
    const store = await import('./instructorAuthStore.js?first')
    assert.equal(await store.verifyInstructorPassword('instructor', 'old-password'), true)
    assert.equal(await store.findInstructorAccountByUsername('missing'), null)
    await store.setInstructorAccountPasswordByUsername('instructor', 'new-password')
    await store.updateInstructorAccountByUsername('instructor', { phone: '12345' })
    await store.touchInstructorAccountLastLogin('instructor')
    const reloaded = await import('./instructorAuthStore.js?reloaded')
    assert.equal(await reloaded.verifyInstructorPassword('instructor', 'old-password'), false)
    assert.equal(await reloaded.verifyInstructorPassword('instructor', 'new-password'), true)
    const account = await reloaded.findInstructorAccountByUsername('instructor')
    assert.equal(account.phone, '12345')
    assert.equal(account.role, 'INSTRUCTOR')
    assert.ok(account.last_login)
    row.status = 'INACTIVE'
    assert.equal(await reloaded.verifyInstructorPassword('instructor', 'new-password'), false)
  } finally {
    sheets.restore()
    if (previous === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previous
  }
})
