import { readFileSync } from 'node:fs'
import { SHEET_NAMES } from '../backend/database/sheetsSchema.js'
import { appendRow, getAllRows } from '../backend/database/sheetsService.js'

// Supply a current export from Render to preserve passwords changed there.
const source = process.argv[2] ?? new URL('../backend/database/authAccounts.json', import.meta.url)
const accounts = JSON.parse(readFileSync(source, 'utf8'))
if (!Array.isArray(accounts)) throw new Error('The account export must be a JSON array.')
for (const [role, sheet] of [
  ['INSTRUCTOR', SHEET_NAMES.INSTRUCTOR_AUTH_ACCOUNTS],
  ['STUDENT', SHEET_NAMES.STUDENT_AUTH_ACCOUNTS],
]) {
  const existing = await getAllRows(sheet)
  let migrated = 0
  for (const account of accounts.filter(account => account.role === role)) {
    if (!account.account_id || !account.username || !account.password_salt || !account.password_hash) {
      throw new Error(`Invalid ${role} account in export; migration stopped.`)
    }
    const matches = existing.some(row => row.account_id === account.account_id ||
      row.username === account.username || (role === 'STUDENT' && (
        (account.student_id && row.student_id === account.student_id) ||
        (account.email && String(row.email).toLowerCase() === String(account.email).toLowerCase())
      )))
    if (matches) continue
    await appendRow(sheet, account)
    existing.push(account)
    migrated++
  }
  console.log(`${sheet}: imported ${migrated} accounts; existing accounts left unchanged.`)
}
