import { randomBytes, scryptSync } from 'node:crypto'
import * as legacy from './authStore.js'
import { env } from '../src/config/env.js'
import { SHEET_NAMES } from './sheetsSchema.js'
import { getAllRows, updateRowById } from './sheetsService.js'

function useSheets() {
  return Boolean(process.env.VERCEL || env.authStore === 'sheets')
}

export async function findInstructorAccountByUsername(username) {
  if (!useSheets()) return legacy.findInstructorAccountByUsername(username)
  const accounts = await getAllRows(SHEET_NAMES.INSTRUCTOR_AUTH_ACCOUNTS)
  const account = accounts.find(account => account.username === String(username ?? '').trim() && account.status === 'ACTIVE')
  return account ? { ...account, role: 'INSTRUCTOR' } : null
}

export const getInstructorAccountByUsername = findInstructorAccountByUsername

export async function verifyInstructorPassword(username, password) {
  const account = await findInstructorAccountByUsername(username)
  return account ? legacy.verifyAccountPassword(account, password) : false
}

export async function updateInstructorAccountByUsername(username, updates) {
  if (!useSheets()) return legacy.updateInstructorAccountByUsername(username, updates)
  const account = await findInstructorAccountByUsername(username)
  if (!account) return null
  const updated = await updateRowById(SHEET_NAMES.INSTRUCTOR_AUTH_ACCOUNTS, 'account_id', account.account_id, updates)
  return updated ? { ...updated, role: 'INSTRUCTOR' } : null
}

export async function setInstructorAccountPasswordByUsername(username, password) {
  if (typeof password !== 'string' || !password.length) return null
  const salt = randomBytes(16).toString('hex')
  return updateInstructorAccountByUsername(username, {
    password_salt: salt,
    password_hash: scryptSync(password, salt, 64).toString('hex'),
    status: 'ACTIVE',
    updated_at: new Date().toISOString(),
  })
}

export async function touchInstructorAccountLastLogin(username) {
  const now = new Date().toISOString()
  return updateInstructorAccountByUsername(username, { last_login: now, updated_at: now })
}
