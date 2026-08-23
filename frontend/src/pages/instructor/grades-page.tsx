import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  fetchInstructorDashboard,
  fetchInstructorStudents,
  type InstructorPendingRequestPreview,
  type InstructorRosterSubject,
  type InstructorStudentRecord,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'

type GradebookTabKey = 'gradebook' | 'requests' | 'history'
type GradingPeriodKey = 'prelim' | 'midterm' | 'final'
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
  hasMissingScores: boolean
}

type GradeCategorySnapshot = GradeCategoryDefinition & {
  sections: GradeSectionSnapshot[]
  total: number | null
  weighted: number | null
  isIncomplete: boolean
}

type StudentGradeSnapshot = {
  student: InstructorStudentRecord
  subject: InstructorRosterSubject | null
  categories: GradeCategorySnapshot[]
  finalScore: number | null
  remarks: string
  isIncomplete: boolean
}

type GradeOverrideMap = Record<string, number>

type PendingBreakdownRequest = InstructorPendingRequestPreview & {
  localStatus: string
}

type GradeHistoryEntry = {
  id: string
  studentId: string
  studentName: string
  subjectId: string
  subjectLabel: string
  gradingPeriod: GradingPeriodKey
  action: string
  actor: string
  timestamp: string
  note: string
}

type GradeDetailsState = {
  studentId: string
} | null

type EditGradesState = {
  studentId: string
} | null

type ComponentManagerCategory = GradeCategoryKey | null

type StoredGradebookConfig = {
  sections: GradeSectionConfig[]
  components: GradeComponentConfig[]
}

const gradingPeriods: Array<{ key: GradingPeriodKey; label: string }> = [
  { key: 'prelim', label: 'Prelim' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'final', label: 'Final' },
]

const gradeCategories: GradeCategoryDefinition[] = [
  { key: 'knowledge', label: 'Knowledge', weight: 40 },
  { key: 'skills', label: 'Skills', weight: 40 },
  { key: 'attitude', label: 'Attitude', weight: 20 },
]

const defaultSkillLabels = [
  'Medications',
  'FDAR',
  'KARDEX',
  'V/S',
  'Performance',
  'Case Study',
  'Case Pres.',
]

