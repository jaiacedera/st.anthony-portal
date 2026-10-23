import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../pages/instructor/grades-page.tsx', import.meta.url), 'utf8')
const effectStart = source.indexOf('    if (collaborativeSubject || loadedScope !== scopeKey')
const effect = source.slice(effectStart, source.indexOf('  }, [', effectStart))

test('autosave debounces edits for one second and cancels superseded timers', () => {
  const timers = new Map()
  let calls = 0
  const context = {
    collaborativeSubject: false, loadedScope: 'a', scopeKey: 'a', isLoadingDraft: false, draftLoadFailed: false,
    isSaving: false, componentManagerCategory: null, hasUnsavedChanges: true, editDirty: false,
    failedDraft: { current: '' }, pendingDraft: 'scores', saveAutomatically: () => calls++,
    window: { setTimeout: (callback, delay) => { assert.equal(delay, 1000); timers.set(callback, delay); return callback }, clearTimeout: id => timers.delete(id) },
  }
  const schedule = () => runInNewContext(`(function() { ${effect} })()`, context)
  const cleanup = schedule()
  assert.equal(calls, 0)
  cleanup()
  schedule()
  assert.equal(timers.size, 1)
  for (const callback of timers.keys()) callback()
  assert.equal(calls, 1)
  for (const blocked of [{ isLoadingDraft: true }, { draftLoadFailed: true }, { loadedScope: 'other-group' }, { isSaving: true }, { hasUnsavedChanges: false }, { failedDraft: { current: 'scores' } }]) {
    timers.clear()
    runInNewContext(`(function() { ${effect} })()`, { ...context, ...blocked })
    assert.equal(timers.size, 0)
  }
})

test('failed autosaves preserve the saved baseline; successful retries use the captured draft', async () => {
  const start = source.indexOf('  async function handleSaveChanges(')
  const fn = source.slice(start, source.indexOf('  function handleImportTrigger()', start))
  const javascript = ts.transpileModule(fn, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const baseline = { old: 80 }, draft = { sections: [], components: [], overrides: { student: 95 } }
  const events = []
  let saved = baseline, failed = false, calls = 0, reject = true
  const context = {
    selectedSubject: { id: 'subject', label: 'Nursing' }, selectedGroup: 'group', username: 'teacher', cacheUsername: 'teacher-group',
    isSaving: false, isLoadingDraft: false, draftLoadFailed: false, loadedScope: 'scope', scopeKey: 'scope',
    saveInFlight: { current: false }, failedDraft: { current: '' }, FINAL_GRADING_PERIOD: 'final', periodLabel: 'Final', notificationDetail: 'Nursing · Group',
    instructorGradebookDraft: async (_input, { draft: sent }) => { calls++; assert.equal(sent, draft); if (reject) throw new Error('Offline'); return { savedAt: 'now' } },
    setIsSaving: () => {}, setSaveFailed: value => { failed = value }, setErrorMessage: () => {}, setSuccessMessage: () => {}, setHasCloudDraft: () => {},
    getGradeConfigStorageKey: () => '', getGradeScoreStorageKey: () => '', persistStoredGradeConfig: () => {}, persistStoredGradeScores: () => {},
    setSavedScoreOverrides: value => { saved = value }, setSavedGradeSections: () => {}, setSavedGradeComponents: () => {}, setSavedScoresAt: () => {}, setSavedConfigAt: () => {}, setHistoryEntries: () => {},
    cloneSections: value => value, cloneComponents: value => value, notifyGradeEvent: (...args) => events.push(args),
  }
  const save = runInNewContext(`${javascript}; handleSaveChanges`, context)
  await save(draft)
  assert.equal(saved, baseline)
  assert.equal(failed, true)
  assert.equal(context.failedDraft.current, JSON.stringify(draft))
  reject = false
  await save(draft)
  assert.equal(saved.student, 95)
  assert.equal(failed, false)
  assert.equal(events.length, 2)
  context.loadedScope = 'different-group'
  await save(draft)
  context.loadedScope = 'scope'; context.draftLoadFailed = true
  await save(draft)
  assert.equal(calls, 2)
})
