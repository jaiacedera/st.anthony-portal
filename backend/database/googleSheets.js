import { google } from 'googleapis'
import { env } from '../src/config/env.js'

const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
]

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
    throw new Error('GOOGLE_SHEET_ID is not configured')
  }

  return env.googleSheetId
}

export function createGoogleAuth() {
  if (!isGoogleSheetsConfigured()) {
    throw new Error(getGoogleSheetsConfigErrors().join('; '))
  }

  return new google.auth.GoogleAuth({
    credentials: {
      project_id: env.googleProjectId,
      client_email: env.googleClientEmail,
      private_key: env.googlePrivateKey.replace(/\\n/g, '\n'),
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
