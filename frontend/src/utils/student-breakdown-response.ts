import type {
  InstructorRosterSubject,
  InstructorStudentRecord,
} from '../services/instructorApi'
import {
  calculateSkillsGrade,
  getCanonicalSkillsComponentId,
  SKILLS_COMPONENT_DEFINITIONS,
} from './skills-grade.js'

export type GradingPeriodKey = 'midterm' | 'final'
type GradeCategoryKey = 'knowledge' | 'skills' | 'attitude'
type GradeSectionKey = string
type GradeAggregationType = 'average' | 'single'

type GradeCategoryDefinition = {
  key: GradeCategoryKey
  label: string
  weight: number
}

type GradeSectionConfig = {
  id: GradeSectionKey
  category: GradeCategoryKey
  label: string
  weight: number
  aggregationType: GradeAggregationType
  allowAssessments: boolean
  order: number
  isDefault: boolean
  isActive: boolean
  isCustom: boolean
}

type GradeComponentConfig = {
  id: string
  sectionId: GradeSectionKey
  label: string
  order: number
  isDefault: boolean
  isActive: boolean
  isCustom: boolean
  periodAware?: boolean
}

type GradeComponentSnapshot = GradeComponentConfig & {
  displayLabel: string
  score: number | null
}

type GradeSectionSnapshot = GradeSectionConfig & {
  components: GradeComponentSnapshot[]
  average: number | null
  contribution: number | null
}

type GradeCategorySnapshot = GradeCategoryDefinition & {
  sections: GradeSectionSnapshot[]
  weighted: number | null
}

type StudentGradeSnapshot = {
  categories: GradeCategorySnapshot[]
  finalScore: number | null
  rating: string
  remarks: string
}

type GradeOverrideMap = Record<string, number>

type StoredGradebookConfig = {
  sections: GradeSectionConfig[]
  components: GradeComponentConfig[]
}

type StoredGradebookScores = {
  savedOverrides: GradeOverrideMap
}

export type ApprovedBreakdownResponse = {
  requestId: string
  subjectId: string
  subjectCode: string
  subjectTitle: string
  studentId: string
  studentName: string
  gradingPeriod: GradingPeriodKey
  knowledge: {
    label: string
    weight: number
    weighted: number | null
    sections: Array<{
      label: string
      weight: number
      items: Array<{
        label: string
        score: number | null
      }>
      average: number | null
      weighted: number | null
    }>
  }
  skills: {
    label: string
    weight: number
    weighted: number | null
  } | null
  attitude: {
    label: string
    weight: number
    weighted: number | null
  } | null
  finalGrade: number | null
  rating: string
  remarks: string
  generatedAt: string
}

const gradeCategories: GradeCategoryDefinition[] = [
  { key: 'knowledge', label: 'Knowledge', weight: 40 },
  { key: 'skills', label: 'Skills', weight: 40 },
  { key: 'attitude', label: 'Attitude', weight: 20 },
]

const finalMajorExamDefaultComponents = [
  {
    id: 'knowledge-major-exam-midterm',
    sectionId: 'knowledge-major-exam',
    label: 'Midterm Exam',
    order: 1,
    isDefault: true,
    isActive: true,
    isCustom: false,
  },
  {
    id: 'knowledge-major-exam-final',
    sectionId: 'knowledge-major-exam',
    label: 'Final Exam',
    order: 2,
    isDefault: true,
    isActive: true,
    isCustom: false,
  },
] satisfies GradeComponentConfig[]