function buildDefaultGradeSections(): GradeSectionConfig[] {
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

function buildDefaultGradeComponents(): GradeComponentConfig[] {
  return [
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
      id: 'knowledge-major-exam',
      sectionId: 'knowledge-major-exam',
      label: 'Major Exam',
      order: 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
      periodAware: true,
    },
    ...defaultSkillLabels.map((label, index) => ({
      id: `skills-core-${index + 1}`,
      sectionId: 'skills-core',
      label,
      order: index + 1,
      isDefault: true,
      isActive: true,
      isCustom: false,
    })),
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21h14a1 1 0 0 0 1-1V7.5L16.5 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1Z" />
      <path d="M8 21v-6h8v6" />
      <path d="M8 4v5h6" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function StudentAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="m6 6 1 14a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9l1-14" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function getSectionConfig(sections: GradeSectionConfig[], sectionId: GradeSectionKey) {
  return sections.find((section) => section.id === sectionId) ?? null
}

function cloneSections(sections: GradeSectionConfig[]) {
  return sections.map((section) => ({ ...section }))
}

function sortSections(sections: GradeSectionConfig[]) {
  return [...sections].sort((left, right) =>
    `${left.category}-${left.order}-${left.id}`.localeCompare(
      `${right.category}-${right.order}-${right.id}`,
    ),
  )
}

function sortComponents(components: GradeComponentConfig[]) {
  return [...components].sort((left, right) =>
    `${left.sectionId}-${left.order}-${left.id}`.localeCompare(
      `${right.sectionId}-${right.order}-${right.id}`,
    ),
  )
}

function getCategoryWeight(categoryKey: GradeCategoryKey) {
  return gradeCategories.find((category) => category.key === categoryKey)?.weight ?? 0
}

function getGradingPeriodLabel(gradingPeriod: GradingPeriodKey) {
  return gradingPeriods.find((period) => period.key === gradingPeriod)?.label ?? 'Midterm'
}

function getDisplayComponentLabel(
  component: GradeComponentConfig,
  gradingPeriod: GradingPeriodKey,
) {
  if (component.periodAware) {
    return `${getGradingPeriodLabel(gradingPeriod)} Exam`
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

function getHistoryKey(
  studentId: string,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
) {
  return [studentId, subjectId, gradingPeriod].join('::')
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

function parseNumericValue(value: string) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return null
  }

  const parsed = Number.parseFloat(normalizedValue.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatScore(value: number, decimals = 2) {
  return value.toFixed(decimals)
}

function formatScoreOrPlaceholder(value: number | null, decimals = 2) {
  return value === null ? '--' : formatScore(value, decimals)
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function calculateAverage(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => value !== null)

  if (!validValues.length) {
    return null
  }

  return roundTo(
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length,
    2,
  )
}

function toRemarks(score: number | null, isIncomplete: boolean) {
  if (isIncomplete || score === null || !Number.isFinite(score)) {
    return 'INC'
  }

  return score >= 75 ? 'PASSED' : 'FAILED'
}

function getRemarkClassName(remark: string) {
  const normalizedRemark = remark.trim().toUpperCase()

  if (normalizedRemark === 'PASSED') {
    return 'grade-remark grade-remark--passed'
  }

  if (normalizedRemark === 'INC') {
    return 'grade-remark grade-remark--inc'
  }

  return 'grade-remark grade-remark--failed'
}

function getSummaryDotClassName(category: GradeCategoryKey) {
  if (category === 'knowledge') {
    return 'summary-dot summary-dot--knowledge'
  }

  if (category === 'skills') {
    return 'summary-dot summary-dot--skills'
  }

  return 'summary-dot summary-dot--attitude'
}

function renderTabLabel(tab: GradebookTabKey) {
  if (tab === 'gradebook') {
    return 'Gradebook'
  }

  if (tab === 'requests') {
    return 'Student Breakdown Requests'
  }

  return 'Grade History'
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let currentValue = ''
  let isInsideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (isInsideQuotes && line[index + 1] === '"') {
        currentValue += '"'
        index += 1
      } else {
        isInsideQuotes = !isInsideQuotes
      }
      continue
    }

    if (character === ',' && !isInsideQuotes) {
      cells.push(currentValue.trim())
      currentValue = ''
      continue
    }

    currentValue += character
  }

  cells.push(currentValue.trim())
  return cells
}

function getDefaultVisibleComponentIds(components: GradeComponentConfig[]) {
  return components.filter((component) => component.isActive).map((component) => component.id)
}

function cloneComponents(components: GradeComponentConfig[]) {
  return components.map((component) => ({ ...component }))
}

function serializeSections(sections: GradeSectionConfig[]) {
  return JSON.stringify(
    sortSections(sections).map((section) => ({
      id: section.id,
      category: section.category,
      label: section.label,
      weight: section.weight,
      aggregationType: section.aggregationType,
      allowAssessments: section.allowAssessments,
      order: section.order,
      isDefault: section.isDefault,
      isActive: section.isActive,
      isCustom: section.isCustom,
    })),
  )
}

function serializeComponents(components: GradeComponentConfig[]) {
  return JSON.stringify(
    sortComponents(components)
      .map((component) => ({
        id: component.id,
        sectionId: component.sectionId,
        label: component.label,
        order: component.order,
        isDefault: component.isDefault,
        isActive: component.isActive,
        isCustom: component.isCustom,
        periodAware: component.periodAware ?? false,
      })),
  )
}

function getComponentBaseScore(
  student: InstructorStudentRecord,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
  sections: GradeSectionConfig[],
  component: GradeComponentConfig,
) {
  const section = getSectionConfig(sections, component.sectionId)
  const seed = `${student.studentId}:${subjectId}:${gradingPeriod}:${component.id}`
  const hash = hashString(seed)
  const categoryOffset =
    section?.category === 'knowledge'
      ? 0
      : section?.category === 'skills'
        ? 2
        : -1
  const periodOffset = gradingPeriod === 'prelim' ? -3 : gradingPeriod === 'final' ? 3 : 0

  return clampNumber(60 + (hash % 31) + categoryOffset + periodOffset, 45, 99)
}

function buildStudentGradeSnapshot(
  student: InstructorStudentRecord,
  subject: InstructorRosterSubject | null,
  gradingPeriod: GradingPeriodKey,
  sections: GradeSectionConfig[],
  components: GradeComponentConfig[],
  overrides: GradeOverrideMap,
): StudentGradeSnapshot {
  const categories = gradeCategories.map((category) => {
    const categorySections = sections
      .filter((section) => section.category === category.key)
      .filter((section) => section.isActive)
      .sort((left, right) => left.order - right.order)
      .map<GradeSectionSnapshot>((section) => {
        const sectionComponents = getSectionComponentList(components, section.id).map<
          GradeComponentSnapshot
        >((component) => {
            const overrideKey = getScoreOverrideKey(
              student.id,
              subject?.id ?? '',
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
                      getComponentBaseScore(
                        student,
                        subject?.id ?? 'unassigned',
                        gradingPeriod,
                        sections,
                        component,
                      ),
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
          hasMissingScores: sectionComponents.some((component) => component.score === null),
        }
      })

    const availableContributions = categorySections
      .map((section) => section.contribution)
      .filter((value): value is number => value !== null)
    const weighted = availableContributions.length
      ? roundTo(availableContributions.reduce((sum, value) => sum + value, 0), 2)
      : null
    const total =
      weighted === null ? null : roundTo(weighted / (category.weight / 100), 2)
    const isIncomplete = categorySections.some(
      (section) =>
        !section.components.length || section.average === null || section.hasMissingScores,
    )

    return {
      ...category,
      sections: categorySections,
      total,
      weighted,
      isIncomplete,
    }
  })

  const availableWeighted = categories
    .map((category) => category.weighted)
    .filter((value): value is number => value !== null)
  const finalScore = availableWeighted.length
    ? roundTo(availableWeighted.reduce((sum, value) => sum + value, 0), 2)
    : null
  const isIncomplete = categories.some(
    (category) => category.isIncomplete || category.weighted === null,
  )

  return {
    student,
    subject,
    categories,
    finalScore,
    remarks: toRemarks(finalScore, isIncomplete),
    isIncomplete,
  }
}

function getSectionComponentList(
  components: GradeComponentConfig[],
  sectionId: GradeSectionKey,
) {
  return components
    .filter((component) => component.sectionId === sectionId && component.isActive)
    .sort((left, right) => left.order - right.order)
}

function getCsvHeaderAliases(
  component: GradeComponentConfig,
  gradingPeriod: GradingPeriodKey,
) {
  const aliases = new Set<string>([normalizeCsvHeader(component.label)])

  aliases.add(normalizeCsvHeader(getDisplayComponentLabel(component, gradingPeriod)))

  if (component.periodAware) {
    aliases.add(normalizeCsvHeader('Major Exam'))
  }

  return [...aliases]
}

function createCustomComponent(
  sectionId: GradeSectionKey,
  label: string,
  order: number,
  periodAware = false,
) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sectionId,
    label,
    order,
    isDefault: false,
    isActive: true,
    isCustom: true,
    periodAware,
  } satisfies GradeComponentConfig
}

function createCustomSection(category: GradeCategoryKey, order: number) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id: `${category}-${suffix}`,
    category,
    label:
      category === 'knowledge'
        ? `Sub-grade ${order}`
        : category === 'attitude'
          ? `Attitude ${order}`
          : 'Skills Components',
    weight: 0,
    aggregationType: category === 'attitude' ? 'single' : 'average',
    allowAssessments: category !== 'attitude',
    order,
    isDefault: false,
    isActive: true,
    isCustom: true,
  } satisfies GradeSectionConfig
}

function createLinkedSingleComponent(section: GradeSectionConfig) {
  return {
    id: `${section.id}-score`,
    sectionId: section.id,
    label: section.label,
    order: 1,
    isDefault: false,
    isActive: true,
    isCustom: true,
  } satisfies GradeComponentConfig
}

function getNextCustomLabel(
  sectionId: GradeSectionKey,
  sections: GradeSectionConfig[],
  components: GradeComponentConfig[],
) {
  const currentCount = getSectionComponentList(components, sectionId).length
  const section = getSectionConfig(sections, sectionId)

  if (!section) {
    return `Component ${currentCount + 1}`
  }

  if (section.category === 'skills') {
    return `Skill ${currentCount + 1}`
  }

  return `${section.label.trim() || 'Assessment'} ${currentCount + 1}`
}

function syncVisibleComponentIds(
  previousComponents: GradeComponentConfig[],
  nextComponents: GradeComponentConfig[],
  currentVisibleIds: string[],
) {
  const previousIds = new Set(
    previousComponents.filter((component) => component.isActive).map((component) => component.id),
  )
  const currentVisibleSet = new Set(currentVisibleIds)

  return nextComponents
    .filter((component) => component.isActive)
    .map((component) => component.id)
    .filter((componentId) => currentVisibleSet.has(componentId) || !previousIds.has(componentId))
}

function normalizeSectionOrders(sections: GradeSectionConfig[]) {
  const nextSections = cloneSections(sections)

  for (const category of gradeCategories) {
    sortSections(nextSections)
      .filter((section) => section.category === category.key && section.isActive)
      .forEach((section, index) => {
        const currentSection = nextSections.find((candidate) => candidate.id === section.id)

        if (currentSection) {
          currentSection.order = index + 1
        }
      })
  }

  return nextSections
}

function normalizeComponentOrders(components: GradeComponentConfig[], sections: GradeSectionConfig[]) {
  const nextComponents = cloneComponents(components)

  for (const section of sections.filter((currentSection) => currentSection.isActive)) {
    getSectionComponentList(nextComponents, section.id).forEach((component, index) => {
      const currentComponent = nextComponents.find((candidate) => candidate.id === component.id)

      if (currentComponent) {
        currentComponent.order = index + 1
      }
    })
  }

  return nextComponents
}

function getGradeConfigStorageKey(
  username: string,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
) {
  return `instructor-grade-config::${username}::${subjectId}::${gradingPeriod}`
}

function readStoredGradeConfig(storageKey: string): StoredGradebookConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(storageKey)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGradebookConfig

    if (!Array.isArray(parsed.sections) || !Array.isArray(parsed.components)) {
      return null
    }

    const normalizedSections = normalizeSectionOrders(cloneSections(parsed.sections))
    const normalizedComponents = normalizeComponentOrders(
      cloneComponents(parsed.components),
      normalizedSections,
    )

    return {
      sections: normalizedSections,
      components: normalizedComponents,
    }
  } catch {
    return null
  }
}

function persistStoredGradeConfig(storageKey: string, config: StoredGradebookConfig) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      sections: sortSections(config.sections),
      components: sortComponents(config.components),
    }),
  )
}

