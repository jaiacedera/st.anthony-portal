import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSkillsGrade } from '../../../frontend/src/utils/skills-grade.js'

test('Skills equally weights Core Skills Average and SN Performance', () => {
  const scores = Object.fromEntries(['fdar', 'kardex', 'journal', 'pe', 'meds'].map(id => ['skills-' + id, 80]))
  Object.assign(scores, { 'skills-case-presentation': 60, 'skills-case-study': 100, 'skills-snhs': 50, 'skills-performance': 100 })
  const result = calculateSkillsGrade(scores)
  assert.equal(result.skillsTotal, 82.5)
  assert.equal(result.skillsWeighted, 33)
  assert.equal(calculateSkillsGrade(scores, Object.keys(scores).filter(id => id !== 'skills-fdar')).skillsTotal, 82.5)
  for (const [deleted, total, count] of [
    [['skills-case-presentation'], 500, 6],
    [['skills-case-study'], 460, 6],
    [['skills-case-presentation', 'skills-case-study'], 400, 5],
  ]) {
    assert.equal(calculateSkillsGrade(scores, Object.keys(scores).filter(id => !deleted.includes(id))).skillsTotal, (total / count + 85) / 2)
  }
  for (const id of ['skills-case-presentation', 'skills-case-study']) {
    assert.equal(calculateSkillsGrade({ ...scores, [id]: null }).skillsWeighted, null)
  }
})

test('Excel example and deletion fallbacks', () => {
  const scores = Object.fromEntries([
    ['fdar', 80], ['kardex', 85], ['journal', 84], ['pe', 83], ['meds', 87],
    ['case-presentation', 87], ['case-study', 85], ['snhs', 89], ['performance', 87],
  ].map(([id, score]) => ['skills-' + id, score]))
  const coreIds = Object.keys(scores).filter(id => !['skills-snhs', 'skills-performance'].includes(id))
  const core = 591 / 7
  for (const [extra, expected] of [
    [[], core], [['skills-snhs'], (core + 89) / 2],
    [['skills-performance'], (core + 87) / 2],
    [['skills-snhs', 'skills-performance'], (core + 87.6) / 2],
  ]) {
    assert.equal(calculateSkillsGrade(scores, [...coreIds, ...extra]).skillsTotal, expected)
  }
  const result = calculateSkillsGrade(scores)
  assert.equal(result.skillsTotal.toFixed(2), '86.01')
  assert.equal(result.skillsWeighted.toFixed(2), '34.41')
  assert.equal(calculateSkillsGrade(scores, ['skills-snhs', 'skills-performance']).skillsTotal, 87.6)
})

for (const [first, second, combined] of [
  ['skills-snhs', 'skills-performance', 78],
]) {
  test(`${first}: both, either, neither, and pending composite members`, () => {
    const scores = { only: 100, [first]: 50, [second]: 90 }
    for (const [active, expected] of [
      [[first, second], (100 + combined) / 2], [[first], 75], [[second], 95], [[], 100],
    ]) {
      assert.equal(calculateSkillsGrade(scores, ['only', ...active]).skillsTotal, expected)
    }
    assert.equal(calculateSkillsGrade({ ...scores, [first]: null }).skillsTotal, null)
    assert.equal(calculateSkillsGrade({ ...scores, [second]: null }).skillsWeighted, null)
  })
}

test('Skills averages only active subgrades and retains its 40% weight', () => {
  const scores = { journal: 87, fdar: 88, custom: 89, performance: 90, deleted: 10 }
  const result = calculateSkillsGrade(scores, ['journal', 'fdar', 'custom', 'performance'])
  assert.equal(result.skillsTotal, 88.5)
  assert.ok(Math.abs(result.skillsWeighted - 35.4) < 1e-9)
  assert.equal(result.isComplete, true)
  assert.equal(result.scoreById.deleted, undefined)
  assert.deepEqual(result.missingComponentIds, [])
})

test('unscored active Skills fields are pending, including custom fields', () => {
  for (const missing of [undefined, null, NaN]) {
    const result = calculateSkillsGrade({ a: 90, custom: missing }, ['a', 'custom'])
    assert.equal(result.skillsTotal, null)
    assert.equal(result.skillsWeighted, null)
    assert.equal(result.isComplete, false)
    assert.deepEqual(result.missingComponentIds, ['custom'])
  }
  assert.equal(calculateSkillsGrade({ a: 90 }, ['a', 'missing']).isComplete, false)
})

test('empty Skills stays pending; one active field receives the entire 40%; zero is a score', () => {
  assert.equal(calculateSkillsGrade({ old: 100 }, []).skillsWeighted, null)
  assert.equal(calculateSkillsGrade({}).isComplete, false)
  assert.equal(calculateSkillsGrade({ only: 90 }).skillsWeighted, 36)
  assert.equal(calculateSkillsGrade({ only: 0 }).skillsWeighted, 0)
  assert.equal(calculateSkillsGrade({ only: 0 }).isComplete, true)
})
