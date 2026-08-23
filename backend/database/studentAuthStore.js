import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import {
  createHash,
  deleteAccountByAccountId as deleteLegacyAccountByAccountId,
  deleteStudentAccountByStudentId as deleteLegacyStudentAccountByStudentId,
  getAuthAccounts as getLegacyAuthAccounts,
  getStudentAccountByStudentId as getLegacyStudentAccountByStudentId,
  getStudentAccountsByEmail as getLegacyStudentAccountsByEmail,
} from './authStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from './sheetsSchema.js'
import {
  appendRow,
  deleteRowById,
  getAllRows,
  updateRowById,
} from './sheetsService.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeStudentId(value) {
  return String(value ?? '').trim()
}

function compareIsoDatesDescending(leftValue, rightValue) {
  const leftTime = Date.parse(String(leftValue ?? '').trim() || '1970-01-01T00:00:00.000Z')
  const rightTime = Date.parse(String(rightValue ?? '').trim() || '1970-01-01T00:00:00.000Z')

  return rightTime - leftTime
}

function sortAccountsByUpdatedAt(accounts) {
  return [...accounts].sort((left, right) =>
    compareIsoDatesDescending(
      left.updated_at ?? left.created_at,
      right.updated_at ?? right.created_at,
    ),
  )
}

function hashPassword(password, passwordSalt) {
  return scryptSync(password, passwordSalt, 64).toString('hex')
}

function hashResetToken(token) {
  return createHash('sha256').update(String(token ?? '')).digest('hex')
}

function toStudentAccountRecord(account) {
  if (!account) {
    return null
  }

  return {
    ...account,
    role: 'STUDENT',
    status: String(account.status ?? 'ACTIVE').trim() || 'ACTIVE',
    email: normalizeEmail(account.email ?? account.username),
    username: normalizeEmail(account.username ?? account.email),
    student_id: normalizeStudentId(account.student_id),
    password_reset_token_hash: String(account.password_reset_token_hash ?? '').trim(),
    password_reset_expires_at: String(account.password_reset_expires_at ?? '').trim(),
    password_reset_requested_at: String(account.password_reset_requested_at ?? '').trim(),
  }
}

async function getStoredStudentAccounts() {
  return (await getAllRows(SHEET_NAMES.STUDENT_AUTH_ACCOUNTS))
    .map((account) => toStudentAccountRecord(account))
    .filter(Boolean)
}

function getLegacyStudentAccounts() {
  return getLegacyAuthAccounts()
    .filter((account) => String(account.role ?? '').trim().toUpperCase() === 'STUDENT')
    .map((account) => toStudentAccountRecord(account))
    .filter(Boolean)
}

function mergeStudentAccounts(primaryAccounts, secondaryAccounts) {
  const mergedAccounts = [...primaryAccounts]
  const seenKeys = new Set(
    primaryAccounts.flatMap((account) => [
      String(account.account_id ?? '').trim(),
      normalizeEmail(account.email ?? account.username),
      normalizeStudentId(account.student_id),
    ]),
  )

  for (const account of secondaryAccounts) {
    const accountId = String(account.account_id ?? '').trim()
    const email = normalizeEmail(account.email ?? account.username)
    const studentId = normalizeStudentId(account.student_id)

    if ((accountId && seenKeys.has(accountId)) || (email && seenKeys.has(email)) || (studentId && seenKeys.has(studentId))) {
      continue
    }

    mergedAccounts.push(account)

    if (accountId) {
      seenKeys.add(accountId)
    }

    if (email) {
      seenKeys.add(email)
    }

    if (studentId) {
      seenKeys.add(studentId)
    }
  }

  return sortAccountsByUpdatedAt(mergedAccounts)
}

export function verifyAccountPassword(account, password) {
  const passwordSalt = String(account?.password_salt ?? '').trim()
  const passwordHash = String(account?.password_hash ?? '').trim()

  if (!passwordSalt || !passwordHash || typeof password !== 'string' || !password.length) {
    return false
  }

  const candidateHash = Buffer.from(hashPassword(password, passwordSalt), 'hex')
  const storedHash = Buffer.from(passwordHash, 'hex')

  if (candidateHash.length !== storedHash.length) {
    return false
  }

  return timingSafeEqual(candidateHash, storedHash)
}

export async function getAllStudentAccounts() {
  return mergeStudentAccounts(await getStoredStudentAccounts(), getLegacyStudentAccounts())
}

export async function getStudentAccountsByEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return []
  }

  const storedAccounts = (await getStoredStudentAccounts()).filter(
    (account) => normalizeEmail(account.email ?? account.username) === normalizedEmail,
  )

  if (storedAccounts.length > 0) {
    return sortAccountsByUpdatedAt(storedAccounts)
  }

  return getLegacyStudentAccountsByEmail(normalizedEmail)
    .map((account) => toStudentAccountRecord(account))
    .filter(Boolean)
}

export async function findStudentAccountByEmail(email) {
  return (await getStudentAccountsByEmail(email))[0] ?? null
}

export async function getStudentAccountByStudentId(studentId) {
  const normalizedStudentId = normalizeStudentId(studentId)

  if (!normalizedStudentId) {
    return null
  }

  const storedAccount =
    (await getStoredStudentAccounts()).find(
      (account) => normalizeStudentId(account.student_id) === normalizedStudentId,
    ) ?? null

  if (storedAccount) {
    return storedAccount
  }

  const legacyAccount = getLegacyStudentAccountByStudentId(normalizedStudentId)

  if (!legacyAccount) {
    return null
  }

  return toStudentAccountRecord(legacyAccount)
}

