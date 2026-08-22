import { google } from 'googleapis'
import { env } from '../src/config/env.js'

const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
]

function createConfigError(message) {
  const error = new Error(message)
  error.statusCode = 503
  error.expose = true
  return error
}

function normalizePrivateKey(value) {
  const normalized = String(value ?? '').trim()
  const unwrapped =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
      ? normalized.slice(1, -1)
      : normalized

  return unwrapped
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
}

export function getGoogleSheetsConfigErrors() {
  return [
    ['GOOGLE_PROJECT_ID', env.googleProjectId],
    ['GOOGLE_CLIENT_EMAIL', env.googleClientEmail],
    ['GOOGLE_PRIVATE_KEY', env.googlePrivateKey],
    ['GOOGLE_SHEET_ID', env.googleSheetId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => `${key} is not configured`)
}

export function isGoogleSheetsConfigured() {
  return getGoogleSheetsConfigErrors().length === 0
}

export function getSpreadsheetId() {
  if (!env.googleSheetId) {
    throw createConfigError('GOOGLE_SHEET_ID is not configured')
  }

  return env.googleSheetId
}

export function createGoogleAuth() {
  if (!isGoogleSheetsConfigured()) {
    throw createConfigError(getGoogleSheetsConfigErrors().join('; '))
  }

  const privateKey = normalizePrivateKey(env.googlePrivateKey)

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw createConfigError(
      'GOOGLE_PRIVATE_KEY is invalid. Paste the full private_key value from the Google service account JSON.',
    )
  }

  return new google.auth.GoogleAuth({
    credentials: {
      project_id: env.googleProjectId,
      client_email: env.googleClientEmail,
      private_key: privateKey,
    },
    scopes: GOOGLE_SHEETS_SCOPES,
  })
}

export function createSheetsClient() {
  return google.sheets({
    version: 'v4',
    auth: createGoogleAuth(),
  })
}
