import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSkillsGrade } from '../../../frontend/src/utils/skills-grade.js'

test('default Skills uses eight terms with standalone Case fields and weighted SN Performance', () => {
  const scores = Object.fromEntries(['fdar', 'kardex', 'journal', 'pe', 'meds'].map(id => ['skills-' + id, 80]))
  Object.assign(scores, { 'skills-case-presentation': 60, 'skills-case-study': 100, 'skills-snhs': 50, 'skills-performance': 100 })
  const result = calculateSkillsGrade(scores)
  assert.equal(result.skillsTotal, 645 / 8)
  assert.equal(result.skillsWeighted, (645 / 8) * 0.4)
  assert.equal(calculateSkillsGrade(scores, Object.keys(scores).filter(id => id !== 'skills-fdar')).skillsTotal, 565 / 7)
  for (const [deleted, total, count] of [
    [['skills-case-presentation'], 585, 7],
    [['skills-case-study'], 545, 7],
    [['skills-case-presentation', 'skills-case-study'], 485, 6],
  ]) {
    assert.equal(calculateSkillsGrade(scores, Object.keys(scores).filter(id => !deleted.includes(id))).skillsTotal, total / count)
  }
  for (const id of ['skills-case-presentation', 'skills-case-study']) {
    assert.equal(calculateSkillsGrade({ ...scores, [id]: null }).skillsWeighted, null)
  }
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
