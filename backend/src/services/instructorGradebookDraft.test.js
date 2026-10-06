import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

test('gradebook drafts persist across loads without publishing grades', async () => {
  let rows = []
  let failWrite = false
  const auth = mock.module('../../database/instructorAuthStore.js', { namedExports: {
    getInstructorAccountByUsername: async () => ({ instructor_id: 'teacher' }),
  } })
  const sheets = mock.module('../../database/sheetsService.js', { namedExports: {
    getAllRows: async () => [{ instructor_id: 'teacher', status: 'ACTIVE' }],
    getInstructorSubjects: async () => [{ subject_id: 'subject', status: 'ACTIVE' }],
    findRows: async (sheet, filters) => {
      assert.equal(sheet, 'GradebookDrafts')
      return rows.filter(row => Object.entries(filters).every(([key, value]) => row[key] === value))
    },
    appendRow: async (sheet, record) => {
      assert.equal(sheet, 'GradebookDrafts')
      if (failWrite) throw new Error('Sheets unavailable')
      rows.push(record)
    },
    updateRowById: async (sheet, key, id, record) => {
      assert.equal(sheet, 'GradebookDrafts')
      if (failWrite) throw new Error('Sheets unavailable')
      rows = rows.map(row => row[key] === id ? { ...row, ...record } : row)
    },
    getGradePublication: () => assert.fail('Drafts must not read publication state'),
    upsertGrade: () => assert.fail('Drafts must not publish grades'),
    upsertGradePublication: () => assert.fail('Drafts must not publish grades'),
  } })
  try {
    const { instructorGradebookDraft } = await import('./instructorGradesService.js')
    const input = { username: 'teacher', subjectId: 'subject', gradingPeriod: 'midterm' }
    assert.equal((await instructorGradebookDraft(input)).draft, null)
    const draft = { sections: [{ id: 'quiz' }], components: [{ id: 'quiz1' }], overrides: { student1: 85, student2: 0 } }
    await instructorGradebookDraft({ ...input, draft }, true)
    assert.deepEqual((await instructorGradebookDraft(input)).draft, draft)
    const updated = { ...draft, overrides: { student1: 90 } }
    await instructorGradebookDraft({ ...input, draft: updated }, true)
    assert.equal(rows.length, 1)
    assert.deepEqual((await instructorGradebookDraft(input)).draft, updated)
    assert.equal((await instructorGradebookDraft({ ...input, gradingPeriod: 'final' })).draft, null)
    await assert.rejects(instructorGradebookDraft({ ...input, subjectId: 'other' }), { statusCode: 404 })
    await assert.rejects(instructorGradebookDraft({ ...input, draft: { ...draft, overrides: { student1: 101 } } }, true), { statusCode: 400 })
    failWrite = true
    await assert.rejects(instructorGradebookDraft({ ...input, draft }, true), /Sheets unavailable/)
    assert.deepEqual((await instructorGradebookDraft(input)).draft, updated)
  } finally {
    auth.restore()
    sheets.restore()
  }
})
