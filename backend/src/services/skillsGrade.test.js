import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const skillsGradeModuleUrl = pathToFileURL(
  path.resolve(currentDir, '../../../frontend/src/utils/skills-grade.js'),
)

async function loadSkillsGradeModule() {
  const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return import(`${skillsGradeModuleUrl.href}?case=${cacheBust}`)
}

test(
  'calculateSkillsGrade uses the grouped case/core/snhs-performance formula',
  { concurrency: false },
  async () => {
    const { calculateSkillsGrade } = await loadSkillsGradeModule()

    const result = calculateSkillsGrade({
      'skills-journal': 84,
      'skills-fdar': 86,
      'skills-kardex': 88,
      'skills-pe': 90,
      'skills-meds': 92,
      'skills-case-study': 80,
      'skills-case-presentation': 82,
      'skills-snhs': 87.9,
      'skills-performance': 81,
    })

    assert.equal(result.caseAverage, 81)
    assert.ok(Math.abs(result.coreSkillsAverage - 86.83333333333333) < 1e-9)
    assert.ok(Math.abs(result.snhsContribution - 26.37) < 1e-9)
    assert.ok(Math.abs(result.performanceContribution - 56.7) < 1e-9)
    assert.ok(Math.abs(result.snhsPerformanceTotal - 83.07) < 1e-9)
    assert.ok(Math.abs(result.skillsTotal - 84.95166666666667) < 1e-9)
    assert.ok(Math.abs(result.skillsWeighted - 33.980666666666664) < 1e-9)
    assert.equal(result.isComplete, true)
    assert.deepEqual(result.missingComponentIds, [])
  },
)

test(
  'calculateSkillsGrade keeps incomplete skills totals null when a required skill score is missing',
  { concurrency: false },
  async () => {
    const { calculateSkillsGrade } = await loadSkillsGradeModule()

    const result = calculateSkillsGrade({
      'skills-journal': 84,
      'skills-fdar': 86,
      'skills-kardex': 88,
      'skills-pe': 90,
      'skills-meds': 92,
      'skills-case-study': 80,
      'skills-snhs': 87.9,
      'skills-performance': 81,
    })

    assert.equal(result.caseAverage, null)
    assert.equal(result.coreSkillsAverage, null)
    assert.equal(result.snhsPerformanceTotal, 83.07)
    assert.equal(result.skillsTotal, null)
    assert.equal(result.skillsWeighted, null)
    assert.equal(result.isComplete, false)
    assert.deepEqual(result.missingComponentIds, ['skills-case-presentation'])
  },
)
