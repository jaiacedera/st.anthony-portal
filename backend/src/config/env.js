import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAbuseConfig } from './abuseLimits.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(currentDir, '..', '..')
const envPath = path.join(backendRoot, '.env')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/u)
    .reduce((values, line) => {
      const normalizedLine = line.trim()

      if (!normalizedLine || normalizedLine.startsWith('#')) {
        return values
      }

      const separatorIndex = normalizedLine.indexOf('=')

      if (separatorIndex < 0) {
        return values
      }

      const key = normalizedLine.slice(0, separatorIndex).trim()
      const rawValue = normalizedLine.slice(separatorIndex + 1).trim()
      const value =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue

      return {
        ...values,
        [key]: value,
      }
    }, {})
}

const fileEnv = process.env.VERCEL ? {} : loadEnvFile(envPath)

export const env = {
  authStore: process.env.AUTH_STORE ?? fileEnv.AUTH_STORE ?? 'local',
  abuseLimits: createAbuseConfig({ ...fileEnv, ...process.env }),
  port: Number(process.env.PORT ?? fileEnv.PORT ?? 3000),
  frontendOrigin:
    process.env.FRONTEND_ORIGIN ??
    fileEnv.FRONTEND_ORIGIN ??
    'http://localhost:5173',
  googleProjectId: process.env.GOOGLE_PROJECT_ID ?? fileEnv.GOOGLE_PROJECT_ID ?? '',
  googleClientEmail:
    process.env.GOOGLE_CLIENT_EMAIL ?? fileEnv.GOOGLE_CLIENT_EMAIL ?? '',
  googlePrivateKey:
    process.env.GOOGLE_PRIVATE_KEY ?? fileEnv.GOOGLE_PRIVATE_KEY ?? '',
  googleSheetId: process.env.GOOGLE_SHEET_ID ?? fileEnv.GOOGLE_SHEET_ID ?? '',
  brevoApiKey: process.env.BREVO_API_KEY ?? fileEnv.BREVO_API_KEY ?? '',
  brevoSenderEmail:
    process.env.BREVO_SENDER_EMAIL ?? fileEnv.BREVO_SENDER_EMAIL ?? '',
  brevoSenderName:
    process.env.BREVO_SENDER_NAME ?? fileEnv.BREVO_SENDER_NAME ?? 'St. Anthony College',
}
