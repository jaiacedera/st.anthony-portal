import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
      const value = normalizedLine.slice(separatorIndex + 1).trim()

      return {
        ...values,
        [key]: value,
      }
    }, {})
}

const fileEnv = loadEnvFile(envPath)

export const env = {
  port: Number(process.env.PORT ?? fileEnv.PORT ?? 3000),
  frontendOrigin:
    process.env.FRONTEND_ORIGIN ??
    fileEnv.FRONTEND_ORIGIN ??
    'http://localhost:5173',
}
