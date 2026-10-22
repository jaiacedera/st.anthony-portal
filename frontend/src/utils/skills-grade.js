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
    aliases: Object.freeze(['SNHS', 'SN/HN', 'SNHN']),
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
 * Only active IDs define the denominator; retained scores for deleted fields are ignored.
 * @param {SkillsGradeInput} scores
 * @param {readonly string[]} [activeComponentIds]
 * @returns {SkillsGradeResult}
 */
export function calculateSkillsGrade(scores, activeComponentIds = Object.keys(scores)) {
  const ids = [...new Set(activeComponentIds)]
  /** @type {Record<string, number | null>} */
  const scoreById = Object.fromEntries(ids.map(id => {
    const value = scores[id]
    return [id, typeof value === 'number' && Number.isFinite(value) ? value : null]
  }))
  const remaining = new Set(ids)
  const totals = []
  for (const { members, weight } of [
    { members: ['skills-case-presentation', 'skills-case-study'], weight: 0.5 },
    { members: ['skills-snhs', 'skills-performance'], weight: 0.3 },
  ]) {
    const pair = members.filter(id => remaining.delete(id))
    if (!pair.length) continue
    const values = pair.map(id => scoreById[id])
    totals.push(values.some(value => value === null) ? null
      : pair.length === 1 ? values[0]
      : values[0] * weight + values[1] * (1 - weight))
  }
  const skillsTotal = calculateStrictAverage([...totals, ...[...remaining].map(id => scoreById[id])])
  const missingComponentIds = ids.filter(id => scoreById[id] === null)
  return {
    scoreById,
    missingComponentIds,
    isComplete: skillsTotal !== null,
    skillsTotal,
    skillsWeighted: skillsTotal === null ? null : skillsTotal * 0.4,
  }
}
