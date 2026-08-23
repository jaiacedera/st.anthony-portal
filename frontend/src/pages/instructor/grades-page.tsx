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

type GradeComponent = {
  id: string
  label: string
  category: GradeCategoryKey
  weight: number
}

type GradeCategoryDefinition = {
  key: GradeCategoryKey
  label: string
  weight: number
}

type GradeCategorySnapshot = GradeCategoryDefinition & {
  components: Array<GradeComponent & { score: number }>
  total: number
  weighted: number
}

type StudentGradeSnapshot = {
  student: InstructorStudentRecord
  subject: InstructorRosterSubject | null
  categories: GradeCategorySnapshot[]
  finalScore: number
  rating: string
  remarks: string
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

const gradeComponents: GradeComponent[] = [
  { id: 'knowledge-exam', label: 'Exam', category: 'knowledge', weight: 40 },
  { id: 'knowledge-activity-1', label: 'Activity 1', category: 'knowledge', weight: 15 },
  { id: 'knowledge-activity-2', label: 'Activity 2', category: 'knowledge', weight: 15 },
  { id: 'knowledge-activity-3', label: 'Activity 3', category: 'knowledge', weight: 15 },
  { id: 'knowledge-activity-4', label: 'Activity 4', category: 'knowledge', weight: 15 },
  { id: 'skills-pda', label: 'PDA', category: 'skills', weight: 10 },
  { id: 'skills-ncra', label: 'NCRA', category: 'skills', weight: 10 },
  { id: 'skills-journal', label: 'Journal', category: 'skills', weight: 10 },
  { id: 'skills-role-play', label: 'Role Play', category: 'skills', weight: 10 },
  { id: 'skills-mcos', label: 'MCOS', category: 'skills', weight: 10 },
  { id: 'skills-case', label: 'Case', category: 'skills', weight: 10 },
  { id: 'skills-demonstration', label: 'Demonstration', category: 'skills', weight: 20 },
  { id: 'skills-return-demo', label: 'Return Demo', category: 'skills', weight: 20 },
  { id: 'attitude-paperworks', label: 'Paperworks', category: 'attitude', weight: 20 },
  { id: 'attitude-respect', label: 'Respect', category: 'attitude', weight: 20 },
  { id: 'attitude-participation', label: 'Participation', category: 'attitude', weight: 20 },
  { id: 'attitude-teamwork', label: 'Teamwork', category: 'attitude', weight: 20 },
  { id: 'attitude-professionalism', label: 'Professionalism', category: 'attitude', weight: 20 },
]

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
  const parsed = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatScore(value: number, decimals = 2) {
  return value.toFixed(decimals)
}

function formatWholeOrDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function toRating(score: number) {
  if (score >= 97) return '1.00'
  if (score >= 94) return '1.25'
  if (score >= 91) return '1.50'
  if (score >= 88) return '1.75'
  if (score >= 85) return '2.00'
  if (score >= 82) return '2.25'
  if (score >= 79) return '2.50'
  if (score >= 76) return '2.75'
  if (score >= 75) return '3.00'
  return '5.00'
}

function toRemarks(score: number) {
  if (!Number.isFinite(score)) {
    return 'INC'
  }

  return score >= 75 ? 'PASSED' : 'FAILED'
}

function getGradingPeriodLabel(gradingPeriod: GradingPeriodKey) {
  return gradingPeriods.find((period) => period.key === gradingPeriod)?.label ?? 'Midterm'
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

function getDefaultVisibleComponentIds() {
  return gradeComponents.map((component) => component.id)
}

function getComponentBaseScore(
  student: InstructorStudentRecord,
  subjectId: string,
  gradingPeriod: GradingPeriodKey,
  component: GradeComponent,
) {
  const seed = `${student.studentId}:${subjectId}:${gradingPeriod}:${component.id}`
  const hash = hashString(seed)
  const categoryOffset =
    component.category === 'knowledge'
      ? 0
      : component.category === 'skills'
        ? 2
        : -1
  const periodOffset = gradingPeriod === 'prelim' ? -3 : gradingPeriod === 'final' ? 3 : 0

  return clampNumber(58 + (hash % 35) + categoryOffset + periodOffset, 40, 100)
}

function buildStudentGradeSnapshot(
  student: InstructorStudentRecord,
  subject: InstructorRosterSubject | null,
  gradingPeriod: GradingPeriodKey,
  overrides: GradeOverrideMap,
): StudentGradeSnapshot {
  const currentSubjectGrade = student.subjects.find(
    (studentSubject) => studentSubject.id === subject?.id,
  )

  const categories = gradeCategories.map((category) => {
    const components = gradeComponents
      .filter((component) => component.category === category.key)
      .map((component) => {
        const overrideKey = getScoreOverrideKey(
          student.id,
          subject?.id ?? '',
          gradingPeriod,
          component.id,
        )
        const score =
          overrides[overrideKey] ??
          getComponentBaseScore(student, subject?.id ?? 'unassigned', gradingPeriod, component)

        return {
          ...component,
          score: roundTo(score, 2),
        }
      })

    const totalWeight = components.reduce((sum, component) => sum + component.weight, 0) || 1
    const total = roundTo(
      components.reduce((sum, component) => sum + component.score * component.weight, 0) /
        totalWeight,
      2,
    )

    return {
      ...category,
      components,
      total,
      weighted: 0,
    }
  })

  const rawWeightedScore = categories.reduce(
    (sum, category) => sum + (category.total * category.weight) / 100,
    0,
  )
  const existingFinalGrade =
    gradingPeriod === 'final'
      ? parseNumericValue(currentSubjectGrade?.finalGrade ?? '')
      : null
  const scaleFactor =
    existingFinalGrade && rawWeightedScore > 0 ? existingFinalGrade / rawWeightedScore : 1

  const normalizedCategories = categories.map((category) => ({
    ...category,
    weighted: roundTo((category.total * category.weight * scaleFactor) / 100, 2),
  }))

  const finalScore = roundTo(
    normalizedCategories.reduce((sum, category) => sum + category.weighted, 0),
    2,
  )

  return {
    student,
    subject,
    categories: normalizedCategories,
    finalScore,
    rating: toRating(finalScore),
    remarks: toRemarks(finalScore),
  }
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

export default function GradesPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [students, setStudents] = useState<InstructorStudentRecord[]>([])
  const [subjects, setSubjects] = useState<InstructorRosterSubject[]>([])
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
    getDefaultVisibleComponentIds(),
  )
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false)
  const [gradeDetailsState, setGradeDetailsState] = useState<GradeDetailsState>(null)
  const [editGradesState, setEditGradesState] = useState<EditGradesState>(null)
  const [draftScoreOverrides, setDraftScoreOverrides] = useState<GradeOverrideMap>({})
  const [savedScoreOverrides, setSavedScoreOverrides] = useState<GradeOverrideMap>({})
  const [editDraftValues, setEditDraftValues] = useState<Record<string, string>>({})

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

  const hasUnsavedChanges = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(draftScoreOverrides),
      ...Object.keys(savedScoreOverrides),
    ])

    for (const key of allKeys) {
      if ((draftScoreOverrides[key] ?? null) !== (savedScoreOverrides[key] ?? null)) {
        return true
      }
    }

    return false
  }, [draftScoreOverrides, savedScoreOverrides])

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

  const visibleComponentsByCategory = useMemo(() => {
    return gradeCategories.reduce<Record<GradeCategoryKey, GradeComponent[]>>(
      (result, category) => {
        result[category.key] = gradeComponents.filter(
          (component) =>
            component.category === category.key &&
            visibleComponentIds.includes(component.id),
        )

        return result
      },
      {
        knowledge: [],
        skills: [],
        attitude: [],
      },
    )
  }, [visibleComponentIds])

  const latestHistoryByStudentKey = useMemo(() => {
    const historyMap = new Map<string, GradeHistoryEntry>()

    for (const entry of historyEntries) {
      historyMap.set(
        getHistoryKey(entry.studentId, entry.subjectId, entry.gradingPeriod),
        entry,
      )
    }

    return historyMap
  }, [historyEntries])

  const gradeSnapshots = useMemo(() => {
    return subjectStudents.map((student) =>
      buildStudentGradeSnapshot(
        student,
        selectedSubject,
        selectedGradingPeriod,
        draftScoreOverrides,
      ),
    )
  }, [draftScoreOverrides, selectedGradingPeriod, selectedSubject, subjectStudents])

  const totalPages = Math.max(1, Math.ceil(gradeSnapshots.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSnapshots = gradeSnapshots.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage,
  )

  const gradeDetailsSnapshot =
    gradeDetailsState?.studentId
      ? gradeSnapshots.find((snapshot) => snapshot.student.id === gradeDetailsState.studentId) ??
        null
      : null

  const editSnapshot =
    editGradesState?.studentId
      ? gradeSnapshots.find((snapshot) => snapshot.student.id === editGradesState.studentId) ?? null
      : null

  useEffect(() => {
    if (!editSnapshot || !selectedSubject) {
      return
    }

    const nextDraftValues: Record<string, string> = {}

    for (const component of gradeComponents) {
      if (!visibleComponentIds.includes(component.id)) {
        continue
      }

      const category = editSnapshot.categories.find(
        (currentCategory) => currentCategory.key === component.category,
      )
      const currentComponent = category?.components.find(
        (currentCategoryComponent) => currentCategoryComponent.id === component.id,
      )

      if (!currentComponent) {
        continue
      }

      nextDraftValues[component.id] = formatScore(currentComponent.score, 2)
    }

    setEditDraftValues(nextDraftValues)
  }, [editSnapshot, selectedSubject, visibleComponentIds])

  const alerts = [errorMessage, bindingMessage, successMessage].filter(Boolean)

  const breakdownRequestRows = pendingRequests.filter(
    (request) => request.localStatus.toUpperCase() === 'PENDING',
  )

  const displayStart = gradeSnapshots.length ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0
  const displayEnd = Math.min(safeCurrentPage * rowsPerPage, gradeSnapshots.length)
  const periodLabel = getGradingPeriodLabel(selectedGradingPeriod)

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
    setEditGradesState(null)
  }

  function handleColumnVisibilityChange(componentId: string) {
    setVisibleComponentIds((current) =>
      current.includes(componentId)
        ? current.filter((currentComponentId) => currentComponentId !== componentId)
        : [...current, componentId],
    )
  }

  function handleEditInputChange(
    componentId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setEditDraftValues((current) => ({
      ...current,
      [componentId]: event.target.value,
    }))
  }

  function handleSaveEditedScores() {
    if (!editSnapshot || !selectedSubject) {
      return
    }

    const nextOverrides = { ...draftScoreOverrides }

    for (const [componentId, rawValue] of Object.entries(editDraftValues)) {
      const parsedValue = parseNumericValue(rawValue)

      if (parsedValue === null) {
        continue
      }

      nextOverrides[
        getScoreOverrideKey(
          editSnapshot.student.id,
          selectedSubject.id,
          selectedGradingPeriod,
          componentId,
        )
      ] = roundTo(clampNumber(parsedValue, 0, 100), 2)
    }

    setDraftScoreOverrides(nextOverrides)
    setSuccessMessage(
      `${editSnapshot.student.fullName}'s ${periodLabel.toLowerCase()} scores were updated locally.`,
    )
    setEditGradesState(null)
  }

  function handleSaveChanges() {
    if (!selectedSubject) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    window.setTimeout(() => {
      setSavedScoreOverrides(draftScoreOverrides)
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
        `${selectedSubject.label} ${periodLabel.toLowerCase()} scores were saved locally.`,
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

      const headerComponentMap = new Map<string, GradeComponent>()

      for (const component of gradeComponents) {
        headerComponentMap.set(normalizeCsvHeader(component.label), component)
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
        action: nextStatus === 'APPROVED' ? 'Approved breakdown request' : 'Rejected breakdown request',
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

              <button type="button" className="grades-tab-action-button grades-tab-action-button--icon">
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
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--score">
                        <span>{periodLabel} Final Score</span>
                        <small>(100%)</small>
                      </th>
                      <th rowSpan={2} className="grades-table-head-cell grades-table-head-cell--rating">
                        {periodLabel} Rating
                      </th>
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
                        <td colSpan={11} className="grades-table-empty">
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
                            <td key={`${snapshot.student.id}-${category.key}-total`} className="grades-table-score">
                              {formatScore(category.total, 2)}
                            </td>,
                            <td
                              key={`${snapshot.student.id}-${category.key}-weighted`}
                              className={`grades-table-score grades-table-score--weighted grades-table-score--${category.key}`}
                            >
                              {formatScore(category.weighted, 2)}
                            </td>,
                          ])}
                          <td className="grades-table-final-score">
                            {formatWholeOrDecimal(snapshot.finalScore)}
                          </td>
                          <td className="grades-table-rating">{snapshot.rating}</td>
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
                        <td colSpan={11} className="grades-table-empty">
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
                <p>Choose which assessment components appear in the grade breakdown and edit views.</p>
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
                  <div className="grade-settings-checkboxes">
                    {gradeComponents
                      .filter((component) => component.category === category.key)
                      .map((component) => (
                        <label key={component.id} className="grade-settings-checkbox">
                          <input
                            type="checkbox"
                            checked={visibleComponentIds.includes(component.id)}
                            onChange={() => handleColumnVisibilityChange(component.id)}
                          />
                          <span>{component.label}</span>
                        </label>
                      ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="grade-settings-modal-footer">
              <button
                type="button"
                className="subject-detail-action"
                onClick={() => setVisibleComponentIds(getDefaultVisibleComponentIds())}
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
                  {gradeDetailsSnapshot.categories.map((category) => {
                    const visibleComponents = visibleComponentsByCategory[category.key]
                    const latestEntry = latestHistoryByStudentKey.get(
                      getHistoryKey(
                        gradeDetailsSnapshot.student.id,
                        selectedSubject?.id ?? '',
                        selectedGradingPeriod,
                      ),
                    )

                    return (
                      <section
                        key={category.key}
                        className={`grade-section grade-section--${category.key}`}
                      >
                        <header className="grade-section-title">
                          {category.label} ({category.weight}%)
                        </header>
                        <div className="grade-section-table-wrap">
                          <table className="grade-breakdown-table">
                            <thead>
                              <tr>
                                <th>Component</th>
                                {visibleComponents.length ? (
                                  visibleComponents.map((component) => (
                                    <th key={component.id}>
                                      <span>{component.label}</span>
                                      <small>({component.weight}%)</small>
                                    </th>
                                  ))
                                ) : (
                                  <th>No visible components</th>
                                )}
                                <th>Total</th>
                                <th>Weighted</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Score</td>
                                {visibleComponents.length ? (
                                  visibleComponents.map((component) => {
                                    const currentComponent = category.components.find(
                                      (categoryComponent) => categoryComponent.id === component.id,
                                    )

                                    return (
                                      <td key={component.id}>
                                        {currentComponent
                                          ? formatScore(currentComponent.score, 2)
                                          : '-'}
                                      </td>
                                    )
                                  })
                                ) : (
                                  <td>Enable components from Column Settings.</td>
                                )}
                                <td>{formatScore(category.total, 2)}</td>
                                <td>{formatScore(category.weighted, 2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {category.key === 'attitude' ? (
                          <div className="grade-section-note">
                            {latestEntry
                              ? `Last updated by ${latestEntry.actor} on ${formatTimestamp(latestEntry.timestamp)}`
                              : 'Last updated information is not available yet.'}
                          </div>
                        ) : null}
                      </section>
                    )
                  })}
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
                          {formatScore(category.weighted, 2)} / {category.weight}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="summary-score-block">
                    <span className="summary-label">{periodLabel} Final Score</span>
                    <strong className="summary-value">
                      {formatWholeOrDecimal(gradeDetailsSnapshot.finalScore)} / 100
                    </strong>
                  </div>

                  <div className="summary-score-block">
                    <span className="summary-label">{periodLabel} Rating</span>
                    <strong className="summary-value">{gradeDetailsSnapshot.rating}</strong>
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
              {gradeCategories.map((category) => {
                const components = visibleComponentsByCategory[category.key]

                return (
                  <section key={category.key} className="grade-edit-section">
                    <header className={`grade-section-title grade-section-title--edit grade-section-title--${category.key}`}>
                      {category.label} ({category.weight}%)
                    </header>
                    <div className="grade-edit-grid">
                      {components.length ? (
                        components.map((component) => (
                          <label key={component.id} className="grade-edit-field">
                            <span>{component.label}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editDraftValues[component.id] ?? ''}
                              onChange={(event) => handleEditInputChange(component.id, event)}
                            />
                          </label>
                        ))
                      ) : (
                        <p className="grade-edit-empty">
                          No components are visible for this category. Update Column Settings first.
                        </p>
                      )}
                    </div>
                  </section>
                )
              })}
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
    </InstructorShell>
  )
}
