import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as skills from './skills-grade.js'

function loadModule(path, extraSource = '', storage = new Map()) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8') + extraSource
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  })
  const exports = {}
  runInNewContext(outputText, {
    exports,
    require: name => {
      if (name.endsWith('/skills-grade.js')) return skills
      if (name.endsWith('/grade-rating')) return loadModule('./grade-rating.ts')
      if (name.endsWith('/grade-carryover')) return loadModule('./grade-carryover.ts')
      return {}
    },
    window: { localStorage: { getItem: key => storage.get(key) ?? null } },
  })
  return exports
}

const gradebook = loadModule('../pages/instructor/grades-page.tsx', '\nexport { buildStudentGradeSnapshot, buildDefaultGradeSections, buildDefaultGradeComponents, readStoredGradeConfig, persistStoredGradeConfig, persistStoredGradeScores };')

test('score form saves dash as INC, clears blanks, and replaces INC with numbers', () => {
  const source = readFileSync(new URL('../pages/instructor/grades-page.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('    const nextOverrides =', source.indexOf('  function handleSaveEditedScores('))
  const loop = source.slice(start, source.indexOf('    persistStoredGradeScores(', start))
  const helpers = loadModule('../pages/instructor/grades-page.tsx', '\nexport { getScoreOverrideKey, parseNumericValue, clampNumber, roundTo };')
  for (const [input, expected] of [['-', 'INC'], ['', undefined], ['0', 0], ['87.5', 87.5]]) {
    const context = {
      ...helpers, draftScoreOverrides: { 's::sub::final::field': 'INC' },
      editSnapshot: { student: { id: 's' } }, selectedSubject: { id: 'sub' },
      FINAL_GRADING_PERIOD: 'final', nextPreparedComponents: [{ id: 'field', isActive: true }],
      editDraftValues: { field: input }, result: null,
    }
    runInNewContext(loop + '\nresult = nextOverrides;', context)
    assert.equal(context.result['s::sub::final::field'], expected)
  }
})

test('cloud configuration loads without browser storage and cache failures do not fail saves', () => {
  const cloud = {
    sections: gradebook.buildDefaultGradeSections('midterm'),
    components: gradebook.buildDefaultGradeComponents('midterm'),
    savedAt: '2026-10-07T00:00:00.000Z',
  }
  const loaded = gradebook.readStoredGradeConfig('empty-device', 'midterm', cloud)
  assert.equal(loaded.savedAt, cloud.savedAt)
  assert.equal(loaded.components.length, cloud.components.length)
  // The test storage intentionally has no setItem method.
  assert.doesNotThrow(() => gradebook.persistStoredGradeConfig('blocked', cloud))
  assert.doesNotThrow(() => gradebook.persistStoredGradeScores('blocked', { draftOverrides: {}, savedOverrides: {} }))
  const blockedStorage = loadModule('../pages/instructor/grades-page.tsx', '\nexport { readStoredGradeConfig };', {
    get: () => { throw new Error('Browser storage disabled') },
  })
  assert.equal(blockedStorage.readStoredGradeConfig('blocked', 'midterm', cloud).savedAt, cloud.savedAt)
})

test('applying a breakdown keeps the cloud baseline until autosave succeeds', () => {
  const source = readFileSync(new URL('../pages/instructor/grades-page.tsx', import.meta.url), 'utf8')
  const handler = source.slice(source.indexOf('  function handleSaveComponentManager()'), source.indexOf('  function handleSaveEditedScores('))
  const { outputText } = ts.transpileModule(`${handler}\nhandleSaveComponentManager()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  })
  const calls = []
  const context = new Proxy({
    componentManagerCategory: null,
    componentManagerDraftSections: [], componentManagerDraftComponents: [],
    selectedSubject: { id: 'subject' }, username: 'teacher',
    selectedGradingPeriod: 'midterm', savedConfigAt: 'cloud-timestamp',
    cloneSections: value => value, cloneComponents: value => value,
  }, {
    has: () => true,
    get: (target, key) => key in target ? target[key] : (...args) => { calls.push([key, ...args]); return [] },
  })
  runInNewContext(outputText, context)
  assert.ok(calls.some(([key]) => key === 'setGradeSections'))
  assert.ok(calls.some(([key]) => key === 'setGradeComponents'))
  assert.ok(!calls.some(([key]) => ['setSavedGradeSections', 'setSavedGradeComponents', 'setSavedConfigAt'].includes(key)))
  assert.ok(calls.some(([key, message]) => key === 'setSuccessMessage' && message.includes('Autosave pending')))
})
const student = { id: 'student-1', studentId: '2026-001', fullName: 'Test Student', subjects: [] }
const subject = { id: 'subject-1', code: 'NCM 118', name: 'Nursing', label: 'NCM 118' }
const carryover = loadModule('./grade-carryover.ts')

test('Midterm scores carry into Final fields and its approved breakdown without replacing entered Final scores', () => {
  const midterm = {
    [`${student.id}::${subject.id}::midterm::knowledge-quiz-1`]: 85,
    [`${student.id}::${subject.id}::midterm::knowledge-long-exam-1`]: 90,
    [`${student.id}::${subject.id}::midterm::knowledge-midterm-exam`]: 88,
    [`${student.id}::${subject.id}::midterm::${skills.SKILLS_COMPONENT_DEFINITIONS[0].id}`]: 92,
  }
  const final = { [`${student.id}::${subject.id}::final::knowledge-long-exam-1`]: 0 }
  const inherited = carryover.inheritMidtermScores(midterm, final)
  const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, 'final',
    gradebook.buildDefaultGradeSections('final'), gradebook.buildDefaultGradeComponents('final'), inherited)
  const values = Object.fromEntries(snapshot.categories.flatMap(category => category.sections.flatMap(section =>
    section.components.map(component => [component.id, component.score]))))
  assert.equal(values['knowledge-quiz-1'], 85)
  assert.equal(values['knowledge-long-exam-1'], 0)
  assert.equal(values['knowledge-major-exam-midterm'], 88)
  assert.equal(values['knowledge-major-exam-final'], null)
  assert.equal(values[skills.SKILLS_COMPONENT_DEFINITIONS[0].id], 92)
  assert.equal(Object.keys(final).length, 1)
  const storage = new Map([
    [`instructor-grade-scores::instructor::${subject.id}::midterm`, JSON.stringify({ savedOverrides: midterm })],
    [`instructor-grade-scores::instructor::${subject.id}::final`, JSON.stringify({ savedOverrides: final })],
  ])
  const response = loadModule('./student-breakdown-response.ts', '', storage)
    .buildApprovedBreakdownResponse({ requestId: 'r1', username: 'instructor', student, subject, gradingPeriod: 'final' })
  assert.equal(response.finalGrade, snapshot.finalScore)
  const otherStudent = gradebook.buildStudentGradeSnapshot({ ...student, id: 'other' }, subject, 'final',
    gradebook.buildDefaultGradeSections('final'), gradebook.buildDefaultGradeComponents('final'), inherited)
  assert.equal(otherStudent.finalScore, null)
})

test('custom Midterm assessments appear in Final without duplicating its exam fields', () => {
  const midterm = { sections: gradebook.buildDefaultGradeSections('midterm'), components: gradebook.buildDefaultGradeComponents('midterm') }
  midterm.components.push({ ...midterm.components[0], id: 'quiz-extra', label: 'Quiz 2' })
  const result = carryover.inheritMidtermConfig({ sections: gradebook.buildDefaultGradeSections('final'), components: gradebook.buildDefaultGradeComponents('final') }, midterm)
  assert.ok(result.components.some(component => component.id === 'quiz-extra'))
  assert.equal(result.components.filter(component => component.id === 'knowledge-major-exam-midterm').length, 1)
  assert.equal(result.sections.filter(section => section.category === 'knowledge').reduce((sum, section) => sum + section.weight, 0), 40)
})

test('grading roster displays surname first and sorts email fallbacks among names', () => {
  const students = [
    { lastName: 'Zulu', firstName: 'Aaron', email: 'aaron@example.com', studentId: '1' },
    { lastName: ' de la Cruz ', firstName: ' Zoe ', email: 'zoe@example.com', studentId: '2' },
    { lastName: 'Adams', firstName: 'Zoe', email: 'zoe.adams@example.com', studentId: '3' },
    { lastName: 'adams', firstName: 'Amy', email: 'amy@example.com', studentId: '4' },
    { lastName: '', firstName: '', email: ' bella@email.com ', studentId: '5' },
    { lastName: 'Not set', firstName: '', email: 'emma@email.com', studentId: '6' },
  ]
  assert.deepEqual(students.sort(carryover.compareGradeStudentNames).map(carryover.getGradeStudentDisplayName), [
    'adams, Amy', 'Adams, Zoe', 'bella@email.com', 'de la Cruz, Zoe', 'emma@email.com', 'Zulu, Aaron',
  ])
})

for (const legacyState of ['missing', 'disabled']) {
  test(`Final restores ${legacyState} Attitude from saved configuration without losing scores`, () => {
    const sections = gradebook.buildDefaultGradeSections('final')
      .filter(section => legacyState !== 'missing' || section.category !== 'attitude')
      .map(section => section.category === 'attitude' ? { ...section, isActive: false } : section)
    const components = gradebook.buildDefaultGradeComponents('final')
      .filter(component => legacyState !== 'missing' || !component.id.startsWith('attitude-'))
      .map(component => component.id.startsWith('attitude-') ? { ...component, isActive: false } : component)
    const key = `instructor-grade-config::instructor::${subject.id}::final`
    const overrides = { [`${student.id}::${subject.id}::final::knowledge-quiz-1`]: 87.5 }
    const storage = new Map([
      [key, JSON.stringify({ sections, components, savedAt: '2026-09-01' })],
      [`instructor-grade-scores::instructor::${subject.id}::final`, JSON.stringify({ savedOverrides: overrides })],
    ])
    const module = loadModule('../pages/instructor/grades-page.tsx',
      '\nexport { readStoredGradeConfig, buildStudentGradeSnapshot };', storage)
    const restored = module.readStoredGradeConfig(key, 'final')
    const snapshot = module.buildStudentGradeSnapshot(student, subject, 'final', restored.sections, restored.components, overrides)
    const attitude = snapshot.categories.find(category => category.key === 'attitude')
    assert.ok(attitude, 'Final must include the Attitude column group')
    assert.equal(attitude.weight, 20)
    assert.equal(attitude.sections.reduce((sum, section) => sum + section.weight, 0), 20)
    assert.equal(attitude.total, null)
    assert.equal(attitude.isIncomplete, true)
    assert.equal(restored.didMigrate, true)
    assert.equal(restored.savedAt, '2026-09-01')
    assert.equal(snapshot.categories[0].sections[0].components[0].score, 87.5)
    const response = loadModule('./student-breakdown-response.ts', '', storage)
      .buildApprovedBreakdownResponse({ requestId: 'r1', username: 'instructor', student, subject, gradingPeriod: 'final' })
    assert.equal(response.attitude.weight, 20)
    assert.equal(response.attitude.weighted, null)
    assert.equal(response.finalGrade, snapshot.finalScore)
  })
}

test('Final uses 40/40/20 weights and keeps its scores separate from Midterm', () => {
  const sections = gradebook.buildDefaultGradeSections('final')
  const components = gradebook.buildDefaultGradeComponents('final')
  const scores = { knowledge: 80, skills: 70, attitude: 90 }
  const overrides = Object.fromEntries(components.map(component => {
    const section = sections.find(section => section.id === component.sectionId)
    return [`${student.id}::${subject.id}::final::${component.id}`, scores[section.category]]
  }))
  const final = gradebook.buildStudentGradeSnapshot(student, subject, 'final', sections, components, overrides)
  assert.equal(JSON.stringify(final.categories.map(category => [category.key, category.weight, category.weighted])),
    JSON.stringify([['knowledge', 40, 32], ['skills', 40, 28], ['attitude', 20, 18]]))
  assert.equal(final.finalScore, 78)
  const midterm = gradebook.buildStudentGradeSnapshot(student, subject, 'midterm',
    gradebook.buildDefaultGradeSections('midterm'), gradebook.buildDefaultGradeComponents('midterm'), overrides)
  assert.equal(midterm.finalScore, null)
  assert.equal(midterm.categories.some(category => category.key === 'attitude'), false)
})

for (const period of ['midterm', 'final']) {
  test(`${period}: empty scores remain ungraded in every category`, () => {
    const sections = gradebook.buildDefaultGradeSections(period)
    const components = gradebook.buildDefaultGradeComponents(period)
    components.push({ ...components[0], id: 'custom-score', label: 'Custom assessment', isCustom: true })
    const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, period, sections, components, {})
    for (const category of snapshot.categories) {
      assert.equal(category.total, null)
      assert.equal(category.weighted, null)
      for (const section of category.sections) {
        for (const component of section.components) assert.equal(component.score, null)
      }
    }
    assert.equal(snapshot.finalScore, null)
    assert.equal(snapshot.rating, '--')
    assert.equal(snapshot.remarks, 'INC')
  })

  test(`${period}: saved scores survive and approved breakdown matches the gradebook`, () => {
    const sections = gradebook.buildDefaultGradeSections(period)
    const components = gradebook.buildDefaultGradeComponents(period)
    const overrides = { [`${student.id}::${subject.id}::${period}::${components[0].id}`]: 87.5 }
    const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, period, sections, components, overrides)
    const storage = new Map([
      [`instructor-grade-scores::instructor::${subject.id}::${period}`, JSON.stringify({ savedOverrides: overrides })],
    ])
    const responseModule = loadModule('./student-breakdown-response.ts', '', storage)
    const response = responseModule.buildApprovedBreakdownResponse({ requestId: 'request-1', username: 'instructor', subject, student, gradingPeriod: period })
    const scores = response.knowledge.sections.flatMap(section => section.items.map(item => item.score))
    assert.ok(scores.includes(87.5))
    assert.ok(scores.includes(null))
    assert.equal(response.finalGrade, snapshot.finalScore)
    assert.equal(response.skills.weighted, null)
  })
}

for (const period of ['midterm', 'final']) {
  test(period + ': deleted and disabled Skills fields are excluded in summary and approved breakdown', () => {
    const sections = gradebook.buildDefaultGradeSections(period)
    const defaults = gradebook.buildDefaultGradeComponents(period)
    const skillIds = new Set(sections.filter(s => s.category === 'skills').map(s => s.id))
    const skillFields = defaults.filter(c => skillIds.has(c.sectionId))
    const active = [...skillFields.slice(0, 3), { ...skillFields[3], id: 'custom-skill', label: 'Custom Skill', isCustom: true }]
    const components = [...defaults.filter(c => !skillIds.has(c.sectionId)), ...active,
      { ...skillFields[4], isActive: false }]
    const overrides = Object.fromEntries(skillFields.map(c => [student.id + '::' + subject.id + '::' + period + '::' + c.id, 10]))
    active.forEach((c, i) => { overrides[student.id + '::' + subject.id + '::' + period + '::' + c.id] = 87 + i })
    const configKey = 'instructor-grade-config::instructor::' + subject.id + '::' + period
    const scoresKey = 'instructor-grade-scores::instructor::' + subject.id + '::' + period
    const storage = new Map([[configKey, JSON.stringify({ sections, components })], [scoresKey, JSON.stringify({ savedOverrides: overrides })]])
    const module = loadModule('../pages/instructor/grades-page.tsx', '\nexport { readStoredGradeConfig, buildStudentGradeSnapshot };', storage)
    const loaded = module.readStoredGradeConfig(configKey, period)
    const snapshot = module.buildStudentGradeSnapshot(student, subject, period, loaded.sections, loaded.components, overrides)
    const skillsCategory = snapshot.categories.find(c => c.key === 'skills')
    assert.equal(skillsCategory.weight, 40)
    assert.equal(skillsCategory.total, 88.5)
    assert.equal(skillsCategory.weighted, 35.4)
    assert.equal(skillsCategory.isIncomplete, false)
    const response = loadModule('./student-breakdown-response.ts', '', storage).buildApprovedBreakdownResponse({ requestId: 'r', username: 'instructor', subject, student, gradingPeriod: period })
    assert.equal(response.skills.weight, 40)
    assert.equal(response.skills.weighted, 35.4)
    assert.equal(response.finalGrade, snapshot.finalScore)
    delete overrides[student.id + '::' + subject.id + '::' + period + '::custom-skill']
    const pending = module.buildStudentGradeSnapshot(student, subject, period, loaded.sections, loaded.components, overrides)
    assert.equal(pending.categories.find(c => c.key === 'skills').weighted, null)
    assert.equal(pending.finalScore, null)
  })
}

for (const period of ['midterm', 'final']) {
  test(`${period}: reloading legacy Skills preserves active fields and deleted defaults`, () => {
    const sections = gradebook.buildDefaultGradeSections(period)
    const template = gradebook.buildDefaultGradeComponents(period).find(c => c.sectionId === 'skills-core')
    const components = ['Journal', 'FDAR', 'Medications', 'Return Demo'].map((label, i) => ({
      ...template, id: `skills-core-${i + 1}`, label, order: i,
    }))
    components.push({ ...template, id: 'skills-performance', isActive: false })
    const scores = Object.fromEntries(components.map((c, i) => [
      `${student.id}::${subject.id}::${period}::${c.id}`, i < 4 ? 87 + i : 0,
    ]))
    const cloud = { sections, components, savedAt: '2026-10-20' }
    const loaded = gradebook.readStoredGradeConfig('empty-device', period, cloud)
    const skillsState = values => JSON.stringify(values.filter(c => c.sectionId === 'skills-core').map(c => [c.id, c.isActive]).sort())
    assert.equal(skillsState(loaded.components), skillsState(components))
    const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, period, loaded.sections, loaded.components, scores)
    const category = snapshot.categories.find(c => c.key === 'skills')
    assert.equal(category.total, 88.5)
    assert.equal(category.weighted, 35.4)
    assert.equal(category.isIncomplete, false)
    if (period === 'midterm') {
      // Migrating older non-Skills categories must not reset the Skills configuration either.
      const oldSections = [...sections, { id: 'old-attitude', category: 'attitude', isActive: true, order: 99, weight: 20 }]
      const migrated = gradebook.readStoredGradeConfig('empty-device', period, { ...cloud, sections: oldSections })
      assert.equal(skillsState(migrated.components), skillsState(components))
    }
    delete scores[`${student.id}::${subject.id}::${period}::skills-core-4`]
    const pending = gradebook.buildStudentGradeSnapshot(student, subject, period, loaded.sections, loaded.components, scores)
    assert.equal(pending.categories.find(c => c.key === 'skills').weighted, null)
  })
}

for (const period of ['midterm', 'final']) {
  for (const deletion of ['removed', 'disabled']) {
    test(`${period}: ${deletion} Knowledge exams stay deleted after apply and reload`, () => {
      const sections = gradebook.buildDefaultGradeSections(period)
      const defaults = gradebook.buildDefaultGradeComponents(period)
      const deletedId = period === 'final' ? 'knowledge-major-exam-midterm' : 'knowledge-midterm-exam'
      const components = defaults.flatMap(component => component.id !== deletedId ? [component] : deletion === 'disabled' ? [{ ...component, isActive: false }] : [])
      const key = `instructor-grade-config::instructor::${subject.id}::${period}`
      const overrides = Object.fromEntries(defaults.map(component => [`${student.id}::${subject.id}::${period}::${component.id}`, component.id === deletedId ? 1 : 90]))
      const storage = new Map([
        [key, JSON.stringify({ sections, components })],
        [`instructor-grade-config::instructor::${subject.id}::midterm`, JSON.stringify({ sections: gradebook.buildDefaultGradeSections('midterm'), components: gradebook.buildDefaultGradeComponents('midterm') })],
        [`instructor-grade-scores::instructor::${subject.id}::${period}`, JSON.stringify({ savedOverrides: overrides })],
      ])
      storage.set(key, JSON.stringify({ sections, components }))
      const module = loadModule('../pages/instructor/grades-page.tsx', '\nexport { readStoredGradeConfig, normalizeFinalKnowledgeMajorExamStructure, buildStudentGradeSnapshot };', storage)
      const applied = period === 'final' ? module.normalizeFinalKnowledgeMajorExamStructure(sections, components) : { sections, components }
      const loaded = module.readStoredGradeConfig(key, period, applied)
      const reopened = module.readStoredGradeConfig(key, period, JSON.parse(JSON.stringify(loaded)))
      assert.ok(!reopened.components.some(component => component.id === deletedId && component.isActive))
      const snapshot = module.buildStudentGradeSnapshot(student, subject, period, reopened.sections, reopened.components, overrides)
      const knowledge = snapshot.categories.find(category => category.key === 'knowledge')
      assert.ok(!knowledge.sections.flatMap(section => section.components).some(component => component.id === deletedId))
      for (const section of knowledge.sections.filter(section => section.components.length)) assert.equal(section.average, 90)
      const response = loadModule('./student-breakdown-response.ts', '', storage).buildApprovedBreakdownResponse({ requestId: 'r', username: 'instructor', subject, student, gradingPeriod: period })
      assert.ok(!response.knowledge.sections.flatMap(section => section.items).some(item => item.score === 1))
      assert.equal(response.knowledge.weighted, knowledge.weighted)
    })
  }
}

for (const categoryKey of ['knowledge', 'skills', 'attitude']) {
  test(categoryKey + ': INC persists, propagates, clears, and ignores deleted fields', () => {
    const sections = gradebook.buildDefaultGradeSections('final')
    const components = gradebook.buildDefaultGradeComponents('final')
    const sectionIds = new Set(sections.filter(s => s.category === categoryKey).map(s => s.id))
    const field = components.find(c => sectionIds.has(c.sectionId))
    const key = id => [student.id, subject.id, 'final', id].join('::')
    const overrides = Object.fromEntries(components.map(c => [key(c.id), 90]))
    overrides[key(field.id)] = 'INC'
    const storage = new Map([
      ['instructor-grade-scores::instructor::' + subject.id + '::final', JSON.stringify({ draftOverrides: overrides, savedOverrides: overrides })],
    ])
    const module = loadModule('../pages/instructor/grades-page.tsx', '\nexport { readStoredGradeScores };', storage)
    const loaded = module.readStoredGradeScores('instructor-grade-scores::instructor::' + subject.id + '::final')
    assert.equal(loaded.savedOverrides[key(field.id)], 'INC')
    const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, 'final', sections, components, loaded.savedOverrides)
    const category = snapshot.categories.find(c => c.key === categoryKey)
    assert.equal(category.isInc, true)
    assert.equal(category.total, null)
    assert.equal(category.weighted, null)
    assert.equal(snapshot.finalScore, null)
    assert.equal(snapshot.rating, 'INC')
    assert.equal(snapshot.remarks, 'INC')
    const response = loadModule('./student-breakdown-response.ts', '', storage).buildApprovedBreakdownResponse({ requestId: 'r', username: 'instructor', subject, student, gradingPeriod: 'final' })
    assert.equal(response[categoryKey].isInc, true)
    assert.equal(response[categoryKey].weighted, null)
    assert.equal(response.isInc, true)
    assert.equal(response.rating, 'INC')
    assert.equal(response.finalGrade, null)
    const deleted = gradebook.buildStudentGradeSnapshot(student, subject, 'final', sections, components.filter(c => c.id !== field.id), overrides)
    assert.equal(deleted.isInc, false)
    overrides[key(field.id)] = 90
    const fixed = gradebook.buildStudentGradeSnapshot(student, subject, 'final', sections, components, overrides)
    assert.equal(fixed.isInc, false)
    assert.equal(fixed.finalScore, 90)
    delete overrides[key(field.id)]
    const blank = gradebook.buildStudentGradeSnapshot(student, subject, 'final', sections, components, overrides)
    assert.equal(blank.isInc, false)
    assert.equal(blank.finalScore, null)
    assert.equal(blank.rating, '--')
  })
}
