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

const gradebook = loadModule('../pages/instructor/grades-page.tsx', '\nexport { buildStudentGradeSnapshot, buildDefaultGradeSections, buildDefaultGradeComponents };')
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
  assert.equal(values['knowledge-major-exam-final'], 0)
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
  assert.equal(otherStudent.finalScore, 0)
})

test('custom Midterm assessments appear in Final without duplicating its exam fields', () => {
  const midterm = { sections: gradebook.buildDefaultGradeSections('midterm'), components: gradebook.buildDefaultGradeComponents('midterm') }
  midterm.components.push({ ...midterm.components[0], id: 'quiz-extra', label: 'Quiz 2' })
  const result = carryover.inheritMidtermConfig({ sections: gradebook.buildDefaultGradeSections('final'), components: gradebook.buildDefaultGradeComponents('final') }, midterm)
  assert.ok(result.components.some(component => component.id === 'quiz-extra'))
  assert.equal(result.components.filter(component => component.id === 'knowledge-major-exam-midterm').length, 1)
  assert.equal(result.sections.filter(section => section.category === 'knowledge').reduce((sum, section) => sum + section.weight, 0), 40)
})

test('grading roster sorts by complete last name, then name for ties', () => {
  const students = [
    { lastName: 'Zulu', fullName: 'Aaron Zulu', studentId: '1' },
    { lastName: 'de la Cruz', fullName: 'Zoe de la Cruz', studentId: '2' },
    { lastName: 'Adams', fullName: 'Zoe Adams', studentId: '3' },
    { lastName: 'adams', fullName: 'Amy Adams', studentId: '4' },
  ]
  assert.deepEqual(students.sort(carryover.compareStudentsByLastName).map(student => student.studentId), ['4', '3', '2', '1'])
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
    assert.equal(attitude.total, 0)
    assert.equal(attitude.isIncomplete, false)
    assert.equal(restored.didMigrate, true)
    assert.equal(restored.savedAt, '2026-09-01')
    assert.equal(snapshot.categories[0].sections[0].components[0].score, 87.5)
    const response = loadModule('./student-breakdown-response.ts', '', storage)
      .buildApprovedBreakdownResponse({ requestId: 'r1', username: 'instructor', student, subject, gradingPeriod: 'final' })
    assert.equal(response.attitude.weight, 20)
    assert.equal(response.attitude.weighted, 0)
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
  assert.equal(midterm.finalScore, 0)
  assert.equal(midterm.categories.some(category => category.key === 'attitude'), false)
})

for (const period of ['midterm', 'final']) {
  test(`${period}: missing scores produce zero components, totals, and final grade`, () => {
    const sections = gradebook.buildDefaultGradeSections(period)
    const components = gradebook.buildDefaultGradeComponents(period)
    components.push({ ...components[0], id: 'custom-score', label: 'Custom assessment', isCustom: true })
    const snapshot = gradebook.buildStudentGradeSnapshot(student, subject, period, sections, components, {})
    for (const category of snapshot.categories) {
      assert.equal(category.total, 0)
      assert.equal(category.weighted, 0)
      for (const section of category.sections) {
        for (const component of section.components) assert.equal(component.score, 0)
      }
    }
    assert.equal(snapshot.finalScore, 0)
    assert.equal(snapshot.rating, '5.00')
    assert.equal(snapshot.remarks, 'FAILED')
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
    assert.ok(scores.includes(0))
    assert.equal(response.finalGrade, snapshot.finalScore)
    assert.equal(response.skills.weighted, 0)
  })
}
