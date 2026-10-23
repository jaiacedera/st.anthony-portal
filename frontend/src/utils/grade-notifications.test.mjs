import assert from 'node:assert/strict'
import { test } from 'node:test'
import { notifyGradeEvent, readGradeNotifications } from './grade-notifications.ts'

test('groups repeated autosaves by instructor and subject/group, keeping distinct events', () => {
  const store = new Map(), events = []
  const originalStorage = globalThis.sessionStorage, originalWindow = globalThis.window
  globalThis.sessionStorage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) }
  globalThis.window = { dispatchEvent: event => events.push(event) }
  try {
    notifyGradeEvent('teacher', 'saved', 'Grades saved', 'Nursing · Group A')
    notifyGradeEvent('teacher', 'saved', 'Grades saved', 'Nursing · Group A')
    assert.equal(readGradeNotifications('teacher').length, 1)
    notifyGradeEvent('teacher', 'export', 'Excel export completed', 'Nursing · Group A')
    notifyGradeEvent('teacher', 'saved', 'Grades saved', 'Nursing · Group B')
    assert.equal(readGradeNotifications('teacher').length, 3)
    assert.equal(readGradeNotifications('other-teacher').length, 0)
    assert.equal(events.length, 4)
  } finally { globalThis.sessionStorage = originalStorage; globalThis.window = originalWindow }
})
