import { timingSafeEqual, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const authAccountsPath = path.join(currentDir, 'authAccounts.json')

export function getAuthAccounts() {
  return JSON.parse(readFileSync(authAccountsPath, 'utf8'))
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

export function verifyInstructorPassword(username, password) {
  const account = findInstructorAccountByUsername(username)

  if (!account) {
    return false
  }

  const candidateHash = scryptSync(password, account.password_salt, 64)
  const storedHash = Buffer.from(account.password_hash, 'hex')

  if (candidateHash.length !== storedHash.length) {
    return false
  }

  return timingSafeEqual(candidateHash, storedHash)
}
