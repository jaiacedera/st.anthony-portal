import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const authStoreModuleUrl = pathToFileURL(
  path.resolve(currentDir, '../../database/authStore.js'),
)
const authServiceModuleUrl = pathToFileURL(
  path.resolve(currentDir, './authService.js'),
)

function createTempAuthStore() {
  const tempDirectory = mkdtempSync(path.join(os.tmpdir(), 'student-auth-store-'))
  const authAccountsPath = path.join(tempDirectory, 'authAccounts.json')

  writeFileSync(authAccountsPath, '[]')

  return {
    tempDirectory,
    authAccountsPath,
  }
}

async function loadAuthModules(authAccountsPath) {
  process.env.AUTH_ACCOUNTS_PATH = authAccountsPath
  const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const authStore = await import(`${authStoreModuleUrl.href}?case=${cacheBust}`)
  const authService = await import(`${authServiceModuleUrl.href}?case=${cacheBust}`)

  return {
    authStore,
    authService,
  }
}

function createStudentAccountLoader(authStore) {
  return async (email) => authStore.getStudentAccountsByEmail(email)
}

function cleanupTempAuthStore(tempDirectory) {
  delete process.env.AUTH_ACCOUNTS_PATH
  rmSync(tempDirectory, {
    recursive: true,
    force: true,
  })
}

test(
  'student credentials remain valid across repeated login attempts, logout cycles, and service reloads',
  { concurrency: false },
  async (t) => {
    const { tempDirectory, authAccountsPath } = createTempAuthStore()
    t.after(() => cleanupTempAuthStore(tempDirectory))

    let { authStore, authService } = await loadAuthModules(authAccountsPath)
    const email = 'student@example.com'
    const password = 'SACC-B92EEC56'
    const studentId = 'student-123'

    authStore.createStudentAccount({
      email,
      studentId,
      defaultPassword: password,
      createdByInstructorId: 'instructor-1',
    })
    const loadStudentAccountsByEmail = createStudentAccountLoader(authStore)

    const loadStudentById = async (candidateStudentId) => ({
      student_id: candidateStudentId,
      status: 'ACTIVE',
    })

    let result = await authService.authenticateStudentWithResolver(email, password, {
      loadStudentById,
      loadStudentAccountsByEmail,
    })

    assert.equal(result.success, true)
    assert.equal(result.account?.email, email)

    result = await authService.authenticateStudentWithResolver(email, password, {
      loadStudentById,
      loadStudentAccountsByEmail,
    })

    assert.equal(result.success, true)

    ;({ authStore, authService } = await loadAuthModules(authAccountsPath))
    const reloadedAccountLoader = createStudentAccountLoader(authStore)

    result = await authService.authenticateStudentWithResolver(email, password, {
      loadStudentById,
      loadStudentAccountsByEmail: reloadedAccountLoader,
    })

    assert.equal(result.success, true)
    assert.equal(authStore.getAuthAccounts().length, 1)

    const wrongPasswordResult = await authService.authenticateStudentWithResolver(
      email,
      'WrongPassword123!',
      {
        loadStudentById,
        loadStudentAccountsByEmail: reloadedAccountLoader,
      },
    )

    assert.equal(wrongPasswordResult.success, false)
    assert.equal(authStore.getAuthAccounts().length, 1)
  },
)

test(
  'changing the student password invalidates the old password and keeps the new password working',
  { concurrency: false },
  async (t) => {
    const { tempDirectory, authAccountsPath } = createTempAuthStore()
    t.after(() => cleanupTempAuthStore(tempDirectory))

    const { authStore, authService } = await loadAuthModules(authAccountsPath)
    const email = 'student-change@example.com'
    const initialPassword = 'SACC-11112222'
    const nextPassword = 'NewPassword123!'
    const studentId = 'student-456'

    authStore.createStudentAccount({
      email,
      studentId,
      defaultPassword: initialPassword,
      createdByInstructorId: 'instructor-1',
    })

    authStore.setStudentAccountPasswordByStudentId(studentId, nextPassword)
    const loadStudentAccountsByEmail = createStudentAccountLoader(authStore)

    const loadStudentById = async (candidateStudentId) => ({
      student_id: candidateStudentId,
      status: 'ACTIVE',
    })

    const oldPasswordResult = await authService.authenticateStudentWithResolver(
      email,
      initialPassword,
      {
        loadStudentById,
        loadStudentAccountsByEmail,
      },
    )
    const newPasswordResult = await authService.authenticateStudentWithResolver(
      email,
      nextPassword,
      {
        loadStudentById,
        loadStudentAccountsByEmail,
      },
    )

    assert.equal(oldPasswordResult.success, false)
    assert.equal(newPasswordResult.success, true)
  },
)

test(
  'student login no longer deletes the auth account when the linked profile lookup is unavailable',
  { concurrency: false },
  async (t) => {
    const { tempDirectory, authAccountsPath } = createTempAuthStore()
    t.after(() => cleanupTempAuthStore(tempDirectory))

    const { authStore, authService } = await loadAuthModules(authAccountsPath)
    const email = 'student-missing-profile@example.com'
    const password = 'SACC-99887766'
    const studentId = 'student-789'

    authStore.createStudentAccount({
      email,
      studentId,
      defaultPassword: password,
      createdByInstructorId: 'instructor-1',
    })
    const loadStudentAccountsByEmail = createStudentAccountLoader(authStore)

    const firstLogin = await authService.authenticateStudentWithResolver(email, password, {
      loadStudentById: async () => null,
      loadStudentAccountsByEmail,
    })

    assert.equal(firstLogin.success, true)
    assert.equal(authStore.getAuthAccounts().length, 1)

    const secondLogin = await authService.authenticateStudentWithResolver(email, password, {
      loadStudentById: async () => {
        throw new Error('Temporary student lookup outage')
      },
      loadStudentAccountsByEmail,
    })

    assert.equal(secondLogin.success, true)
    assert.equal(authStore.getAuthAccounts().length, 1)
  },
)
