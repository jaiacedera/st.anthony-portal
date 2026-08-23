export type SkillsComponentDefinition = {
  id: string
  label: string
  aliases: readonly string[]
}

export type SkillsGradeInput = Partial<Record<string, number | null | undefined>>

export type SkillsGradeResult = {
  scoreById: Record<string, number | null>
  missingComponentIds: string[]
  isComplete: boolean
  caseAverage: number | null
  coreSkillsAverage: number | null
  snhsContribution: number | null
  performanceContribution: number | null
  snhsPerformanceTotal: number | null
  skillsTotal: number | null
  skillsWeighted: number | null
}

export const SKILLS_COMPONENT_DEFINITIONS: readonly SkillsComponentDefinition[]
export const LEGACY_SKILLS_LABELS: ReadonlySet<string>

export function normalizeSkillsText(value: string): string
export function getSkillsComponentDefinitionById(id: string): SkillsComponentDefinition | null
export function getCanonicalSkillsComponentId(
  componentId: string,
  label?: string,
): string | null
export function getSkillsComponentAliases(
  componentId: string,
  label?: string,
): string[]
export function calculateSkillsGrade(scores: SkillsGradeInput): SkillsGradeResult
