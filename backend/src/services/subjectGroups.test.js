import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { SHEET_NAMES as S } from '../../database/sheetsSchema.js'

test('subject groups authorize access, isolate memberships and preserve enrollment on deletion', async () => {
  const tables = new Map(Object.values(S).map(name => [name, []]))
  const rows = sheet => tables.get(sheet)
  for (const subject_id of ['a', 'b']) rows(S.SUBJECT_STUDENTS).push({ subject_id, student_id: 'student', status: 'ACTIVE' })
  const db = mock.module('../../database/sheetsService.js', { namedExports: {
    getAllRows: async sheet => structuredClone(rows(sheet)),
    findRows: async (sheet, filters) => structuredClone(rows(sheet).filter(row => Object.entries(filters).every(([key, value]) => row[key] === value))),
    appendRow: async (sheet, record) => rows(sheet).push(record),
    updateRowById: async (sheet, key, id, record) => Object.assign(rows(sheet).find(row => row[key] === id), record),
    deleteRowById: async (sheet, key, id) => tables.set(sheet, rows(sheet).filter(row => row[key] !== id)),
  } })
  const auth = mock.module('./sharedSubjectsService.js', { namedExports: {
    subjectContext: async username => { if (username !== 'instructor') throw Object.assign(new Error('Forbidden'), { statusCode: 403 }) },
  } })
  try {
    const { getSubjectGroups, changeSubjectGroup } = await import('./subjectGroupsService.js')
    const change = (subjectId, input) => changeSubjectGroup({ username: 'instructor', subjectId, ...input })
    await assert.rejects(getSubjectGroups({ username: 'outsider', subjectId: 'a' }), { statusCode: 403 })
    await assert.rejects(changeSubjectGroup({ username: 'outsider', subjectId: 'a', action: 'create', groupName: 'Invalid' }), { statusCode: 403 })
    await assert.rejects(change('a', { action: 'create', groupName: ' ' }))
    const first = (await change('a', { action: 'create', groupName: 'Group 1' })).groups[0].id
    const second = (await change('a', { action: 'create', groupName: 'Group 2' })).groups[1].id
    const other = (await change('b', { action: 'create', groupName: 'Group 1' })).groups[0].id
    await assert.rejects(change('a', { action: 'create', groupName: 'group 1' }))
    await assert.rejects(change('a', { action: 'assign', groupId: other, studentId: 'student' }))
    await assert.rejects(change('a', { action: 'delete', groupId: other }))
    await assert.rejects(change('a', { action: 'assign', groupId: first, studentId: 'not-enrolled' }))
    await change('a', { action: 'assign', groupId: first, studentId: 'student' })
    await change('b', { action: 'assign', groupId: other, studentId: 'student' })
    await Promise.all([first, second].map(groupId => change('a', { action: 'assign', groupId, studentId: 'student' })))
    const moved = await getSubjectGroups({ username: 'instructor', subjectId: 'a' })
    assert.equal(moved.members.length, 1)
    assert.equal(moved.members[0].group_id, second)
    const renamed = await change('a', { action: 'rename', groupId: second, groupName: 'Renamed' })
    assert.equal(renamed.groups[1].group_name, 'Renamed')
    const deleted = await change('a', { action: 'delete', groupId: second })
    assert.equal(deleted.members.length, 0)
    assert.equal(rows(S.SUBJECT_STUDENTS).length, 2)
    assert.equal((await getSubjectGroups({ username: 'instructor', subjectId: 'b' })).members.length, 1)
    await change('b', { action: 'assign', groupId: '', studentId: 'student' })
    assert.equal(rows(S.SUBJECT_GROUP_MEMBERS).length, 0)
  } finally { db.restore(); auth.restore() }
})