function buildDefaultGradeSections(gradingPeriod: GradingPeriodKey): GradeSectionConfig[] {
  if (gradingPeriod === 'midterm') {
    return [
      {
        id: 'knowledge-quiz',
        category: 'knowledge',
        label: 'Quiz',
        weight: 8,
        aggregationType: 'average',
        allowAssessments: true,
        order: 1,
        isDefault: true,
        isActive: true,
        isCustom: false,
      },
      {
        id: 'knowledge-long-exam',
        category: 'knowledge',
        label: 'Long Exam',
        weight: 12,
        aggregationType: 'average',
        allowAssessments: true,
        order: 2,
        isDefault: true,
        isActive: true,
        isCustom: false,
      },
      {
        id: 'knowledge-midterm-exam',
        category: 'knowledge',
        label: 'Midterm Exam',
        weight: 10,
        aggregationType: 'average',
        allowAssessments: true,
        order: 3,
        isDefault: true,
        isActive: true,
        isCustom: false,
      },
      {
        id: 'skills-core',
        category: 'skills',
        label: 'Skills Components',
        weight: 40,
        aggregationType: 'average',
        allowAssessments: true,
        order: 1,
        isDefault: true,
        isActive: true,
        isCustom: false,
      },
    ]
  }

  return [
    {
      id: 'knowledge-quiz',
      category: 'knowledge',
      label: 'Quiz',
      weight: 8,
      aggregationType: 'average',
      allowAssessments: true,
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'knowledge-long-exam',
      category: 'knowledge',
      label: 'Long Exam',
      weight: 12,
      aggregationType: 'average',
      allowAssessments: true,
      order: 2,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'knowledge-major-exam',
      category: 'knowledge',
      label: 'Major Exam',
      weight: 20,
      aggregationType: 'average',
      allowAssessments: true,
      order: 3,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'skills-core',
      category: 'skills',
      label: 'Skills Components',
      weight: 40,
      aggregationType: 'average',
      allowAssessments: true,
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'attitude-character',
      category: 'attitude',
      label: 'Character',
      weight: 10,
      aggregationType: 'single',
      allowAssessments: false,
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'attitude-attendance',
      category: 'attitude',
      label: 'Attendance',
      weight: 5,
      aggregationType: 'single',
      allowAssessments: false,
      order: 2,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'attitude-uniform',
      category: 'attitude',
      label: 'Uniform and Paraphernalia',
      weight: 5,
      aggregationType: 'single',
      allowAssessments: false,
      order: 3,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
  ]
}

function buildDefaultGradeComponents(gradingPeriod: GradingPeriodKey): GradeComponentConfig[] {
  const knowledgeDefaults =
    gradingPeriod === 'midterm'
      ? [
          {
            id: 'knowledge-quiz-1',
            sectionId: 'knowledge-quiz',
            label: 'Quiz 1',
            order: 1,
            isDefault: true,
            isActive: true,
            isCustom: false,
          },
          {
            id: 'knowledge-long-exam-1',
            sectionId: 'knowledge-long-exam',
            label: 'Long Exam 1',
            order: 1,
            isDefault: true,
            isActive: true,
            isCustom: false,
          },
          {
            id: 'knowledge-midterm-exam',
            sectionId: 'knowledge-midterm-exam',
            label: 'Midterm Exam',
            order: 1,
            isDefault: true,
            isActive: true,
            isCustom: false,
          },
        ]
      : [
          {
            id: 'knowledge-quiz-1',
            sectionId: 'knowledge-quiz',
            label: 'Quiz 1',
            order: 1,
            isDefault: true,
            isActive: true,
            isCustom: false,
          },
          {
            id: 'knowledge-long-exam-1',
            sectionId: 'knowledge-long-exam',
            label: 'Long Exam 1',
            order: 1,
            isDefault: true,
            isActive: true,
            isCustom: false,
          },
          ...finalMajorExamDefaultComponents,
        ]

  const skillDefaults = SKILLS_COMPONENT_DEFINITIONS.map((definition, index) => ({
    id: definition.id,
    sectionId: 'skills-core',
    label: definition.label,
    order: index + 1,
    isDefault: true,
    isActive: true,
    isCustom: false,
  }))

  if (gradingPeriod === 'midterm') {
    return [...knowledgeDefaults, ...skillDefaults]
  }

  return [
    ...knowledgeDefaults,
    ...skillDefaults,
    {
      id: 'attitude-character',
      sectionId: 'attitude-character',
      label: 'Character',
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'attitude-attendance',
      sectionId: 'attitude-attendance',
      label: 'Attendance',
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
    {
      id: 'attitude-uniform',
      sectionId: 'attitude-uniform',
      label: 'Uniform and Paraphernalia',
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    },
  ]
}

function cloneSections(sections: GradeSectionConfig[]) {
  return sections.map((section) => ({ ...section }))
}

function cloneComponents(components: GradeComponentConfig[]) {
  return components.map((component) => ({ ...component }))
}

function sortSections(sections: GradeSectionConfig[]) {
  return [...sections].sort((left, right) =>
    `${left.category}-${left.order}-${left.id}`.localeCompare(
      `${right.category}-${right.order}-${right.id}`,
    ),
  )
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sortFinalMajorExamComponents(components: GradeComponentConfig[]) {
  return [...components].sort((left, right) => {
    const getPriority = (label: string) => {
      const normalizedLabel = normalizeCsvHeader(label)

      if (normalizedLabel === 'midterm exam') return 0
      if (normalizedLabel === 'final exam') return 1
      return 2
    }

    return getPriority(left.label) - getPriority(right.label) || left.order - right.order
  })
}

function normalizeSectionOrders(sections: GradeSectionConfig[]) {
  const nextSections = cloneSections(sections)

  for (const category of gradeCategories) {
    sortSections(nextSections)
      .filter((section) => section.category === category.key && section.isActive)
      .forEach((section, index) => {
        const match = nextSections.find((candidate) => candidate.id === section.id)

        if (match) {
          match.order = index + 1
        }
      })
  }

  return nextSections
}

function getSectionComponentList(
  components: GradeComponentConfig[],
  sectionId: GradeSectionKey,
) {
  return components
    .filter((component) => component.sectionId === sectionId && component.isActive)
    .sort((left, right) => left.order - right.order)
}

function normalizeComponentOrders(
  components: GradeComponentConfig[],
  sections: GradeSectionConfig[],
) {
  const nextComponents = cloneComponents(components)

  for (const section of sections.filter((currentSection) => currentSection.isActive)) {
    getSectionComponentList(nextComponents, section.id).forEach((component, index) => {
      const match = nextComponents.find((candidate) => candidate.id === component.id)

      if (match) {
        match.order = index + 1
      }
    })
  }

  return nextComponents
}

function normalizeFinalKnowledgeMajorExamStructure(
  sections: GradeSectionConfig[],
  components: GradeComponentConfig[],
) {
  const nextSections = cloneSections(sections)
  const nextComponents = cloneComponents(components)
  let majorExamSection = nextSections.find(
    (section) => section.id === 'knowledge-major-exam' && section.category === 'knowledge',
  )

  if (!majorExamSection) {
    majorExamSection = {
      id: 'knowledge-major-exam',
      category: 'knowledge',
      label: 'Major Exam',
      weight: 20,
      aggregationType: 'average',
      allowAssessments: true,
      order: 3,
      isDefault: true,
      isActive: true,
      isCustom: false,
    }
    nextSections.push(majorExamSection)
  }

  let majorExamComponents = nextComponents.filter(
    (component) => component.isActive && component.sectionId === 'knowledge-major-exam',
  )

  if (
    majorExamComponents.length === 1 &&
    normalizeCsvHeader(majorExamComponents[0].label) === 'major exam'
  ) {
    majorExamComponents[0].label = 'Midterm Exam'
  }

  for (const defaultComponent of finalMajorExamDefaultComponents) {
    const existingComponent = majorExamComponents.find(
      (component) =>
        normalizeCsvHeader(component.label) === normalizeCsvHeader(defaultComponent.label),
    )

    if (!existingComponent) {
      nextComponents.push({ ...defaultComponent })
    }
  }

  majorExamComponents = nextComponents.filter(
    (component) => component.isActive && component.sectionId === 'knowledge-major-exam',
  )

  sortFinalMajorExamComponents(majorExamComponents).forEach((component, index) => {
    component.order = index + 1
  })

  return {
    sections: normalizeSectionOrders(nextSections),
    components: normalizeComponentOrders(nextComponents, nextSections),
  }
}

function readStoredGradeConfig(
  username: string,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
) {
  if (typeof window === 'undefined') {
    return {
      sections: buildDefaultGradeSections(gradingPeriod),
      components: buildDefaultGradeComponents(gradingPeriod),
    }
  }

  const rawValue = window.localStorage.getItem(
    `instructor-grade-config::${username}::${subjectId}::${gradingPeriod}`,
  )

  if (!rawValue) {
    const defaults =
      gradingPeriod === 'final'
        ? normalizeFinalKnowledgeMajorExamStructure(
            buildDefaultGradeSections(gradingPeriod),
            buildDefaultGradeComponents(gradingPeriod),
          )
        : {
            sections: buildDefaultGradeSections(gradingPeriod),
            components: buildDefaultGradeComponents(gradingPeriod),
          }

    return defaults
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGradebookConfig

    if (!Array.isArray(parsed.sections) || !Array.isArray(parsed.components)) {
      throw new Error('Invalid config')
    }

    const sections = normalizeSectionOrders(cloneSections(parsed.sections))
    const components = normalizeComponentOrders(cloneComponents(parsed.components), sections)

    return gradingPeriod === 'final'
      ? normalizeFinalKnowledgeMajorExamStructure(sections, components)
      : { sections, components }
  } catch {
    return {
      sections: buildDefaultGradeSections(gradingPeriod),
      components: buildDefaultGradeComponents(gradingPeriod),
    }
  }
}

function readStoredGradeScores(
  username: string,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
): GradeOverrideMap {
  if (typeof window === 'undefined') {
    return {}
  }

  const rawValue = window.localStorage.getItem(
    `instructor-grade-scores::${username}::${subjectId}::${gradingPeriod}`,
  )

  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGradebookScores

    if (!parsed?.savedOverrides || typeof parsed.savedOverrides !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed.savedOverrides).filter(
        ([, value]) => typeof value === 'number' && Number.isFinite(value),
      ),
    )
  } catch {
    return {}
  }
}

function getRequiredCategoryWeight(
  gradingPeriod: GradingPeriodKey,
  categoryKey: GradeCategoryKey,
) {
  if (gradingPeriod === 'midterm') {
    if (categoryKey === 'knowledge') return 30
    if (categoryKey === 'skills') return 40
    return 0
  }

  return gradeCategories.find((category) => category.key === categoryKey)?.weight ?? 0
}

function getConfiguredCategories(
  sections: GradeSectionConfig[],
  gradingPeriod: GradingPeriodKey,
) {
  const activeCategoryKeys = new Set(
    sections.filter((section) => section.isActive).map((section) => section.category),
  )

  return gradeCategories
    .filter((category) => activeCategoryKeys.has(category.key))
    .map((category) => ({
      ...category,
      weight: getRequiredCategoryWeight(gradingPeriod, category.key),
    }))
}

function getDisplayComponentLabel(
  component: GradeComponentConfig,
  gradingPeriod: GradingPeriodKey,
) {
  if (component.periodAware && normalizeCsvHeader(component.label) === 'major exam') {
    return gradingPeriod === 'final' ? 'Final Exam' : 'Midterm Exam'
  }

  return component.label
}

function getScoreOverrideKey(
  studentId: string,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
  componentId: string,
) {
  return [studentId, subjectId, gradingPeriod, componentId].join('::')
}

function hashString(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }

  return Math.abs(hash)
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function roundTo(value: number, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function calculateAverage(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => value !== null)

  if (!validValues.length) {
    return null
  }

  return roundTo(validValues.reduce((sum, value) => sum + value, 0) / validValues.length, 2)
}

function getComponentBaseScore(
  student: InstructorStudentRecord,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
  sections: GradeSectionConfig[],
  component: GradeComponentConfig,
) {
  const section = sections.find((currentSection) => currentSection.id === component.sectionId)
  const seed = `${student.studentId}:${subjectId}:${gradingPeriod}:${component.id}`
  const hash = hashString(seed)
  const categoryOffset =
    section?.category === 'knowledge' ? 0 : section?.category === 'skills' ? 2 : -1
  const periodOffset = gradingPeriod === 'final' ? 3 : 0

  return clampNumber(60 + (hash % 31) + categoryOffset + periodOffset, 45, 99)
}

function buildSkillsScoreInput(
  components: Array<{ id: string; label: string; score: number | null }>,
) {
  return Object.fromEntries(
    components.flatMap((component) => {
      const canonicalId = getCanonicalSkillsComponentId(component.id, component.label)
      return canonicalId ? [[canonicalId, component.score]] : []
    }),
  )
}

function toRemarks(score: number | null, isIncomplete: boolean) {
  if (isIncomplete || score === null || !Number.isFinite(score)) {
    return 'INC'
  }

  return gradeToRemarks(score)
}

function buildStudentGradeSnapshot({
  student,
  subject,
  gradingPeriod,
  sections,
  components,
  overrides,
}: {
  student: InstructorStudentRecord
  subject: InstructorRosterSubject
  gradingPeriod: GradingPeriodKey
  sections: GradeSectionConfig[]
  components: GradeComponentConfig[]
  overrides: GradeOverrideMap
}): StudentGradeSnapshot {
  const categories = getConfiguredCategories(sections, gradingPeriod).map((category) => {
    const categorySections = sections
      .filter((section) => section.category === category.key && section.isActive)
      .sort((left, right) => left.order - right.order)
      .map<GradeSectionSnapshot>((section) => {
        const sectionComponents = getSectionComponentList(components, section.id).map<
          GradeComponentSnapshot
        >((component) => {
          const overrideKey = getScoreOverrideKey(
            student.id,
            subject.id,
            gradingPeriod,
            component.id,
          )
          const savedScore = overrides[overrideKey]
          const score =
            savedScore !== undefined
              ? roundTo(savedScore, 2)
              : component.isCustom
                ? null
                : roundTo(
                    getComponentBaseScore(student, subject.id, gradingPeriod, sections, component),
                    2,
                  )

          return {
            ...component,
            displayLabel: getDisplayComponentLabel(component, gradingPeriod),
            score,
          }
        })

        const average = calculateAverage(sectionComponents.map((component) => component.score))
        const contribution =
          average === null ? null : roundTo(average * (section.weight / 100), 2)

        return {
          ...section,
          components: sectionComponents,
          average,
          contribution,
        }
      })

    const skillsComputation =
      category.key === 'skills'
        ? calculateSkillsGrade(
            buildSkillsScoreInput(
              categorySections.flatMap((section) =>
                section.components.map((component) => ({
                  id: component.id,
                  label: component.label,
                  score: component.score,
                })),
              ),
            ),
          )
        : null

    const weighted =
      category.key === 'skills'
        ? skillsComputation?.skillsWeighted === null || skillsComputation?.skillsWeighted === undefined
          ? null
          : roundTo(skillsComputation.skillsWeighted, 2)
        : categorySections.length
          ? roundTo(
              categorySections.reduce((sum, section) => sum + (section.contribution ?? 0), 0),
              2,
            )
          : null

    return {
      ...category,
      sections: categorySections,
      weighted,
    }
  })

  const weightedSum = categories
    .map((category) => category.weighted)
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0)
  const configuredWeightTotal = categories.reduce((sum, category) => sum + category.weight, 0)
  const hasMissingKnowledge = categories
    .filter((category) => category.key === 'knowledge')
    .some((category) =>
      category.sections.some((section) =>
        section.components.some((component) => component.score === null),
      ),
    )
  const finalScore =
    configuredWeightTotal > 0 && categories.every((category) => category.weighted !== null)
      ? roundTo(weightedSum / (configuredWeightTotal / 100), 2)
      : null
  const isIncomplete =
    hasMissingKnowledge || categories.some((category) => category.weighted === null)

  return {
    categories,
    finalScore,
    rating: finalScore === null || isIncomplete ? '--' : gradeToRating(finalScore),
    remarks: toRemarks(finalScore, isIncomplete),
  }
}

