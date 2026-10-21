import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { SHEET_HEADERS, SHEET_NAMES } from './sheetsSchema.js'

test('display reads share requests, expire, and cannot restore stale cache after writes', async () => {
  const sheet = SHEET_NAMES.INSTRUCTOR_GRADES
  const headers = SHEET_HEADERS[sheet]
  let rows = [headers, ['grade-1']]
  let reads = 0
  let metadataReads = 0
  let hold = false
  let release
  const client = { spreadsheets: {
    get: async () => {
      metadataReads++
      return { data: { sheets: Object.values(SHEET_NAMES).map(title => ({ properties: { title } })) } }
    },
    values: {
      get: async ({ range }) => {
        if (range.endsWith('1:2')) {
          const name = range.split("'")[1]
          return { data: { values: [SHEET_HEADERS[name]] } }
        }
        reads++
        const snapshot = rows.map(row => [...row])
        if (hold) {
          hold = false
          await new Promise(resolve => { release = resolve })
        }
        return { data: { values: snapshot } }
      },
      append: async ({ requestBody }) => { rows = [...rows, ...requestBody.values] },
    },
  } }
  const google = mock.module('./googleSheets.js', { namedExports: {
    createSheetsClient: () => client, getSpreadsheetId: () => 'test',
  } })
  const date = mock.method(Date, 'now', () => 1000)
  try {
    const { getAllRows, appendRow } = await import('./sheetsService.js')
    hold = true
    const first = getAllRows(sheet)
    await new Promise(resolve => setImmediate(resolve))
    const second = getAllRows(sheet)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(reads, 1)
    release()
    assert.deepEqual(await first, await second)
    await getAllRows(sheet)
    assert.equal(reads, 1)
    date.mock.mockImplementation(() => 17000)
    hold = true
    const stale = getAllRows(sheet)
    await new Promise(resolve => setImmediate(resolve))
    await appendRow(sheet, { id: 'grade-2' })
    const fresh = await getAllRows(sheet)
    assert.equal(fresh.length, 2)
    release()
    await stale
    assert.equal((await getAllRows(sheet)).length, 2)
    assert.equal(reads, 4)
    await getAllRows(SHEET_NAMES.FINAL_GRADES)
    assert.equal(metadataReads, 1)
  } finally {
    release?.()
    date.mock.restore()
    google.restore()
  }
})
