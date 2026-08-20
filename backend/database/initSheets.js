import { pathToFileURL } from 'node:url'
import {
  createSheetsClient,
  getGoogleSheetsConfigErrors,
  getSpreadsheetId,
  isGoogleSheetsConfigured,
} from './googleSheets.js'
import { DATABASE_SHEETS } from './sheetsSchema.js'

function getSheetRange(sheetName, range) {
  return `'${sheetName}'!${range}`
}

async function getSpreadsheetMetadata(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'spreadsheetId,properties.title,sheets.properties',
  })

  return response.data
}

async function addMissingSheets(sheets, spreadsheetId, missingSheets) {
  if (missingSheets.length === 0) {
    return
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missingSheets.map((sheet) => ({
        addSheet: {
          properties: {
            title: sheet.name,
          },
        },
      })),
    },
  })
}

async function ensureHeaders(sheets, spreadsheetId, sheet) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheet.name, '1:1'),
  })
  const currentHeaderRow = response.data.values?.[0] ?? []
  const hasHeaderValues = currentHeaderRow.some(
    (value) => String(value ?? '').trim() !== '',
  )

  if (!hasHeaderValues) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: getSheetRange(sheet.name, 'A1'),
      valueInputOption: 'RAW',
      requestBody: {
        values: [sheet.headers],
      },
    })

    return {
      sheetName: sheet.name,
      headerStatus: 'initialized',
    }
  }

  const headersMatch = sheet.headers.every(
    (header, index) => (currentHeaderRow[index] ?? '').trim() === header,
  )

  if (!headersMatch) {
    throw new Error(
      `Sheet "${sheet.name}" has unexpected headers. Update the tab manually before continuing.`,
    )
  }

  return {
    sheetName: sheet.name,
    headerStatus: 'verified',
  }
}

export async function testGoogleSheetsConnection() {
  if (!isGoogleSheetsConfigured()) {
    return {
      connected: false,
      errors: getGoogleSheetsConfigErrors(),
    }
  }

  const sheets = createSheetsClient()
  const spreadsheet = await getSpreadsheetMetadata(sheets, getSpreadsheetId())

  return {
    connected: true,
    spreadsheetTitle: spreadsheet.properties?.title ?? '',
  }
}

export async function initializeGoogleSheetsDatabase() {
  if (!isGoogleSheetsConfigured()) {
    throw new Error(getGoogleSheetsConfigErrors().join('; '))
  }

  const sheets = createSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const initialMetadata = await getSpreadsheetMetadata(sheets, spreadsheetId)
  const existingSheetNames = new Set(
    (initialMetadata.sheets ?? []).map((sheet) => sheet.properties?.title ?? ''),
  )
  const missingSheets = DATABASE_SHEETS.filter(
    (sheet) => !existingSheetNames.has(sheet.name),
  )

  await addMissingSheets(sheets, spreadsheetId, missingSheets)

  const results = []

  for (const sheet of DATABASE_SHEETS) {
    results.push(await ensureHeaders(sheets, spreadsheetId, sheet))
  }

  return {
    success: true,
    spreadsheetTitle: initialMetadata.properties?.title ?? '',
    createdSheets: missingSheets.map((sheet) => sheet.name),
    sheets: results,
  }
}

if (process.argv[1]) {
  const entryUrl = pathToFileURL(process.argv[1]).href

  if (import.meta.url === entryUrl) {
    initializeGoogleSheetsDatabase()
      .then((result) => {
        console.log(JSON.stringify(result, null, 2))
      })
      .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
      })
  }
}