export function buildApprovedBreakdownResponse({
  requestId,
  username,
  subject,
  student,
  gradingPeriod,
}: {
  requestId: string
  username: string
  subject: InstructorRosterSubject
  student: InstructorStudentRecord
  gradingPeriod: GradingPeriodKey
}): ApprovedBreakdownResponse {
  const { sections, components } = readStoredGradeConfig(username, subject.id, gradingPeriod)
  const overrides = readStoredGradeScores(username, subject.id, gradingPeriod)
  const snapshot = buildStudentGradeSnapshot({
    student,
    subject,
    gradingPeriod,
    sections,
    components,
    overrides,
  })
  const knowledge = snapshot.categories.find((category) => category.key === 'knowledge')
  const skills = snapshot.categories.find((category) => category.key === 'skills')
  const attitude = snapshot.categories.find((category) => category.key === 'attitude')

  if (!knowledge) {
    throw new Error('Knowledge breakdown could not be generated for this request.')
  }

  return {
    requestId,
    subjectId: subject.id,
    subjectCode: subject.code,
    subjectTitle: subject.name,
    studentId: student.id,
    studentName: student.fullName,
    gradingPeriod,
    knowledge: {
      label: `Knowledge (${knowledge.weight}%)`,
      weight: knowledge.weight,
      weighted: knowledge.weighted,
      sections: knowledge.sections.map((section) => ({
        label: `${section.label} (${section.weight}%)`,
        weight: section.weight,
        items: section.components.map((component) => ({
          label: component.displayLabel,
          score: component.score,
        })),
        average: section.average,
        weighted: section.contribution,
      })),
    },
    skills: skills
      ? {
          label: `Skills (${skills.weight}%)`,
          weight: skills.weight,
          weighted: skills.weighted,
        }
      : null,
    attitude: attitude
      ? {
          label: `Attitude (${attitude.weight}%)`,
          weight: attitude.weight,
          weighted: attitude.weighted,
        }
      : null,
    finalGrade: snapshot.finalScore,
    rating: snapshot.rating,
    remarks: snapshot.remarks,
    generatedAt: new Date().toISOString(),
  }
}
import { gradeToRating, gradeToRemarks } from './grade-rating'