export async function upsertStudentAccount({
  email,
  studentId,
  defaultPassword,
  createdByInstructorId = '',
}) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedStudentId = normalizeStudentId(studentId)

  if (!normalizedEmail) {
    throw new Error('Student email is required.')
  }

  if (!normalizedStudentId) {
    throw new Error('Student id is required.')
  }

  if (typeof defaultPassword !== 'string' || !defaultPassword.length) {
    throw new Error('Student password is required.')
  }

  const storedAccounts = await getStoredStudentAccounts()
  const existingAccount =
    storedAccounts.find(
      (account) =>
        normalizeEmail(account.email ?? account.username) === normalizedEmail ||
        normalizeStudentId(account.student_id) === normalizedStudentId,
    ) ?? null
  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(defaultPassword, passwordSalt)
  const timestamp = new Date().toISOString()
  const nextAccount = {
    account_id:
      String(existingAccount?.account_id ?? '').trim() || randomBytes(16).toString('hex'),
    role: 'STUDENT',
    email: normalizedEmail,
    username: normalizedEmail,
    student_id: normalizedStudentId,
    created_by_instructor_id: String(
      createdByInstructorId || existingAccount?.created_by_instructor_id || '',
    ).trim(),
    password_salt: passwordSalt,
    password_hash: passwordHash,
    status: 'ACTIVE',
    created_at: String(existingAccount?.created_at ?? '').trim() || timestamp,
    updated_at: timestamp,
    password_reset_token_hash: '',
    password_reset_expires_at: '',
    password_reset_requested_at: '',
  }

  if (existingAccount?.account_id) {
    await updateRowById(
      SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
      SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
      existingAccount.account_id,
      nextAccount,
    )

    return nextAccount
  }

  await appendRow(SHEET_NAMES.STUDENT_AUTH_ACCOUNTS, nextAccount)
  return nextAccount
}

export async function setStudentAccountPasswordByStudentId(studentId, password) {
  const account = await getStudentAccountByStudentId(studentId)

  if (!account) {
    return null
  }

  const passwordSalt = randomBytes(16).toString('hex')
  const nextAccount = {
    ...account,
    role: 'STUDENT',
    password_salt: passwordSalt,
    password_hash: hashPassword(password, passwordSalt),
    status: 'ACTIVE',
    updated_at: new Date().toISOString(),
    password_reset_token_hash: '',
    password_reset_expires_at: '',
    password_reset_requested_at: '',
  }

  await updateRowById(
    SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
    account.account_id,
    nextAccount,
  )

  return nextAccount
}

export async function setStudentPasswordResetTokenByEmail(email, token, expiresAt) {
  const account = await findStudentAccountByEmail(email)

  if (!account?.account_id) {
    return null
  }

  const nextAccount = {
    ...account,
    password_reset_token_hash: hashResetToken(token),
    password_reset_expires_at: String(expiresAt ?? '').trim(),
    password_reset_requested_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await updateRowById(
    SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
    account.account_id,
    nextAccount,
  )

  return nextAccount
}

export async function setStudentAccountPasswordByResetToken(token, password) {
  const normalizedTokenHash = hashResetToken(token)
  const accounts = await getAllStudentAccounts()
  const now = Date.now()
  const account =
    accounts.find((candidate) => {
      const expiresAt = Date.parse(String(candidate.password_reset_expires_at ?? '').trim())

      return (
        String(candidate.password_reset_token_hash ?? '').trim() === normalizedTokenHash &&
        Number.isFinite(expiresAt) &&
        expiresAt > now
      )
    }) ?? null

  if (!account?.account_id) {
    return null
  }

  const passwordSalt = randomBytes(16).toString('hex')
  const nextAccount = {
    ...account,
    role: 'STUDENT',
    password_salt: passwordSalt,
    password_hash: hashPassword(password, passwordSalt),
    status: 'ACTIVE',
    updated_at: new Date().toISOString(),
    password_reset_token_hash: '',
    password_reset_expires_at: '',
    password_reset_requested_at: '',
  }

  await updateRowById(
    SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
    account.account_id,
    nextAccount,
  )

  return nextAccount
}

export async function deleteStudentAccountByStudentId(studentId) {
  const normalizedStudentId = normalizeStudentId(studentId)

  if (!normalizedStudentId) {
    return false
  }

  const storedAccount =
    (await getStoredStudentAccounts()).find(
      (account) => normalizeStudentId(account.student_id) === normalizedStudentId,
    ) ?? null

  const removedStoredAccount = storedAccount
    ? await deleteRowById(
        SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
        SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
        storedAccount.account_id,
      )
    : false

  const removedLegacyAccount = deleteLegacyStudentAccountByStudentId(normalizedStudentId)

  return Boolean(removedStoredAccount || removedLegacyAccount)
}

export async function deleteAccountByAccountId(accountId) {
  const normalizedAccountId = String(accountId ?? '').trim()

  if (!normalizedAccountId) {
    return false
  }

  const removedStoredAccount = await deleteRowById(
    SHEET_NAMES.STUDENT_AUTH_ACCOUNTS,
    SHEET_ID_COLUMNS[SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
    normalizedAccountId,
  )
  const removedLegacyAccount = deleteLegacyAccountByAccountId(normalizedAccountId)

  return Boolean(removedStoredAccount || removedLegacyAccount)
}
