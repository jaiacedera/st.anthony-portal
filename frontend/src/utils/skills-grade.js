/**
 * @typedef {Object} SkillsComponentDefinition
 * @property {string} id
 * @property {string} label
 * @property {readonly string[]} aliases
 */

/**
 * @typedef {Partial<Record<string, number | null | undefined>>} SkillsGradeInput
 */

/**
 * @typedef {Object} SkillsGradeResult
 * @property {Record<string, number | null>} scoreById
 * @property {string[]} missingComponentIds
 * @property {boolean} isComplete
 * @property {number | null} caseAverage
 * @property {number | null} coreSkillsAverage
 * @property {number | null} snhsContribution
 * @property {number | null} performanceContribution
 * @property {number | null} snhsPerformanceTotal
 * @property {number | null} skillsTotal
 * @property {number | null} skillsWeighted
 */

export const SKILLS_COMPONENT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'skills-journal',
    label: 'Journal',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    id: 'skills-fdar',
    label: 'FDAR',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    id: 'skills-kardex',
    label: 'KARDEX',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    id: 'skills-pe',
    label: 'PE',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    id: 'skills-meds',
    label: 'MEDS',
    aliases: Object.freeze(['Medications']),
  }),
  Object.freeze({
    id: 'skills-case-study',
    label: 'Case Study',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    id: 'skills-case-presentation',
    label: 'Case Presentation',
    aliases: Object.freeze(['Case Pres', 'Case Pres.']),
  }),
  Object.freeze({
    id: 'skills-snhs',
    label: 'SN/HS',
    aliases: Object.freeze(['SNHS']),
  }),
  Object.freeze({
    id: 'skills-performance',
    label: 'Performance',
    aliases: Object.freeze([]),
  }),
])

export const LEGACY_SKILLS_LABELS = new Set([
  'medications',
  'v/s',
  'case pres',
  'case pres.',
  'pda',
  'ncra',
  'role play',
  'mcos',
  'case',
  'demonstration',
  'return demo',
])

const skillsDefinitionById = new Map(
  SKILLS_COMPONENT_DEFINITIONS.map((definition) => [definition.id, definition]),
)

const skillsDefinitionByAlias = new Map()

for (const definition of SKILLS_COMPONENT_DEFINITIONS) {
  for (const alias of [definition.label, ...definition.aliases]) {
    skillsDefinitionByAlias.set(normalizeSkillsText(alias), definition)
  }
}

/**
 * @param {string} value
 */
export function normalizeSkillsText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} id
 * @returns {SkillsComponentDefinition | null}
 */
export function getSkillsComponentDefinitionById(id) {
  return skillsDefinitionById.get(id) ?? null
}

/**
 * @param {string} componentId
 * @param {string} [label]
 * @returns {string | null}
 */
export function getCanonicalSkillsComponentId(componentId, label = '') {
  if (skillsDefinitionById.has(componentId)) {
    return componentId
  }

  const definition = skillsDefinitionByAlias.get(normalizeSkillsText(label))
  return definition?.id ?? null
}

/**
 * @param {string} componentId
 * @param {string} [label]
 * @returns {string[]}
 */
export function getSkillsComponentAliases(componentId, label = '') {
  const aliases = new Set()
  const definition =
    getSkillsComponentDefinitionById(componentId) ??
    skillsDefinitionByAlias.get(normalizeSkillsText(label)) ??
    null

  if (label) {
    aliases.add(label)
  }

  if (definition) {
    aliases.add(definition.label)

    for (const alias of definition.aliases) {
      aliases.add(alias)
    }
  }

  return [...aliases]
}

/**
 * @param {Array<number | null>} values
 * @returns {number | null}
 */
function calculateStrictAverage(values) {
  if (values.some((value) => value === null)) {
    return null
  }

  if (!values.length) {
    return null
  }

  return values.reduce((sum, value) => sum + /** @type {number} */ (value), 0) / values.length
}

/**
 * @param {SkillsGradeInput} scores
 * @returns {SkillsGradeResult}
 */
export function calculateSkillsGrade(scores) {
  /** @type {Record<string, number | null>} */
  const scoreById = {}

  for (const definition of SKILLS_COMPONENT_DEFINITIONS) {
    const rawValue = scores[definition.id]
    scoreById[definition.id] =
      typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null
  }

  const caseAverage = calculateStrictAverage([
    scoreById['skills-case-study'],
    scoreById['skills-case-presentation'],
  ])

  const coreSkillsAverage = calculateStrictAverage([
    scoreById['skills-journal'],
    scoreById['skills-fdar'],
    scoreById['skills-kardex'],
    scoreById['skills-pe'],
    scoreById['skills-meds'],
    caseAverage,
  ])

  const snhsContribution =
    scoreById['skills-snhs'] === null ? null : scoreById['skills-snhs'] * 0.3
  const performanceContribution =
    scoreById['skills-performance'] === null
      ? null
      : scoreById['skills-performance'] * 0.7
  const snhsPerformanceTotal =
    snhsContribution === null || performanceContribution === null
      ? null
      : snhsContribution + performanceContribution

  const skillsTotal = calculateStrictAverage([coreSkillsAverage, snhsPerformanceTotal])
  const skillsWeighted = skillsTotal === null ? null : skillsTotal * 0.4
  const missingComponentIds = SKILLS_COMPONENT_DEFINITIONS.map((definition) => definition.id).filter(
    (componentId) => scoreById[componentId] === null,
  )

  return {
    scoreById,
    missingComponentIds,
    isComplete: missingComponentIds.length === 0,
    caseAverage,
    coreSkillsAverage,
    snhsContribution,
    performanceContribution,
    snhsPerformanceTotal,
    skillsTotal,
    skillsWeighted,
  }
}
