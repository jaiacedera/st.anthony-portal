import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { SHEET_HEADERS, SHEET_NAMES as S } from './sheetsSchema.js'

test('initialization appends shared-class schema without moving data or replacing unexpected headers', async () => {
  const tables = new Map(Object.entries(SHEET_HEADERS).map(([name, headers]) => [name, [[...headers]]]))
  for (const name of [S.AUTH_SESSIONS, S.SUBJECT_INSTRUCTORS, S.INSTRUCTOR_GRADES, S.FINAL_GRADES]) tables.delete(name)
  tables.set(S.SUBJECTS, [SHEET_HEADERS[S.SUBJECTS].slice(0, -3), ['subject', 'CODE', 'Original subject', 'professor']])
  tables.set(S.GRADE_REQUESTS, [SHEET_HEADERS[S.GRADE_REQUESTS].slice(0, -2), ['request', 'student', 'subject']])
  const originalSubject = structuredClone(tables.get(S.SUBJECTS)[1])
  const originalRequest = structuredClone(tables.get(S.GRADE_REQUESTS)[1])
  const client = { spreadsheets: {
    get: async () => ({ data: { sheets: [...tables.keys()].map(title => ({ properties: { title } })) } }),
    batchUpdate: async ({ requestBody }) => {
      for (const operation of requestBody.requests) tables.set(operation.addSheet.properties.title, [])
    },
    values: {
      get: async ({ range }) => ({ data: { values: tables.get(range.match(/^'([^']+)'/)[1]).slice(0, 1) } }),
      update: async ({ range, requestBody }) => { tables.get(range.match(/^'([^']+)'/)[1])[0] = [...requestBody.values[0]] },
    },
  } }
  const google = mock.module('./googleSheets.js', { namedExports: {
    createSheetsClient: () => client, getSpreadsheetId: () => 'fixture',
    isGoogleSheetsConfigured: () => true, getGoogleSheetsConfigErrors: () => [],
  } })
  try {
    const { initializeGoogleSheetsDatabase } = await import('./initSheets.js')
    const first = await initializeGoogleSheetsDatabase()
    assert.equal(first.createdSheets.length, 4)
    assert.deepEqual(tables.get(S.SUBJECTS)[0], SHEET_HEADERS[S.SUBJECTS])
    assert.deepEqual(tables.get(S.SUBJECTS)[1], originalSubject)
    assert.deepEqual(tables.get(S.GRADE_REQUESTS)[1], originalRequest)
    assert.equal((await initializeGoogleSheetsDatabase()).createdSheets.length, 0)
    tables.get(S.SUBJECTS)[0][1] = 'unrecognized_column'
    await assert.rejects(initializeGoogleSheetsDatabase(), /unexpected headers/)
    assert.equal(tables.get(S.SUBJECTS)[0][1], 'unrecognized_column')
  } finally { google.restore() }
})
