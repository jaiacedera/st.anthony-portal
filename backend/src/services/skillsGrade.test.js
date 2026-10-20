import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSkillsGrade } from '../../../frontend/src/utils/skills-grade.js'

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
