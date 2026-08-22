import { randomBytes, timingSafeEqual, scryptSync } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const authAccountsPath = path.join(currentDir, 'authAccounts.json')

export function getAuthAccounts() {
  return JSON.parse(readFileSync(authAccountsPath, 'utf8'))
}

function saveAuthAccounts(accounts) {
  writeFileSync(authAccountsPath, JSON.stringify(accounts, null, 2))
}

export function findInstructorAccountByUsername(username) {
  return (
    getAuthAccounts().find(
      (account) =>
        account.role === 'INSTRUCTOR' &&
        account.status === 'ACTIVE' &&
        account.username === username,
    ) ?? null
  )
}

export function getInstructorAccountByUsername(username) {
  return findInstructorAccountByUsername(username)
}

function compareIsoDatesDescending(leftValue, rightValue) {
  const leftTime = Date.parse(String(leftValue ?? '').trim() || '1970-01-01T00:00:00.000Z')
  const rightTime = Date.parse(String(rightValue ?? '').trim() || '1970-01-01T00:00:00.000Z')

  return rightTime - leftTime
}

export function getStudentAccountsByEmail(email) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    return []
  }

  return getAuthAccounts()
    .filter(
      (account) =>
        account.role === 'STUDENT' &&
        account.status === 'ACTIVE' &&
        String(account.email ?? account.username ?? '').trim().toLowerCase() === normalizedEmail,
    )
    .sort((left, right) =>
      compareIsoDatesDescending(
        left.updated_at ?? left.created_at,
        right.updated_at ?? right.created_at,
      ),
    )
}

export function findStudentAccountByEmail(email) {
  return getStudentAccountsByEmail(email)[0] ?? null
}

export function verifyInstructorPassword(username, password) {
  const account = findInstructorAccountByUsername(username)

  if (!account) {
    return false
  }

  return verifyAccountPassword(account, password)
}

export function verifyStudentPassword(email, password) {
  const account = findStudentAccountByEmail(email)

  if (!account) {
    return false
  }

  return verifyAccountPassword(account, password)
}

export function verifyAccountPassword(account, password) {
  const candidateHash = scryptSync(password, account.password_salt, 64)
  const storedHash = Buffer.from(account.password_hash, 'hex')

  if (candidateHash.length !== storedHash.length) {
    return false
  }

  return timingSafeEqual(candidateHash, storedHash)
}

export function createStudentAccount({
  email,
  studentId,
  defaultPassword,
  createdByInstructorId = '',
}) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Student email is required.')
  }

  if (findStudentAccountByEmail(normalizedEmail)) {
    throw new Error('A student auth account with this email already exists.')
  }

  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(defaultPassword, passwordSalt, 64).toString('hex')
  const accounts = getAuthAccounts()
  const timestamp = new Date().toISOString()

  accounts.push({
    account_id: randomBytes(16).toString('hex'),
    role: 'STUDENT',
    username: normalizedEmail,
    email: normalizedEmail,
    student_id: studentId,
    created_by_instructor_id: createdByInstructorId,
    password_salt: passwordSalt,
    password_hash: passwordHash,
    status: 'ACTIVE',
    created_at: timestamp,
    updated_at: timestamp,
  })

  saveAuthAccounts(accounts)

  return {
    username: normalizedEmail,
    email: normalizedEmail,
  }
}

export function setStudentAccountPasswordByStudentId(studentId, password) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (!normalizedStudentId) {
    return null
  }

  const accounts = getAuthAccounts()
  const accountIndex = accounts.findIndex(
    (account) =>
      account.role === 'STUDENT' &&
      String(account.student_id ?? '').trim() === normalizedStudentId,
  )

  if (accountIndex < 0) {
    return null
  }

  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(password, passwordSalt, 64).toString('hex')
  const nextAccount = {
    ...accounts[accountIndex],
    password_salt: passwordSalt,
    password_hash: passwordHash,
    status: 'ACTIVE',
    updated_at: new Date().toISOString(),
  }

  accounts[accountIndex] = nextAccount
  saveAuthAccounts(accounts)

  return nextAccount
}

export function getStudentAccountByStudentId(studentId) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (!normalizedStudentId) {
    return null
  }

  return (
    getAuthAccounts().find(
      (account) =>
        account.role === 'STUDENT' &&
        String(account.student_id ?? '').trim() === normalizedStudentId,
    ) ?? null
  )
}

export function updateStudentAccountByStudentId(studentId, updates) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (!normalizedStudentId) {
    return null
  }

  const accounts = getAuthAccounts()
  const accountIndex = accounts.findIndex(
    (account) =>
      account.role === 'STUDENT' &&
      String(account.student_id ?? '').trim() === normalizedStudentId,
  )

  if (accountIndex < 0) {
    return null
  }

  const nextAccount = {
    ...accounts[accountIndex],
    ...updates,
  }

  accounts[accountIndex] = nextAccount
  saveAuthAccounts(accounts)

  return nextAccount
}

export function deleteStudentAccountByStudentId(studentId) {
  const normalizedStudentId = String(studentId ?? '').trim()

  if (!normalizedStudentId) {
    return false
  }

  const accounts = getAuthAccounts()
  const nextAccounts = accounts.filter(
    (account) =>
      !(
        account.role === 'STUDENT' &&
        String(account.student_id ?? '').trim() === normalizedStudentId
      ),
  )

  if (nextAccounts.length === accounts.length) {
    return false
  }

  saveAuthAccounts(nextAccounts)
  return true
}

export function deleteAccountByAccountId(accountId) {
  const normalizedAccountId = String(accountId ?? '').trim()

  if (!normalizedAccountId) {
    return false
  }

  const accounts = getAuthAccounts()
  const nextAccounts = accounts.filter(
    (account) => String(account.account_id ?? '').trim() !== normalizedAccountId,
  )

  if (nextAccounts.length === accounts.length) {
    return false
  }

  saveAuthAccounts(nextAccounts)
  return true
}