export default function GradesPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialSections = useMemo(() => buildDefaultGradeSections(), [])
  const initialComponents = useMemo(() => buildDefaultGradeComponents(), [])
  const [students, setStudents] = useState<InstructorStudentRecord[]>([])
  const [subjects, setSubjects] = useState<InstructorRosterSubject[]>([])
  const [gradeSections, setGradeSections] = useState<GradeSectionConfig[]>(
    cloneSections(initialSections),
  )
  const [gradeComponents, setGradeComponents] = useState<GradeComponentConfig[]>(
    cloneComponents(initialComponents),
  )
  const [pendingRequests, setPendingRequests] = useState<PendingBreakdownRequest[]>([])
  const [historyEntries, setHistoryEntries] = useState<GradeHistoryEntry[]>([])
  const [activeTab, setActiveTab] = useState<GradebookTabKey>('gradebook')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedGradingPeriod, setSelectedGradingPeriod] =
    useState<GradingPeriodKey>('midterm')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [schoolYearLabel, setSchoolYearLabel] = useState('Not set')
  const [semesterLabel, setSemesterLabel] = useState('Not set')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [bindingMessage, setBindingMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [visibleComponentIds, setVisibleComponentIds] = useState<string[]>(
    getDefaultVisibleComponentIds(initialComponents),
  )
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false)
  const [gradeDetailsState, setGradeDetailsState] = useState<GradeDetailsState>(null)
  const [editGradesState, setEditGradesState] = useState<EditGradesState>(null)
  const [draftScoreOverrides, setDraftScoreOverrides] = useState<GradeOverrideMap>({})
  const [savedScoreOverrides, setSavedScoreOverrides] = useState<GradeOverrideMap>({})
  const [savedGradeSections, setSavedGradeSections] = useState<GradeSectionConfig[]>(
    cloneSections(initialSections),
  )
  const [savedGradeComponents, setSavedGradeComponents] = useState<GradeComponentConfig[]>(
    cloneComponents(initialComponents),
  )
  const [editDraftValues, setEditDraftValues] = useState<Record<string, string>>({})
  const [editDraftSections, setEditDraftSections] = useState<GradeSectionConfig[]>([])
  const [editDraftComponents, setEditDraftComponents] = useState<GradeComponentConfig[]>([])
  const [componentManagerCategory, setComponentManagerCategory] =
    useState<ComponentManagerCategory>(null)
  const [componentManagerDraftSections, setComponentManagerDraftSections] = useState<
    GradeSectionConfig[]
  >([])
  const [componentManagerDraftComponents, setComponentManagerDraftComponents] = useState<
    GradeComponentConfig[]
  >([])
  const [componentManagerError, setComponentManagerError] = useState('')

  useEffect(() => {
    if (!username) {
      setIsLoading(false)
      setErrorMessage('No instructor session was found. Please sign in again.')
      return
    }

    const abortController = new AbortController()

    setIsLoading(true)
    setErrorMessage('')
    setBindingMessage('')

    Promise.all([
      fetchInstructorStudents(username, abortController.signal),
      fetchInstructorDashboard(username, abortController.signal),
    ])
      .then(([studentsPayload, dashboardPayload]) => {
        if (abortController.signal.aborted) {
          return
        }

        setStudents(studentsPayload.students)
        setSubjects(studentsPayload.subjects)
        setSchoolYearLabel(studentsPayload.header.schoolYear)
        setSemesterLabel(studentsPayload.header.semester)
        setSelectedSubjectId((current) =>
          studentsPayload.subjects.some((subject) => subject.id === current)
            ? current
            : studentsPayload.subjects[0]?.id ?? '',
        )
        setBindingMessage(
          studentsPayload.needsBinding
            ? studentsPayload.message ?? ''
            : dashboardPayload.needsBinding
              ? dashboardPayload.message ?? ''
              : '',
        )
        setPendingRequests(
          dashboardPayload.previews.pendingRequests.map((request) => ({
            ...request,
            localStatus: request.status,
          })),
        )
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor gradebook data.',
        )
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [username])

  useEffect(() => {
    if (!username || !selectedSubjectId) {
      return
    }

    const storageKey = getGradeConfigStorageKey(username, selectedSubjectId, selectedGradingPeriod)
    const storedConfig = readStoredGradeConfig(storageKey)
    const nextSections = storedConfig?.sections ?? cloneSections(initialSections)
    const nextComponents = storedConfig?.components ?? cloneComponents(initialComponents)

    setGradeSections(nextSections)
    setSavedGradeSections(cloneSections(nextSections))
    setGradeComponents(nextComponents)
    setSavedGradeComponents(cloneComponents(nextComponents))
    setVisibleComponentIds(getDefaultVisibleComponentIds(nextComponents))

    if (!storedConfig) {
      persistStoredGradeConfig(storageKey, {
        sections: nextSections,
        components: nextComponents,
      })
    }
  }, [initialComponents, initialSections, selectedGradingPeriod, selectedSubjectId, username])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSubjectId, selectedGradingPeriod, activeTab, rowsPerPage])

  useEffect(() => {
    if (!gradeDetailsState && !editGradesState && !isColumnSettingsOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      if (editGradesState) {
        setComponentManagerCategory(null)
        setComponentManagerDraftSections([])
        setComponentManagerDraftComponents([])
        setComponentManagerError('')
        setEditGradesState(null)
        return
      }

      if (gradeDetailsState) {
        setGradeDetailsState(null)
        return
      }

      if (isColumnSettingsOpen) {
        setIsColumnSettingsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editGradesState, gradeDetailsState, isColumnSettingsOpen])

  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null

  const subjectStudents = useMemo(() => {
    if (!selectedSubject) {
      return []
    }

    return [...students]
      .filter((student) => student.subjects.some((subject) => subject.id === selectedSubject.id))
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  }, [selectedSubject, students])

  const hasUnsavedChanges = useMemo(() => {
    const allOverrideKeys = new Set([
      ...Object.keys(draftScoreOverrides),
      ...Object.keys(savedScoreOverrides),
    ])

    const hasOverrideChanges = [...allOverrideKeys].some(
      (key) => (draftScoreOverrides[key] ?? null) !== (savedScoreOverrides[key] ?? null),
    )
    const hasConfigChanges =
      serializeSections(gradeSections) !== serializeSections(savedGradeSections) ||
      serializeComponents(gradeComponents) !== serializeComponents(savedGradeComponents)

    return hasOverrideChanges || hasConfigChanges
  }, [
    draftScoreOverrides,
    gradeComponents,
    gradeSections,
    savedGradeComponents,
    savedGradeSections,
    savedScoreOverrides,
  ])

  const latestHistoryByStudentKey = useMemo(() => {
    const historyMap = new Map<string, GradeHistoryEntry>()

    for (const entry of historyEntries) {
      if (!entry.studentId) {
        continue
      }

      historyMap.set(
        getHistoryKey(entry.studentId, entry.subjectId, entry.gradingPeriod),
        entry,
      )
    }

    return historyMap
  }, [historyEntries])

  const gradeSnapshots = useMemo(
    () =>
      subjectStudents.map((student) =>
        buildStudentGradeSnapshot(
          student,
          selectedSubject,
          selectedGradingPeriod,
          gradeSections,
          gradeComponents,
          draftScoreOverrides,
        ),
      ),
    [
      draftScoreOverrides,
      gradeComponents,
      gradeSections,
      selectedGradingPeriod,
      selectedSubject,
      subjectStudents,
    ],
  )

  const totalPages = Math.max(1, Math.ceil(gradeSnapshots.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSnapshots = gradeSnapshots.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage,
  )
  const displayStart = gradeSnapshots.length ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0
  const displayEnd = Math.min(safeCurrentPage * rowsPerPage, gradeSnapshots.length)
  const periodLabel = getGradingPeriodLabel(selectedGradingPeriod)

  const gradeDetailsSnapshot =
    gradeDetailsState?.studentId
      ? gradeSnapshots.find((snapshot) => snapshot.student.id === gradeDetailsState.studentId) ??
        null
      : null

  const editSnapshot =
    editGradesState?.studentId
      ? gradeSnapshots.find((snapshot) => snapshot.student.id === editGradesState.studentId) ??
        null
      : null

  useEffect(() => {
    if (!editSnapshot) {
      return
    }

    setEditDraftSections(cloneSections(gradeSections))
    setEditDraftComponents(cloneComponents(gradeComponents))

    const nextDraftValues: Record<string, string> = {}

    for (const component of gradeComponents.filter((currentComponent) => currentComponent.isActive)) {
      const section = editSnapshot.categories
        .flatMap((category) => category.sections)
        .find((currentSection) => currentSection.id === component.sectionId)
      const currentComponent = section?.components.find(
        (currentSnapshotComponent) => currentSnapshotComponent.id === component.id,
      )

      nextDraftValues[component.id] =
        currentComponent?.score === null || currentComponent?.score === undefined
          ? ''
          : formatScore(currentComponent.score, 2)
    }

    setEditDraftValues(nextDraftValues)
  }, [editSnapshot, gradeComponents, gradeSections])

  const alerts = [errorMessage, bindingMessage, successMessage].filter(Boolean)
  const breakdownRequestRows = pendingRequests.filter(
    (request) => request.localStatus.toUpperCase() === 'PENDING',
  )

  function openGradeDetails(studentId: string) {
    setEditGradesState(null)
    setGradeDetailsState({ studentId })
  }

  function closeGradeDetails() {
    setGradeDetailsState(null)
  }

  function openEditGrades(studentId: string) {
    setGradeDetailsState(null)
    setEditGradesState({ studentId })
  }

  function closeEditGrades() {
    setComponentManagerCategory(null)
    setComponentManagerDraftSections([])
    setComponentManagerDraftComponents([])
    setComponentManagerError('')
    setEditGradesState(null)
  }

  function handleColumnVisibilityChange(componentId: string) {
    setVisibleComponentIds((current) =>
      current.includes(componentId)
        ? current.filter((currentId) => currentId !== componentId)
        : [...current, componentId],
    )
  }

  function handleEditInputChange(componentId: string, event: ChangeEvent<HTMLInputElement>) {
    setEditDraftValues((current) => ({
      ...current,
      [componentId]: event.target.value,
    }))
  }

  function hasStoredScoresForComponentIds(componentIds: string[]) {
    const componentIdSet = new Set(componentIds)

    return [...Object.keys(draftScoreOverrides), ...Object.keys(savedScoreOverrides)].some((key) => {
      const [, , , componentId] = key.split('::')
      return componentIdSet.has(componentId)
    })
  }

  function handleManagerSectionLabelChange(
    sectionId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextLabel = event.target.value

    setComponentManagerDraftSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, label: nextLabel } : section)),
    )
    setComponentManagerDraftComponents((current) =>
      current.map((component) => {
        const section = componentManagerDraftSections.find((currentSection) => currentSection.id === sectionId)

        if (!section || section.category !== 'attitude' || component.sectionId !== sectionId) {
          return component
        }

        return { ...component, label: nextLabel }
      }),
    )
  }

  function handleManagerSectionWeightChange(
    sectionId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const parsedValue = parseNumericValue(event.target.value)

    setComponentManagerDraftSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, weight: parsedValue === null ? 0 : parsedValue } : section,
      ),
    )
  }

  function handleManagerDraftLabelChange(
    componentId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setComponentManagerDraftComponents((current) =>
      current.map((component) =>
        component.id === componentId ? { ...component, label: event.target.value } : component,
      ),
    )
  }

  function handleMoveManagerSection(sectionId: string, direction: -1 | 1) {
    setComponentManagerDraftSections((current) => {
      const section = current.find((candidate) => candidate.id === sectionId)

      if (!section) {
        return current
      }

      const activeSections = current
        .filter((candidate) => candidate.category === section.category && candidate.isActive)
        .sort((left, right) => left.order - right.order)
      const currentIndex = activeSections.findIndex((candidate) => candidate.id === sectionId)
      const nextIndex = currentIndex + direction

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= activeSections.length) {
        return current
      }

      const reordered = [...activeSections]
      const [moved] = reordered.splice(currentIndex, 1)
      reordered.splice(nextIndex, 0, moved)
      const nextSections = cloneSections(current)

      reordered.forEach((currentSection, index) => {
        const match = nextSections.find((candidate) => candidate.id === currentSection.id)

        if (match) {
          match.order = index + 1
        }
      })

      return nextSections
    })
  }

  function handleMoveManagerDraftComponent(componentId: string, direction: -1 | 1) {
    setComponentManagerDraftComponents((current) => {
      const component = current.find((candidate) => candidate.id === componentId)

      if (!component) {
        return current
      }

      const activeComponents = getSectionComponentList(current, component.sectionId)
      const currentIndex = activeComponents.findIndex((candidate) => candidate.id === componentId)
      const nextIndex = currentIndex + direction

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= activeComponents.length) {
        return current
      }

      const reordered = [...activeComponents]
      const [moved] = reordered.splice(currentIndex, 1)
      reordered.splice(nextIndex, 0, moved)
      const nextComponents = cloneComponents(current)

      reordered.forEach((currentComponent, index) => {
        const match = nextComponents.find((candidate) => candidate.id === currentComponent.id)

        if (match) {
          match.order = index + 1
        }
      })

      return nextComponents
    })
  }

  function handleAddManagerSection(category: GradeCategoryKey) {
    if (category === 'skills') {
      return
    }

    const activeCount = componentManagerDraftSections.filter(
      (section) => section.category === category && section.isActive,
    ).length
    const nextSection = createCustomSection(category, activeCount + 1)

    setComponentManagerDraftSections((current) => [...current, nextSection])

    if (category === 'knowledge') {
      setComponentManagerDraftComponents((current) => [
        ...current,
        createCustomComponent(nextSection.id, 'Assessment 1', 1),
      ])
      return
    }

    setComponentManagerDraftComponents((current) => [...current, createLinkedSingleComponent(nextSection)])
  }

  function handleAddManagerDraftComponent(sectionId: GradeSectionKey) {
    setComponentManagerDraftComponents((current) => {
      const nextLabel = getNextCustomLabel(
        sectionId,
        componentManagerDraftSections,
        current,
      )
      const nextOrder = getSectionComponentList(current, sectionId).length + 1

      return [...current, createCustomComponent(sectionId, nextLabel, nextOrder)]
    })
  }

  function handleRemoveManagerSection(sectionId: string) {
    const componentIds = componentManagerDraftComponents
      .filter((component) => component.sectionId === sectionId && component.isActive)
      .map((component) => component.id)

    if (
      componentIds.length &&
      hasStoredScoresForComponentIds(componentIds) &&
      !window.confirm(
        'This component already contains student scores. Removing it may affect grade calculations. Continue?',
      )
    ) {
      return
    }

    setComponentManagerDraftSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, isActive: false } : section)),
    )
    setComponentManagerDraftComponents((current) =>
      current.map((component) =>
        component.sectionId === sectionId ? { ...component, isActive: false } : component,
      ),
    )
  }

  function handleRemoveManagerDraftComponent(componentId: string) {
    if (
      hasStoredScoresForComponentIds([componentId]) &&
      !window.confirm(
        'This component already contains student scores. Removing it may affect grade calculations. Continue?',
      )
    ) {
      return
    }

    setComponentManagerDraftComponents((current) =>
      current.map((component) =>
        component.id === componentId ? { ...component, isActive: false } : component,
      ),
    )
  }

  function openComponentManager(category: Exclude<ComponentManagerCategory, null>) {
    setComponentManagerCategory(category)
    setComponentManagerDraftSections(cloneSections(editDraftSections))
    setComponentManagerDraftComponents(cloneComponents(editDraftComponents))
    setComponentManagerError('')
  }

  function closeComponentManager() {
    setComponentManagerCategory(null)
    setComponentManagerDraftSections([])
    setComponentManagerDraftComponents([])
    setComponentManagerError('')
  }

  function handleSaveComponentManager() {
    const cleanedSections = normalizeSectionOrders(
      componentManagerDraftSections.map((section, index) => ({
        ...section,
        label:
          section.label.trim() ||
          (section.category === 'knowledge'
            ? `Sub-grade ${index + 1}`
            : section.category === 'attitude'
              ? `Attitude ${index + 1}`
              : 'Skills Components'),
        weight: roundTo(section.weight, 2),
      })),
    )
    const cleanedComponents = normalizeComponentOrders(
      componentManagerDraftComponents.map((component) => ({
        ...component,
        label:
          component.label.trim() ||
          getNextCustomLabel(component.sectionId, cleanedSections, componentManagerDraftComponents),
      })),
      cleanedSections,
    )

    if (componentManagerCategory === 'knowledge' || componentManagerCategory === 'attitude') {
      const categoryTotal = roundTo(
        cleanedSections
          .filter(
            (section) => section.category === componentManagerCategory && section.isActive,
          )
          .reduce((sum, section) => sum + section.weight, 0),
        2,
      )
      const expectedTotal = getCategoryWeight(componentManagerCategory)

      if (categoryTotal !== expectedTotal) {
        setComponentManagerError(
          `${
            componentManagerCategory === 'knowledge' ? 'Knowledge' : 'Attitude'
          } sub-grades must total exactly ${expectedTotal}%.`,
        )
        return
      }
    }

    setEditDraftSections(cleanedSections)
    setEditDraftComponents(cleanedComponents)
    closeComponentManager()
  }

  function handleSaveEditedScores() {
    if (!editSnapshot || !selectedSubject) {
      return
    }

    const cleanedSections = normalizeSectionOrders(cloneSections(editDraftSections))
    const cleanedComponents = normalizeComponentOrders(
      editDraftComponents
      .map((component) => ({
        ...component,
        label:
          component.isCustom && !component.label.trim()
            ? getNextCustomLabel(component.sectionId, cleanedSections, editDraftComponents)
            : component.label.trim() || component.label,
      }))
      ,
      cleanedSections,
    )
    const nextOverrides = { ...draftScoreOverrides }

    for (const component of cleanedComponents.filter((currentComponent) => currentComponent.isActive)) {
      const parsedValue = parseNumericValue(editDraftValues[component.id] ?? '')

      if (parsedValue === null) {
        continue
      }

      nextOverrides[
        getScoreOverrideKey(
          editSnapshot.student.id,
          selectedSubject.id,
          selectedGradingPeriod,
          component.id,
        )
      ] = roundTo(clampNumber(parsedValue, 0, 100), 2)
    }

    setDraftScoreOverrides(nextOverrides)
    setGradeSections(cleanedSections)
    setGradeComponents(cleanedComponents)
    setVisibleComponentIds((current) =>
      syncVisibleComponentIds(gradeComponents, cleanedComponents, current),
    )
    setHistoryEntries((current) => [
      {
        id: `${Date.now()}-edit`,
        studentId: editSnapshot.student.id,
        studentName: editSnapshot.student.fullName,
        subjectId: selectedSubject.id,
        subjectLabel: selectedSubject.label,
        gradingPeriod: selectedGradingPeriod,
        action: 'Updated score breakdown',
        actor: username || 'Instructor',
        timestamp: new Date().toISOString(),
        note: `Updated ${periodLabel.toLowerCase()} scores for ${editSnapshot.student.fullName}.`,
      },
      ...current,
    ])
    setSuccessMessage(
      `${editSnapshot.student.fullName}'s ${periodLabel.toLowerCase()} score breakdown was updated locally.`,
    )
    closeEditGrades()
  }

  function handleSaveChanges() {
    if (!selectedSubject) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    window.setTimeout(() => {
      const storageKey = getGradeConfigStorageKey(
        username,
        selectedSubject.id,
        selectedGradingPeriod,
      )

      persistStoredGradeConfig(storageKey, {
        sections: gradeSections,
        components: gradeComponents,
      })

      setSavedScoreOverrides(draftScoreOverrides)
      setSavedGradeSections(cloneSections(gradeSections))
      setSavedGradeComponents(cloneComponents(gradeComponents))
      setHistoryEntries((current) => [
        {
          id: `${Date.now()}-save`,
          studentId: '',
          studentName: 'Multiple students',
          subjectId: selectedSubject.id,
          subjectLabel: selectedSubject.label,
          gradingPeriod: selectedGradingPeriod,
          action: 'Saved draft scores',
          actor: username || 'Instructor',
          timestamp: new Date().toISOString(),
          note: `Saved ${periodLabel.toLowerCase()} gradebook changes for ${selectedSubject.label}.`,
        },
        ...current,
      ])
      setSuccessMessage(
        `${selectedSubject.label} ${periodLabel.toLowerCase()} gradebook changes were saved locally.`,
      )
      setIsSaving(false)
    }, 300)
  }

  function handleImportTrigger() {
    fileInputRef.current?.click()
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!selectedSubject) {
      setErrorMessage('Select a subject before importing grades.')
      event.target.value = ''
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Only CSV imports are supported in this workspace right now.')
      event.target.value = ''
      return
    }

    try {
      const rawText = await selectedFile.text()
      const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        throw new Error('The CSV file must include a header row and at least one student row.')
      }

      const headers = parseCsvLine(lines[0]).map(normalizeCsvHeader)
      const studentIdIndex = headers.findIndex((header) => header === 'student id')

      if (studentIdIndex === -1) {
        throw new Error('The CSV file must include a "Student ID" column.')
      }

      const headerComponentMap = new Map<string, GradeComponentConfig>()

      for (const component of gradeComponents.filter((currentComponent) => currentComponent.isActive)) {
        for (const alias of getCsvHeaderAliases(component, selectedGradingPeriod)) {
          headerComponentMap.set(alias, component)
        }
      }

      const nextOverrides = { ...draftScoreOverrides }
      let updatedCount = 0

      for (const line of lines.slice(1)) {
        const row = parseCsvLine(line)
        const studentId = row[studentIdIndex]?.trim()

        if (!studentId) {
          continue
        }

        const student = subjectStudents.find(
          (currentStudent) => currentStudent.studentId.trim() === studentId,
        )

        if (!student) {
          continue
        }

        headers.forEach((header, index) => {
          const component = headerComponentMap.get(header)

          if (!component) {
            return
          }

          const parsedValue = parseNumericValue(row[index] ?? '')

          if (parsedValue === null) {
            return
          }

          nextOverrides[
            getScoreOverrideKey(student.id, selectedSubject.id, selectedGradingPeriod, component.id)
          ] = roundTo(clampNumber(parsedValue, 0, 100), 2)
          updatedCount += 1
        })
      }

      setDraftScoreOverrides(nextOverrides)
      setHistoryEntries((current) => [
        {
          id: `${Date.now()}-import`,
          studentId: '',
          studentName: 'Batch import',
          subjectId: selectedSubject.id,
          subjectLabel: selectedSubject.label,
          gradingPeriod: selectedGradingPeriod,
          action: 'Imported CSV scores',
          actor: username || 'Instructor',
          timestamp: new Date().toISOString(),
          note: `Imported ${updatedCount} component scores from ${selectedFile.name}.`,
        },
        ...current,
      ])
      setSuccessMessage(
        updatedCount
          ? `Imported ${updatedCount} component scores from ${selectedFile.name}.`
          : `No matching student/component rows were found in ${selectedFile.name}.`,
      )
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to import grades from CSV.',
      )
    } finally {
      event.target.value = ''
    }
  }

  function handleBreakdownRequestAction(requestId: string, nextStatus: 'APPROVED' | 'REJECTED') {
    setPendingRequests((current) =>
      current.map((request) =>
        request.requestId === requestId
          ? {
              ...request,
              localStatus: nextStatus,
            }
          : request,
      ),
    )
    setHistoryEntries((current) => [
      {
        id: `${Date.now()}-${requestId}`,
        studentId: '',
        studentName: '',
        subjectId: selectedSubject?.id ?? '',
        subjectLabel: selectedSubject?.label ?? 'Selected subject',
        gradingPeriod: selectedGradingPeriod,
        action:
          nextStatus === 'APPROVED'
            ? 'Approved breakdown request'
            : 'Rejected breakdown request',
        actor: username || 'Instructor',
        timestamp: new Date().toISOString(),
        note: `${nextStatus === 'APPROVED' ? 'Approved' : 'Rejected'} grade breakdown request.`,
      },
      ...current,
    ])
    setSuccessMessage(
      nextStatus === 'APPROVED'
        ? 'The grade breakdown request was approved locally.'
        : 'The grade breakdown request was rejected locally.',
    )
  }

  return (
    <InstructorShell
      active="grades"
      schoolYearLabel={schoolYearLabel}
      semesterLabel={semesterLabel}
    >
      <section className="grades-page">
        {alerts.length ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            {alerts.map((message, index) => (
              <section key={`${message}-${index}`} className="dashboard-alert-row">
                <div className="dashboard-alert">{message}</div>
              </section>
            ))}
          </div>
        ) : null}

        <article className="instructor-panel grades-page-panel">
          <div className="grades-page-toolbar">
            <div className="grades-page-toolbar-filters">
              <label className="grades-filter-field">
                <span className="grades-filter-label">Select Subject</span>
                <select
                  value={selectedSubjectId}
                  onChange={(event) => setSelectedSubjectId(event.target.value)}
                  disabled={!subjects.length}
                >
                  {subjects.length ? (
                    subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No subjects available</option>
                  )}
                </select>
              </label>

              <label className="grades-filter-field grades-filter-field--period">
                <span className="grades-filter-label">Grading Period</span>
                <select
                  value={selectedGradingPeriod}
                  onChange={(event) =>
                    setSelectedGradingPeriod(event.target.value as GradingPeriodKey)
                  }
                >
                  {gradingPeriods.map((period) => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grades-page-toolbar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="grades-hidden-file-input"
                onChange={handleCsvImport}
              />
              <button
                type="button"
                className="grades-toolbar-button grades-toolbar-button--secondary"
                onClick={handleImportTrigger}
              >
                <UploadIcon />
                <span>Import from Excel</span>
              </button>
              <button
                type="button"
                className="grades-toolbar-button grades-toolbar-button--primary"
                onClick={handleSaveChanges}
                disabled={isSaving || !hasUnsavedChanges}
              >
                <SaveIcon />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          <div className="grades-page-tabs-row">
            <div className="grades-page-tabs" role="tablist" aria-label="Instructor grades sections">
              {(['gradebook', 'requests', 'history'] as GradebookTabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={
                    activeTab === tab ? 'grades-page-tab is-active' : 'grades-page-tab'
                  }
                  onClick={() => setActiveTab(tab)}
                >
                  {renderTabLabel(tab)}
                </button>
              ))}
            </div>

            <div className="grades-page-tab-actions">
              <button
                type="button"
                className="grades-tab-action-button"
                onClick={() => setIsColumnSettingsOpen(true)}
              >
                <SettingsIcon />
                <span>Column Settings</span>
              </button>

              <button
                type="button"
                className="grades-tab-action-button grades-tab-action-button--icon"
              >
                <MoreIcon />
              </button>
            </div>
          </div>

          {activeTab === 'gradebook' ? (
            <div className="grades-tab-panel">
              <div className="grades-table-shell">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--number">
                        No.
                      </th>
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--student">
                        <span>Student Name</span>
                        <small>Student ID</small>
                      </th>
                      {gradeCategories.map((category) => (
                        <th
                          key={category.key}
                          colSpan={2}
                          className={`grades-table-head-cell grades-table-head-cell--group grades-table-head-cell--${category.key}`}
                        >
                          {category.label} ({category.weight}%)
                        </th>
                      ))}
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--remarks">
                        Remarks
                      </th>
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--actions">
                        Actions
                      </th>
                    </tr>
                    <tr>
                      {gradeCategories.flatMap((category) => [
                        <th key={`${category.key}-total`} className="grades-table-subhead">
                          <span>Total</span>
                          <small>(100%)</small>
                        </th>,
                        <th key={`${category.key}-weighted`} className="grades-table-subhead">
                          <span>Weighted</span>
                          <small>({category.weight}%)</small>
                        </th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={10} className="grades-table-empty">
                          Loading gradebook...
                        </td>
                      </tr>
                    ) : paginatedSnapshots.length ? (
                      paginatedSnapshots.map((snapshot, index) => (
                        <tr key={snapshot.student.id}>
                          <td className="grades-table-number">
                            {(safeCurrentPage - 1) * rowsPerPage + index + 1}
                          </td>
                          <td className="grades-table-student">
                            <strong>{snapshot.student.fullName}</strong>
                            <span>{snapshot.student.studentId}</span>
                          </td>
                          {snapshot.categories.flatMap((category) => [
                            <td
                              key={`${snapshot.student.id}-${category.key}-total`}
                              className="grades-table-score"
                            >
                              {formatScoreOrPlaceholder(category.total, 2)}
                            </td>,
                            <td
                              key={`${snapshot.student.id}-${category.key}-weighted`}
                              className={`grades-table-score grades-table-score--weighted grades-table-score--${category.key}`}
                            >
                              {formatScoreOrPlaceholder(category.weighted, 2)}
                            </td>,
                          ])}
                          <td className="grades-table-remarks">
                            <span className={getRemarkClassName(snapshot.remarks)}>
                              {snapshot.remarks}
                            </span>
                          </td>
                          <td className="grades-table-actions">
                            <button
                              type="button"
                              className="icon-action-button"
                              onClick={() => openGradeDetails(snapshot.student.id)}
                              aria-label={`View ${snapshot.student.fullName} grade breakdown`}
                            >
                              <EyeIcon />
                            </button>
                            <button
                              type="button"
                              className="icon-action-button"
                              onClick={() => openEditGrades(snapshot.student.id)}
                              aria-label={`Edit ${snapshot.student.fullName} grades`}
                            >
                              <PencilIcon />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="grades-table-empty">
                          {selectedSubject
                            ? 'No students are currently enrolled in the selected subject.'
                            : 'No subjects are available for grade posting yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grades-table-footer">
                <p className="grades-table-footer-copy">
                  Showing {displayStart} to {displayEnd} of {gradeSnapshots.length} students
                </p>

                <div className="grades-pagination">
                  <button
                    type="button"
                    className="grades-pagination-button"
                    onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                    disabled={safeCurrentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(0, 5)
                    .map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={
                          pageNumber === safeCurrentPage
                            ? 'grades-pagination-page is-active'
                            : 'grades-pagination-page'
                        }
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}

                  <button
                    type="button"
                    className="grades-pagination-button"
                    onClick={() =>
                      setCurrentPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={safeCurrentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon />
                  </button>

                  <label className="grades-page-size-select">
                    <select
                      value={rowsPerPage}
                      onChange={(event) => setRowsPerPage(Number(event.target.value))}
                    >
                      {[10, 20, 50].map((value) => (
                        <option key={value} value={value}>
                          {value} / page
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'requests' ? (
            <div className="grades-tab-panel">
              <div className="grades-request-table">
                <div className="instructor-table-head table-layout--requests">
                  <span>Student</span>
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                <div className="dashboard-panel-content">
                  {isLoading ? (
                    <div className="dashboard-loading-block">
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                      <div className="dashboard-loading-row dashboard-loading-row--compact" />
                    </div>
                  ) : breakdownRequestRows.length ? (
                    breakdownRequestRows.map((request) => (
                      <div
                        key={request.requestId}
                        className="instructor-table-row table-layout--requests request-row"
                      >
                        <span className="course-title">{request.studentName}</span>
                        <span className="course-pill course-pill--compact">
                          {request.subjectCode}
                        </span>
                        <span className="request-status">{request.localStatus}</span>
                        <div className="request-actions">
                          <button
                            type="button"
                            className="request-action request-action--approve"
                            onClick={() =>
                              handleBreakdownRequestAction(request.requestId, 'APPROVED')
                            }
                          >
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="request-action request-action--reject"
                            onClick={() =>
                              handleBreakdownRequestAction(request.requestId, 'REJECTED')
                            }
                          >
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grades-empty-state">
                      No pending breakdown requests for the selected gradebook.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <div className="grades-tab-panel">
              {historyEntries.length ? (
                <div className="grade-history-list">
                  {historyEntries.map((entry) => (
                    <article key={entry.id} className="grade-history-card">
                      <div className="grade-history-card-head">
                        <strong>{entry.action}</strong>
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <p>{entry.note}</p>
                      <div className="grade-history-meta">
                        <span>{entry.subjectLabel}</span>
                        <span>{getGradingPeriodLabel(entry.gradingPeriod)}</span>
                        <span>{entry.actor}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grades-empty-state">
                  No grade history is available yet. Save or import scores to start a timeline.
                </div>
              )}
            </div>
          ) : null}
        </article>
      </section>

      {isColumnSettingsOpen ? (
        <div className="grade-modal-backdrop" onClick={() => setIsColumnSettingsOpen(false)}>
          <div
            className="grade-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grade-column-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grade-settings-modal-header">
              <div>
                <h2 id="grade-column-settings-title">Column Settings</h2>
                <p>Choose which nested assessments appear in the breakdown views.</p>
              </div>
              <button
                type="button"
                className="subject-modal-close"
                onClick={() => setIsColumnSettingsOpen(false)}
                aria-label="Close column settings"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grade-settings-modal-body">
              {gradeCategories.map((category) => (
                <section key={category.key} className="grade-settings-section">
                  <h3>
                    {category.label} ({category.weight}%)
                  </h3>
                  <div className="grade-settings-tree">
                    {gradeSections
                      .filter((section) => section.category === category.key && section.isActive)
                      .sort((left, right) => left.order - right.order)
                      .map((section) => (
                        <div key={section.id} className="grade-settings-group">
                          <div className="grade-settings-group-title">
                            {section.label} ({section.weight}%)
                          </div>
                          <div className="grade-settings-checkboxes">
                            {getSectionComponentList(gradeComponents, section.id).map((component) => (
                              <label key={component.id} className="grade-settings-checkbox">
                                <input
                                  type="checkbox"
                                  checked={visibleComponentIds.includes(component.id)}
                                  onChange={() => handleColumnVisibilityChange(component.id)}
                                />
                                <span>
                                  {getDisplayComponentLabel(component, selectedGradingPeriod)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="grade-settings-modal-footer">
              <button
                type="button"
                className="subject-detail-action"
                onClick={() => setVisibleComponentIds(getDefaultVisibleComponentIds(gradeComponents))}
              >
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                className="subject-detail-action subject-detail-action--solid"
                onClick={() => setIsColumnSettingsOpen(false)}
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {gradeDetailsSnapshot ? (
        <div className="grade-details-overlay" onClick={closeGradeDetails}>
          <div
            className="grade-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grade-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grade-details-header">
              <div className="student-grade-avatar" aria-hidden="true">
                <StudentAvatarIcon />
              </div>
              <div className="student-grade-header-copy">
                <h2 id="grade-details-title" className="student-grade-name">
                  {gradeDetailsSnapshot.student.fullName}
                </h2>
                <p className="student-grade-meta">
                  Student ID: {gradeDetailsSnapshot.student.studentId} • Section:{' '}
                  {gradeDetailsSnapshot.student.yearSection || 'Not available'}
                </p>
              </div>
              <button
                type="button"
                className="subject-modal-close"
                onClick={closeGradeDetails}
                aria-label="Close grade details"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grade-details-scroll">
              <div className="grade-details-body">
                <div className="grade-details-breakdown">
                  {gradeDetailsSnapshot.categories.map((category) => (
                    <section
                      key={category.key}
                      className={`grade-section grade-section--${category.key}`}
                    >
                      <header className="grade-section-title">
                        {category.label} ({category.weight}%)
                      </header>
                      <div className="grade-section-content">
                        {category.sections.map((section) => {
                          const visibleComponents = section.components.filter((component) =>
                            visibleComponentIds.includes(component.id),
                          )

                          return (
                            <div key={section.id} className="grade-subsection">
                              <div className="grade-subsection-header">
                                {section.label} ({section.weight}%)
                              </div>
                              <div className="grade-section-table-wrap">
                                <table className="grade-breakdown-table grade-breakdown-table--stacked">
                                  <tbody>
                                    {visibleComponents.length ? (
                                      visibleComponents.map((component) => (
                                        <tr key={component.id}>
                                          <th>{component.displayLabel}</th>
                                          <td>{formatScoreOrPlaceholder(component.score, 2)}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <th>Components</th>
                                        <td>Hidden by Column Settings.</td>
                                      </tr>
                                    )}
                                    <tr>
                                      <th>
                                        {section.aggregationType === 'average'
                                          ? 'Average'
                                          : 'Score'}
                                      </th>
                                      <td>{formatScoreOrPlaceholder(section.average, 2)}</td>
                                    </tr>
                                    <tr>
                                      <th>Contribution</th>
                                      <td>
                                        {section.contribution === null
                                          ? '--'
                                          : `${formatScore(section.contribution, 2)} / ${section.weight}`}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })}

                        <div className="grade-section-summary">
                          {category.label} Weighted = {formatScoreOrPlaceholder(category.weighted, 2)} /{' '}
                          {category.weight}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>

                <aside className="summary-card">
                  <h3 className="summary-title">Summary</h3>

                  <div className="summary-category-list">
                    {gradeDetailsSnapshot.categories.map((category) => (
                      <div key={category.key} className="summary-category-row">
                        <div className="summary-category-label">
                          <span className={getSummaryDotClassName(category.key)}></span>
                          <span>
                            {category.label} ({category.weight}%)
                          </span>
                        </div>
                        <strong>
                          {formatScoreOrPlaceholder(category.weighted, 2)} / {category.weight}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="summary-score-block">
                    <span className="summary-label">Remarks</span>
                    <span className={getRemarkClassName(gradeDetailsSnapshot.remarks)}>
                      {gradeDetailsSnapshot.remarks}
                    </span>
                  </div>

                  <div className="summary-updated-block">
                    <span className="summary-label">Last updated by</span>
                    {(() => {
                      const latestEntry = latestHistoryByStudentKey.get(
                        getHistoryKey(
                          gradeDetailsSnapshot.student.id,
                          selectedSubject?.id ?? '',
                          selectedGradingPeriod,
                        ),
                      )

                      return latestEntry ? (
                        <>
                          <strong>{latestEntry.actor}</strong>
                          <span>{formatTimestamp(latestEntry.timestamp)}</span>
                        </>
                      ) : (
                        <span>Not available</span>
                      )
                    })()}
                  </div>
                </aside>
              </div>
            </div>

            <div className="grade-details-footer">
              <button
                type="button"
                className="subject-detail-action"
                onClick={() => openEditGrades(gradeDetailsSnapshot.student.id)}
              >
                <PencilIcon />
                <span>Edit Scores</span>
              </button>
              <button
                type="button"
                className="subject-detail-action subject-detail-action--solid"
                onClick={closeGradeDetails}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editSnapshot ? (
        <div className="grade-modal-backdrop" onClick={closeEditGrades}>
          <div
            className="grade-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grade-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grade-settings-modal-header">
              <div>
                <h2 id="grade-edit-title">Edit Scores</h2>
                <p>
                  {editSnapshot.student.fullName} • {selectedSubject?.label ?? 'Selected subject'} •{' '}
                  {periodLabel}
                </p>
              </div>
              <button
                type="button"
                className="subject-modal-close"
                onClick={closeEditGrades}
                aria-label="Close edit scores"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grade-edit-modal-body">
              {gradeCategories.map((category) => (
                <section key={category.key} className="grade-edit-section">
                  <header
                    className={
                      `grade-category-header grade-category-header--${category.key}`
                    }
                  >
                    <span>
                      {category.label} ({category.weight}%)
                    </span>

                    <button
                      type="button"
                      className={`grade-category-edit-btn grade-category-edit-btn--${category.key}`}
                      onClick={() => openComponentManager(category.key)}
                      aria-haspopup="dialog"
                    >
                      <PencilIcon />
                      <span>Edit</span>
                    </button>
                  </header>

                  <div className="grade-edit-subsections">
                    {editDraftSections
                      .filter((section) => section.category === category.key && section.isActive)
                      .sort((left, right) => left.order - right.order)
                      .map((section) => {
                        const sectionComponents = getSectionComponentList(
                          editDraftComponents,
                          section.id,
                        )

                        return (
                          <div key={section.id} className="grade-edit-subsection">
                            {category.key !== 'skills' ? (
                              <div className="grade-edit-subsection-header">
                                <h4>
                                  {section.label} ({section.weight}%)
                                </h4>
                              </div>
                            ) : null}

                            <div className="grade-edit-entry-list">
                              {sectionComponents.map((component) => (
                                <div key={component.id} className="grade-edit-entry">
                                  <div className="grade-edit-entry-label">
                                    {getDisplayComponentLabel(component, selectedGradingPeriod)}
                                  </div>

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="grade-edit-score-input"
                                    value={editDraftValues[component.id] ?? ''}
                                    onChange={(event) =>
                                      handleEditInputChange(component.id, event)
                                    }
                                    placeholder="Score"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </section>
              ))}
            </div>

            <div className="grade-settings-modal-footer">
              <button
                type="button"
                className="subject-detail-action"
                onClick={closeEditGrades}
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="subject-detail-action subject-detail-action--solid"
                onClick={handleSaveEditedScores}
              >
                <span>Apply Scores</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editSnapshot && componentManagerCategory ? (
        <div className="grade-modal-backdrop" onClick={closeComponentManager}>
          <div
            className="component-manager-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="component-manager-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grade-settings-modal-header">
              <div>
                <h2 id="component-manager-title">
                  {componentManagerCategory === 'knowledge'
                    ? 'Edit Knowledge Breakdown'
                    : componentManagerCategory === 'skills'
                      ? 'Edit Skills Breakdown'
                      : 'Edit Attitude Breakdown'}
                </h2>
                <p>
                  {componentManagerCategory === 'knowledge'
                    ? 'Manage knowledge sub-grades, weights, and assessments.'
                    : componentManagerCategory === 'skills'
                      ? 'Manage the active skills included in the 40% skills category.'
                      : 'Manage attitude sub-grades and keep the total weight at 20%.'}
                </p>
              </div>
              <button
                type="button"
                className="subject-modal-close"
                onClick={closeComponentManager}
                aria-label="Close component manager"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="component-manager-body">
              {componentManagerDraftSections
                .filter((section) => section.category === componentManagerCategory && section.isActive)
                .sort((left, right) => left.order - right.order)
                .map((section) => {
                  const sectionComponents = getSectionComponentList(
                    componentManagerDraftComponents,
                    section.id,
                  )

                  return (
                    <section key={section.id} className="component-manager-section">
                      {componentManagerCategory === 'skills' ? (
                        <>
                          <div className="component-manager-list">
                            {sectionComponents.map((component) => (
                              <div key={component.id} className="component-manager-row">
                                <input
                                  type="text"
                                  className="component-manager-input"
                                  value={component.label}
                                  onChange={(event) =>
                                    handleManagerDraftLabelChange(component.id, event)
                                  }
                                  placeholder="Skill name"
                                />
                                <div className="component-manager-inline-actions">
                                  <button
                                    type="button"
                                    className="component-manager-move-btn"
                                    onClick={() => handleMoveManagerDraftComponent(component.id, -1)}
                                    aria-label={`Move ${component.label} up`}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    className="component-manager-move-btn"
                                    onClick={() => handleMoveManagerDraftComponent(component.id, 1)}
                                    aria-label={`Move ${component.label} down`}
                                  >
                                    Down
                                  </button>
                                  <button
                                    type="button"
                                    className="component-manager-remove-btn"
                                    onClick={() => handleRemoveManagerDraftComponent(component.id)}
                                    aria-label={`Remove ${component.label}`}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="add-grade-component-btn"
                            onClick={() => handleAddManagerDraftComponent(section.id)}
                          >
                            <PlusIcon />
                            <span>Add Skill</span>
                          </button>
                        </>
                      ) : (
                        <div className="component-manager-section-editor">
                          <div className="component-manager-section-row">
                            <input
                              type="text"
                              className="component-manager-input"
                              value={section.label}
                              onChange={(event) =>
                                handleManagerSectionLabelChange(section.id, event)
                              }
                              placeholder="Sub-grade name"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="component-manager-weight-input"
                              value={String(section.weight)}
                              onChange={(event) =>
                                handleManagerSectionWeightChange(section.id, event)
                              }
                              placeholder="%"
                            />
                            <div className="component-manager-inline-actions">
                              <button
                                type="button"
                                className="component-manager-move-btn"
                                onClick={() => handleMoveManagerSection(section.id, -1)}
                                aria-label={`Move ${section.label} up`}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className="component-manager-move-btn"
                                onClick={() => handleMoveManagerSection(section.id, 1)}
                                aria-label={`Move ${section.label} down`}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                className="component-manager-remove-btn"
                                onClick={() => handleRemoveManagerSection(section.id)}
                                aria-label={`Remove ${section.label}`}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>

                          {componentManagerCategory === 'knowledge' ? (
                            <>
                              <div className="component-manager-assessment-label">Assessments</div>
                              <div className="component-manager-list">
                                {sectionComponents.map((component) => (
                                  <div key={component.id} className="component-manager-row">
                                    <input
                                      type="text"
                                      className="component-manager-input"
                                      value={component.label}
                                      onChange={(event) =>
                                        handleManagerDraftLabelChange(component.id, event)
                                      }
                                      placeholder="Assessment name"
                                    />
                                    <div className="component-manager-inline-actions">
                                      <button
                                        type="button"
                                        className="component-manager-move-btn"
                                        onClick={() =>
                                          handleMoveManagerDraftComponent(component.id, -1)
                                        }
                                        aria-label={`Move ${component.label} up`}
                                      >
                                        Up
                                      </button>
                                      <button
                                        type="button"
                                        className="component-manager-move-btn"
                                        onClick={() =>
                                          handleMoveManagerDraftComponent(component.id, 1)
                                        }
                                        aria-label={`Move ${component.label} down`}
                                      >
                                        Down
                                      </button>
                                      <button
                                        type="button"
                                        className="component-manager-remove-btn"
                                        onClick={() => handleRemoveManagerDraftComponent(component.id)}
                                        aria-label={`Remove ${component.label}`}
                                      >
                                        <TrashIcon />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                className="add-grade-component-btn"
                                onClick={() => handleAddManagerDraftComponent(section.id)}
                              >
                                <PlusIcon />
                                <span>Add Assessment</span>
                              </button>
                            </>
                          ) : null}
                        </div>
                      )}
                    </section>
                  )
                })}
              {componentManagerCategory === 'knowledge' || componentManagerCategory === 'attitude' ? (
                <>
                  <button
                    type="button"
                    className="add-grade-component-btn"
                    onClick={() => handleAddManagerSection(componentManagerCategory)}
                  >
                    <PlusIcon />
                    <span>Add Sub-grade</span>
                  </button>
                  <div className="component-manager-total">
                    Total Weight:{' '}
                    {formatScore(
                      componentManagerDraftSections
                        .filter(
                          (section) =>
                            section.category === componentManagerCategory && section.isActive,
                        )
                        .reduce((sum, section) => sum + section.weight, 0),
                      2,
                    )}{' '}
                    / {getCategoryWeight(componentManagerCategory)}%
                  </div>
                </>
              ) : null}
              {componentManagerError ? (
                <p className="component-manager-error">{componentManagerError}</p>
              ) : null}
            </div>

            <div className="grade-settings-modal-footer">
              <button
                type="button"
                className="subject-detail-action"
                onClick={closeComponentManager}
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="subject-detail-action subject-detail-action--solid"
                onClick={handleSaveComponentManager}
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </InstructorShell>
  )
}
