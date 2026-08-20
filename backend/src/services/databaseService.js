import {
  getGoogleSheetsConfigErrors,
  isGoogleSheetsConfigured,
} from '../../database/googleSheets.js'
import {
  initializeGoogleSheetsDatabase,
  testGoogleSheetsConnection,
} from '../../database/initSheets.js'

export async function getGoogleSheetsDatabaseStatus() {
  if (!isGoogleSheetsConfigured()) {
    return {
      success: false,
      connected: false,
      message: 'Unable to connect to Google Sheets database',
      errors: getGoogleSheetsConfigErrors(),
    }
  }

  try {
    const connection = await testGoogleSheetsConnection()

    return {
      success: true,
      connected: connection.connected,
      message: 'Google Sheets database connected successfully',
    }
  } catch (error) {
    return {
      success: false,
      connected: false,
      message: 'Unable to connect to Google Sheets database',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function initializeGoogleSheets() {
  return initializeGoogleSheetsDatabase()
}
