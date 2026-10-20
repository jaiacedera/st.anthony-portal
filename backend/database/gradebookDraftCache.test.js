import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { SHEET_HEADERS, SHEET_NAMES } from './sheetsSchema.js'

test('draft reads fetch external changes and do not reuse an older in-flight read', async () => {
  const sheet = SHEET_NAMES.GRADEBOOK_DRAFTS
  const headers = SHEET_HEADERS[sheet]
  let value = 'first-device'
  let reads = 0
  let holdRead = false
  let release
  const client = { spreadsheets: {
    get: async () => ({ data: { sheets: [{ properties: { title: sheet } }] } }),
    values: { get: async ({ range }) => {
      if (range.endsWith('1:2')) return { data: { values: [headers] } }
      reads++
      const snapshot = value
      if (holdRead) {
        holdRead = false
        await new Promise(resolve => { release = resolve })
      }
      return { data: { values: [headers, [snapshot]] } }
    } },
  } }
  const google = mock.module('./googleSheets.js', { namedExports: {
    createSheetsClient: () => client,
    getSpreadsheetId: () => 'test-spreadsheet',
  } })
  try {
    const { getAllRows } = await import('./sheetsService.js')
    assert.equal((await getAllRows(sheet))[0].draft_id, 'first-device')
    value = 'other-device'
    assert.equal((await getAllRows(sheet))[0].draft_id, 'other-device')
    holdRead = true
    const pending = getAllRows(sheet)
    await new Promise(resolve => setImmediate(resolve))
    value = 'latest-device'
    assert.equal((await getAllRows(sheet))[0].draft_id, 'latest-device')
    release()
    await pending
    assert.equal((await getAllRows(sheet))[0].draft_id, 'latest-device')
    assert.equal(reads, 5)
  } finally {
    release?.()
    google.restore()
  }
})
