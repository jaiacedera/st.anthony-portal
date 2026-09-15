import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  createInstructorStudent,
  deleteInstructorStudent,
  fetchInstructorStudents,
  updateInstructorStudentEnrollment,
  type InstructorRosterSubject,
  type InstructorStudentRecord,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'
import './students-page.css'

type TabKey = 'all' | 'subject'

type EnrollmentDialogState = {
  action: 'add' | 'remove'
  studentId: string
} | null

type CreateStudentFormState = {
  email: string
  subjectIds: string[]
}

type DeleteDialogState = {
  studentId: string
} | null

function readStudentsPageIntent() {
  if (typeof window === 'undefined') {
    return {
      subjectId: '',
      openCreate: false,
    }
  }

  const params = new URLSearchParams(window.location.search)

  return {
    subjectId: params.get('subjectId')?.trim() ?? '',
    openCreate: params.get('open')?.trim().toLowerCase() === 'create',
  }
}

function createDefaultStudentForm(subjectIds: string[] = []): CreateStudentFormState {
  return {
    email: '',
    subjectIds,
  }
}

function StudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2M17 3a4 4 0 0 1 0 8M22 21v-2a7 7 0 0 0-4-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function StudentAddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.5 19a6 6 0 0 1 11 0" />
      <path d="M17 8v8" />
      <path d="M13 12h8" />
    </svg>
  )
}

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return 'NA'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function getAvatarTone(id: string) {
  return Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0) % 7
}

function PaginationChevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

function sortStudentsByName(records: InstructorStudentRecord[]) {
  return [...records].sort((left, right) => left.fullName.localeCompare(right.fullName))
}

function StudentDetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="student-detail-row">
      <span className="student-detail-label">{label}</span>
      <span className="student-detail-value">{value}</span>
    </div>
  )
}

export default function StudentsPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const pageIntent = readStudentsPageIntent()
  const [students, setStudents] = useState<InstructorStudentRecord[]>([])
  const [subjects, setSubjects] = useState<InstructorRosterSubject[]>([])
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewportCapacity, setViewportCapacity] = useState(50)
  const tableBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const body = tableBodyRef.current
    if (!body) return

    const updateCapacity = () => {
      const rowHeight = Number.parseFloat(getComputedStyle(body).getPropertyValue('--roster-row-height'))
      const capacity = rowHeight ? Math.max(1, Math.floor(body.clientHeight / rowHeight)) : 50
      setViewportCapacity(capacity)
    }
    const observer = new ResizeObserver(updateCapacity)
    observer.observe(body)
    window.addEventListener('resize', updateCapacity)
    updateCapacity()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateCapacity)
    }
  }, [])
  const [activeTab, setActiveTab] = useState<TabKey>(pageIntent.subjectId ? 'subject' : 'all')
  const [selectedSubjectId, setSelectedSubjectId] = useState(pageIntent.subjectId)
  const [schoolYearLabel, setSchoolYearLabel] = useState('Not set')
  const [semesterLabel, setSemesterLabel] = useState('Not set')
  const [isLoading, setIsLoading] = useState(Boolean(username))
  const [isUpdatingEnrollment, setIsUpdatingEnrollment] = useState(false)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [isDeletingStudent, setIsDeletingStudent] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    username ? '' : 'No instructor session was found. Please sign in again.',
  )
  const [bindingMessage, setBindingMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [viewStudentId, setViewStudentId] = useState('')
  const [openMenuStudentId, setOpenMenuStudentId] = useState('')
  const [enrollmentDialog, setEnrollmentDialog] = useState<EnrollmentDialogState>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false)
  const [createStudentForm, setCreateStudentForm] = useState<CreateStudentFormState>(
    createDefaultStudentForm(),
  )
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false)
  const [subjectSearchValue, setSubjectSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)
  const deferredSubjectSearchValue = useDeferredValue(subjectSearchValue)
  const subjectPickerRef = useRef<HTMLDivElement | null>(null)
  const hasAppliedPageIntentRef = useRef(false)

  const applyStudentsPayload = useCallback((payload: Awaited<ReturnType<typeof fetchInstructorStudents>>) => {
    setStudents(payload.students)
    setSubjects(payload.subjects)
    setSchoolYearLabel(payload.header.schoolYear)
    setSemesterLabel(payload.header.semester)
    setBindingMessage(payload.needsBinding ? payload.message ?? '' : '')
    setSelectedSubjectId((current) =>
      payload.subjects.some((subject) => subject.id === current)
        ? current
        : '',
    )
    setCreateStudentForm((current) => ({
      ...current,
      subjectIds: current.subjectIds.filter((subjectId) =>
        payload.subjects.some((subject) => subject.id === subjectId),
      ).length
        ? current.subjectIds.filter((subjectId) =>
            payload.subjects.some((subject) => subject.id === subjectId),
          )
        : payload.subjects[0]
          ? [payload.subjects[0].id]
          : [],
    }))
    if (!hasAppliedPageIntentRef.current && payload.subjects.length) {
      const requestedSubject = pageIntent.subjectId
        ? payload.subjects.find((subject) => subject.id === pageIntent.subjectId) ?? null
        : null

      if (requestedSubject) {
        setSelectedSubjectId(requestedSubject.id)
        setActiveTab('subject')

        if (pageIntent.openCreate) {
          setIsCreateStudentOpen(true)
          setSubjectPickerOpen(false)
          setSubjectSearchValue('')
          setCreateStudentForm(createDefaultStudentForm([requestedSubject.id]))
        }
      }

      hasAppliedPageIntentRef.current = true
    }
  }, [pageIntent.openCreate, pageIntent.subjectId])

  const loadStudents = useCallback(async (signal?: AbortSignal) => {
    const payload = await fetchInstructorStudents(username, signal)

    if (signal?.aborted) {
      return
    }

    applyStudentsPayload(payload)
  }, [applyStudentsPayload, username])

  useEffect(() => {
    if (!username) {
      return undefined
    }

    const abortController = new AbortController()

    Promise.resolve()
      .then(async () => {
        if (abortController.signal.aborted) {
          return
        }

        setIsLoading(true)
        setErrorMessage('')
        setBindingMessage('')

        const payload = await fetchInstructorStudents(username, abortController.signal)

        if (abortController.signal.aborted) {
          return
        }

        applyStudentsPayload(payload)
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor student data.',
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
  }, [applyStudentsPayload, username])

  useEffect(() => {
    if (!openMenuStudentId) {
      return undefined
    }

    function handleDocumentClick() {
      setOpenMenuStudentId('')
    }

    document.addEventListener('click', handleDocumentClick)

    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [openMenuStudentId])

  useEffect(() => {
    if (!viewStudentId && !enrollmentDialog && !deleteDialog && !isCreateStudentOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && subjectPickerOpen) {
        setSubjectPickerOpen(false)
        return
      }

      if (event.key === 'Escape' && !isUpdatingEnrollment && !isCreatingStudent && !isDeletingStudent) {
        setViewStudentId('')
        setEnrollmentDialog(null)
        setDeleteDialog(null)
        setIsCreateStudentOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    deleteDialog,
    enrollmentDialog,
    isCreateStudentOpen,
    isCreatingStudent,
    isDeletingStudent,
    isUpdatingEnrollment,
    subjectPickerOpen,
    viewStudentId,
  ])

  useEffect(() => {
    if (!isCreateStudentOpen || !subjectPickerOpen) {
      return undefined
    }

    function handlePointerDown(event: MouseEvent) {
      if (!subjectPickerRef.current?.contains(event.target as Node)) {
        setSubjectPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isCreateStudentOpen, subjectPickerOpen])

  const filteredStudents = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase()

    return students.filter((student) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          student.fullName,
          student.studentId,
          student.email,
          student.yearSection,
          ...student.subjects.map((subject) => subject.label),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      const matchesSubject =
        !selectedSubjectId ||
        student.subjects.some((subject) => subject.id === selectedSubjectId)

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enrolled' ? student.subjectCount > 0 : student.subjectCount === 0)
      return matchesQuery && matchesSubject && matchesStatus
    })
  }, [deferredSearchValue, selectedSubjectId, statusFilter, students])

  const effectivePageSize = Math.min(pageSize, viewportCapacity)
  const pageSizeOptions = [...new Set([Math.min(10, viewportCapacity), 10, 25, 50])]
    .filter(size => size <= viewportCapacity)
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / effectivePageSize))
  const currentPage = Math.min(page, pageCount)
  const pageOffset = (currentPage - 1) * effectivePageSize
  const visibleStudents = filteredStudents.slice(pageOffset, pageOffset + effectivePageSize)
  const firstVisiblePage = Math.max(1, Math.min(currentPage - 2, pageCount - 5))
  const pageNumbers = Array.from(
    { length: Math.min(6, pageCount) },
    (_, index) => firstVisiblePage + index,
  )

  const viewedStudent =
    students.find((student) => student.id === viewStudentId) ?? null

  const enrollmentStudent =
    students.find((student) => student.id === enrollmentDialog?.studentId) ?? null
  const deleteStudentRecord =
    students.find((student) => student.id === deleteDialog?.studentId) ?? null

  const enrollmentSubjectChoices = useMemo(() => {
    if (!enrollmentDialog || !enrollmentStudent) {
      return []
    }

    if (enrollmentDialog.action === 'add') {
      return subjects.filter(
        (subject) =>
          !enrollmentStudent.subjects.some(
            (studentSubject) => studentSubject.id === subject.id,
          ),
      )
    }

    return subjects.filter((subject) =>
      enrollmentStudent.subjects.some(
        (studentSubject) => studentSubject.id === subject.id,
      ),
    )
  }, [enrollmentDialog, enrollmentStudent, subjects])

  const alerts = [errorMessage, bindingMessage, successMessage].filter(Boolean)

  const filteredCreateSubjects = useMemo(() => {
    const normalizedSearch = deferredSubjectSearchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return subjects
    }

    return subjects.filter((subject) =>
      subject.label.toLowerCase().includes(normalizedSearch),
    )
  }, [deferredSubjectSearchValue, subjects])

  const selectedCreateSubjects = useMemo(
    () =>
      subjects.filter((subject) => createStudentForm.subjectIds.includes(subject.id)),
    [createStudentForm.subjectIds, subjects],
  )

  function openCreateStudentDialog() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsCreateStudentOpen(true)
    setSubjectPickerOpen(false)
    setSubjectSearchValue('')
    setCreateStudentForm(
      createDefaultStudentForm(
        selectedSubjectId
          ? [selectedSubjectId]
          : subjects[0]
            ? [subjects[0].id]
            : [],
      ),
    )
  }

  function closeCreateStudentDialog() {
    setIsCreateStudentOpen(false)
    setSubjectPickerOpen(false)
    setSubjectSearchValue('')
    setCreateStudentForm(
      createDefaultStudentForm(
        selectedSubjectId
          ? [selectedSubjectId]
          : subjects[0]
            ? [subjects[0].id]
            : [],
      ),
    )
  }

  async function handleEnrollmentUpdate(subjectId: string) {
    if (!enrollmentDialog || !enrollmentStudent) {
      return
    }

    setIsUpdatingEnrollment(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await updateInstructorStudentEnrollment({
        username,
        action: enrollmentDialog.action,
        studentId: enrollmentStudent.id,
        subjectId,
      })

      await loadStudents()
      setEnrollmentDialog(null)
      setSuccessMessage(payload.message ?? 'Student enrollment updated successfully.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update student enrollment.',
      )
    } finally {
      setIsUpdatingEnrollment(false)
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsCreatingStudent(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await createInstructorStudent({
        username,
        ...createStudentForm,
      })

      if (payload.student) {
        setStudents((current) =>
          sortStudentsByName([
            ...current.filter((student) => student.id !== payload.student?.id),
            payload.student as InstructorStudentRecord,
          ]),
        )
      } else {
        await loadStudents()
      }

      setSelectedSubjectId(createStudentForm.subjectIds[0] ?? '')
      setActiveTab(createStudentForm.subjectIds.length ? 'subject' : 'all')
      setIsCreateStudentOpen(false)
      setSubjectPickerOpen(false)
      setSubjectSearchValue('')
      setCreateStudentForm(createDefaultStudentForm(createStudentForm.subjectIds))
      setSuccessMessage(payload.message ?? 'Student created successfully.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create student.',
      )
    } finally {
      setIsCreatingStudent(false)
    }
  }

  function toggleCreateStudentSubject(subjectId: string) {
    setCreateStudentForm((current) => ({
      ...current,
      subjectIds: current.subjectIds.includes(subjectId)
        ? current.subjectIds.filter((currentId) => currentId !== subjectId)
        : [...current.subjectIds, subjectId],
    }))
  }

  async function handleDeleteStudent() {
    if (!deleteDialog) {
      return
    }

    setIsDeletingStudent(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await deleteInstructorStudent({
        username,
        studentId: deleteDialog.studentId,
      })

      await loadStudents()
      setDeleteDialog(null)
      setViewStudentId('')
      setSuccessMessage(payload.message ?? 'Student account deleted successfully.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete student account.',
      )
    } finally {
      setIsDeletingStudent(false)
    }
  }

  function renderStudentTableRow(student: InstructorStudentRecord, index: number) {
    const canAddToSubject = student.subjects.length < subjects.length
    const canRemoveFromSubject = student.subjects.length > 0

    return (
      <div key={student.id} className="instructor-table-row table-layout--students student-roster-row">
        <span>{pageOffset + index + 1}</span>
        <div className="student-name-cell">
          <span className={`student-avatar student-avatar--${getAvatarTone(student.id)}`} aria-hidden="true">{getInitials(student.fullName)}</span>
          <div className="student-name-copy">
            <strong title={student.fullName}>{student.fullName}</strong>
            <span>{student.studentId}</span>
          </div>
        </div>

        <span className="student-email-cell" title={student.email}>{student.email}</span>
        <span className="student-enrollment-cell">{countLabel(student.subjectCount, 'subject')}</span>
        <span className={student.subjectCount ? 'roster-status' : 'roster-status roster-status--neutral'}>{student.subjectCount ? 'Enrolled' : 'Not enrolled'}</span>

        <div className="table-actions student-table-actions">
          <button
            type="button"
            className="icon-action-button student-action-button"
            onClick={() => {
              setOpenMenuStudentId('')
              setViewStudentId(student.id)
            }}
            aria-label={`View ${student.fullName}`}
          >
            <EyeIcon />
          </button>

          <div
            className="student-action-menu-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="icon-action-button student-action-button"
              onClick={(event) => {
                event.stopPropagation()
                setOpenMenuStudentId((current) =>
                  current === student.id ? '' : student.id,
                )
              }}
              aria-label={`More actions for ${student.fullName}`}
              aria-expanded={openMenuStudentId === student.id}
            >
              <MoreIcon />
            </button>

            {openMenuStudentId === student.id ? (
              <div className="student-action-menu">
                <button
                  type="button"
                  className="student-action-menu-item"
                  disabled={!canAddToSubject}
                  onClick={() => {
                    setOpenMenuStudentId('')
                    setEnrollmentDialog({
                      action: 'add',
                      studentId: student.id,
                    })
                  }}
                >
                  Add to Subject
                </button>
                <button
                  type="button"
                  className="student-action-menu-item"
                  disabled={!canRemoveFromSubject}
                  onClick={() => {
                    setOpenMenuStudentId('')
                    setEnrollmentDialog({
                      action: 'remove',
                      studentId: student.id,
                    })
                  }}
                >
                  Remove from Subject
                </button>
                <button
                  type="button"
                  className="student-action-menu-item student-action-menu-item--danger"
                  onClick={() => {
                    setOpenMenuStudentId('')
                    setDeleteDialog({
                      studentId: student.id,
                    })
                  }}
                >
                  Delete Student
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <InstructorShell
      active="students"
      schoolYearLabel={schoolYearLabel}
      semesterLabel={semesterLabel}
      searchValue={searchValue}
      onSearchChange={value => { setSearchValue(value); setPage(1) }}
    >
      <section className="students-page students-page-content roster-page">
          <header className="students-page-heading">
            <span className="students-heading-icon" aria-hidden="true"><StudentsIcon /></span>
            <h1>Student Management</h1>
          </header>

          {alerts.length ? (
            <div className="dashboard-alert-stack student-alert-stack" aria-live="polite">
              {alerts.map((message, index) => (
                <section key={`${message}-${index}`} className="dashboard-alert-row">
                  <div className="dashboard-alert">{message}</div>
                </section>
              ))}
            </div>
          ) : null}

          <div className="students-management-toolbar">
            <div className="student-tab-list" role="group" aria-label="Student roster views">
              <button
                type="button"
                className={activeTab === 'all' ? 'student-tab is-active' : 'student-tab'}
                onClick={() => { setActiveTab('all'); setSelectedSubjectId(''); setPage(1) }}
                aria-pressed={activeTab === 'all'}
              >
                All Students
              </button>
              <button
                type="button"
                className={activeTab === 'subject' ? 'student-tab is-active' : 'student-tab'}
                onClick={() => { setActiveTab('subject'); setSelectedSubjectId(subjects[0]?.id ?? ''); setPage(1) }}
                aria-pressed={activeTab === 'subject'}
              >
                By Subject
              </button>
            </div>
          </div>
        <article className="instructor-panel students-management-card">
            <div className="students-filter-bar">
              <label className="students-search-field">
                <span className="students-search-icon" aria-hidden="true"><SearchIcon /></span>
                <input type="search" aria-label="Search student name or email" value={searchValue} onChange={event => { setSearchValue(event.target.value); setPage(1) }} placeholder="Search student name or email..." />
              </label>
                <label className="roster-select-field">
                  <span>Select Subject</span>
                  <select
                    aria-label="Select subject"
                    value={selectedSubjectId}
                    onChange={(event) => {
                      setSelectedSubjectId(event.target.value)
                      setActiveTab(event.target.value ? 'subject' : 'all')
                      setPage(1)
                    }}
                  >
                    <option value="">All Subjects</option>
                    {
                      subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.label}
                        </option>
                      ))
                    }
                  </select>
                </label>
              <label className="roster-select-field roster-select-status">
                <span>Status</span>
                <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}>
                  <option value="all">All Students</option><option value="enrolled">Enrolled</option><option value="not-enrolled">Not enrolled</option>
                </select>
              </label>

              <button
                type="button"
                className="subjects-primary-button create-subject-button"
                onClick={openCreateStudentDialog}
              >
                <span className="subjects-primary-button-plus" aria-hidden="true">
                  +
                </span>
                <span>Add Student</span>
              </button>
              <details className="roster-options"><summary aria-label="Roster options"><MoreIcon /></summary><div><button type="button" onClick={event => { setSearchValue(''); setSelectedSubjectId(''); setStatusFilter('all'); setActiveTab('all'); setPage(1); event.currentTarget.closest('details')?.removeAttribute('open') }}>Reset filters</button></div></details>
            </div>

          <div className="students-table-shell">
            <div className="instructor-table-head table-layout--students student-table-header">
              <span>#</span>
              <span>Full Name</span>
              <span>Email</span>
              <span>Subjects Enrolled</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="dashboard-panel-content students-table-body" ref={tableBodyRef}>
              {isLoading ? (
                <div className="dashboard-loading-block">
                  <div className="dashboard-loading-row student-loading-row" />
                  <div className="dashboard-loading-row student-loading-row" />
                  <div className="dashboard-loading-row student-loading-row" />
                </div>
              ) : filteredStudents.length ? (
                visibleStudents.map(renderStudentTableRow)
              ) : (
                <div className="dashboard-empty-state" role="status">
                  <StudentsIcon />
                  <strong>{errorMessage ? 'Unable to load students.' : 'No students found.'}</strong>
                  <p>{errorMessage ? 'Please resolve the error above and try again.' : students.length ? 'No students matched the current filters.' : 'There are no students to display yet.'}</p>
                  <button type="button" className="roster-empty-add" onClick={openCreateStudentDialog}><span aria-hidden="true">+</span>Add Student</button>
                </div>
              )}
            </div>
          </div>
          <footer className="roster-pagination">
            <span aria-live="polite">Showing {filteredStudents.length ? `${pageOffset + 1}–${pageOffset + visibleStudents.length}` : '0'} of {filteredStudents.length} students</span>
            <div>
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <PaginationChevron direction="left" />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === currentPage ? 'roster-current-page' : 'roster-page-number'}
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                <PaginationChevron direction="right" />
              </button>
              <select aria-label="Students per page" value={effectivePageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>
                {[...new Set([...pageSizeOptions, effectivePageSize])].sort((a, b) => a - b).map(size => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
          </footer>
        </article>
      </section>

      {viewedStudent ? (
        <div
          className="student-modal-backdrop"
          onClick={() => setViewStudentId('')}
        >
          <div
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-header">
              <div>
                <h2 id="student-view-title">View Student</h2>
                <p>Student profile, handled subjects, and posted final grades.</p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setViewStudentId('')}
                aria-label="Close student details"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="student-modal-section student-detail-grid">
              <StudentDetailRow label="Student Name" value={viewedStudent.fullName} />
              <StudentDetailRow label="Student ID" value={viewedStudent.studentId} />
              <StudentDetailRow label="Email" value={viewedStudent.email} />
              <StudentDetailRow label="Year/Section" value={viewedStudent.yearSection} />
            </div>

            <div className="student-modal-section">
              <h3>Subjects handled by this instructor</h3>
              {viewedStudent.subjects.length ? (
                <div className="student-subject-list">
                  {viewedStudent.subjects.map((subject) => (
                    <div key={subject.id} className="student-subject-card">
                      <div>
                        <strong>{subject.code}</strong>
                        <span>{subject.name}</span>
                      </div>
                      <span
                        className={
                          subject.finalGrade === 'Not posted'
                            ? 'student-grade-badge student-grade-badge--muted'
                            : 'student-grade-badge'
                        }
                      >
                        {subject.finalGrade === 'Not posted'
                          ? 'Not posted'
                          : `Final: ${subject.finalGrade}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="student-modal-empty">
                  This student is not currently enrolled in any subject handled by this instructor.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteDialog && deleteStudentRecord ? (
        <div
          className="student-modal-backdrop"
          onClick={() => {
            if (!isDeletingStudent) {
              setDeleteDialog(null)
            }
          }}
        >
          <div
            className="student-modal student-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-header">
              <div>
                <h2 id="delete-student-title">Delete Student</h2>
                <p>{deleteStudentRecord.fullName}</p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setDeleteDialog(null)}
                disabled={isDeletingStudent}
                aria-label="Close delete student popup"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="student-modal-empty">
              This will disable the student account, remove active subject enrollments, and prevent
              the student from signing in. This action cannot be undone from the portal.
            </p>

            <div className="student-modal-actions">
              <button
                type="button"
                className="subject-detail-action subject-detail-action--solid subject-detail-action--danger"
                onClick={handleDeleteStudent}
                disabled={isDeletingStudent}
              >
                <span>{isDeletingStudent ? 'Deleting...' : 'Delete Student'}</span>
              </button>
              <button
                type="button"
                className="subject-detail-action"
                onClick={() => setDeleteDialog(null)}
                disabled={isDeletingStudent}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {enrollmentDialog && enrollmentStudent ? (
        <div
          className="student-modal-backdrop"
          onClick={() => {
            if (!isUpdatingEnrollment) {
              setEnrollmentDialog(null)
            }
          }}
        >
          <div
            className="student-modal student-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-enrollment-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-header">
              <div>
                <h2 id="student-enrollment-title">
                  {enrollmentDialog.action === 'add' ? 'Add to Subject' : 'Remove from Subject'}
                </h2>
                <p>{enrollmentStudent.fullName}</p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setEnrollmentDialog(null)}
                disabled={isUpdatingEnrollment}
                aria-label="Close enrollment actions"
              >
                <CloseIcon />
              </button>
            </div>

            {enrollmentSubjectChoices.length ? (
              <div className="student-choice-list">
                {enrollmentSubjectChoices.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    className="student-choice-button"
                    onClick={() => handleEnrollmentUpdate(subject.id)}
                    disabled={isUpdatingEnrollment}
                  >
                    <span>{subject.label}</span>
                    <strong>
                      {enrollmentDialog.action === 'add' ? 'Add' : 'Remove'}
                    </strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="student-modal-empty">
                {enrollmentDialog.action === 'add'
                  ? 'This student is already enrolled in every subject handled by this instructor.'
                  : 'This student does not have any subject enrollment to remove here.'}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {isCreateStudentOpen ? (
        <div
          className="student-modal-backdrop create-student-overlay"
          onClick={() => {
            if (!isCreatingStudent) {
              closeCreateStudentDialog()
            }
          }}
        >
          <div
            className="student-modal create-student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-student-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="student-modal-close create-student-close"
              onClick={closeCreateStudentDialog}
              disabled={isCreatingStudent}
              aria-label="Close create student popup"
            >
              <CloseIcon />
            </button>

            <div className="create-student-modal-content">
              <div className="create-student-heading">
                <span className="create-student-heading-icon" aria-hidden="true">
                  <StudentAddIcon />
                </span>
                <div>
                  <h2 id="create-student-title" className="create-student-title">Create Student</h2>
                  <p className="create-student-subtitle">
                    Add a new student and place them into one of your handled subjects.
                  </p>
                </div>
              </div>

              <form className="student-create-form create-student-form" onSubmit={handleCreateStudent}>
                {!subjects.length ? (
                  <p className="student-modal-empty create-student-inline-note">
                    You can create the student now and assign subjects later.
                  </p>
                ) : null}

                <div className="student-create-grid">
                  <label className="student-create-field student-create-field--wide create-student-form-group">
                    <span className="create-student-label">Email</span>
                    <div className="create-student-email-wrapper">
                      <span className="create-student-email-icon" aria-hidden="true">
                        <MailIcon />
                      </span>
                      <input
                        type="email"
                        className="create-student-email-input"
                        value={createStudentForm.email}
                        onChange={(event) =>
                          setCreateStudentForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))}
                        placeholder="student@email.com"
                        required
                      />
                    </div>
                  </label>

                  <label className="student-create-field student-create-field--wide create-student-form-group">
                    <span className="create-student-label">Assign Subjects (Optional)</span>
                    <div className="student-subject-multiselect subject-multiselect" ref={subjectPickerRef}>
                      <button
                        type="button"
                        className="student-subject-multiselect-trigger subject-multiselect-trigger"
                        onClick={() => setSubjectPickerOpen((current) => !current)}
                        aria-expanded={subjectPickerOpen}
                        aria-controls="student-subject-multiselect-menu"
                      >
                        <span className="student-subject-multiselect-trigger-content">
                          {selectedCreateSubjects.length ? (
                            <span className="student-selected-subject-chip-list selected-subject-chip-list">
                              {selectedCreateSubjects.map((subject) => (
                                <span
                                  key={subject.id}
                                  className="student-selected-subject-chip selected-subject-chip"
                                >
                                  <span className="selected-subject-chip-text">
                                    {subject.label}
                                  </span>
                                  <span
                                    className="selected-subject-chip-remove"
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      toggleCreateStudentSubject(subject.id)
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        toggleCreateStudentSubject(subject.id)
                                      }
                                    }}
                                    aria-label={`Remove ${subject.label}`}
                                  >
                                    <CloseIcon />
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="student-subject-multiselect-value">
                              Select subject(s)
                            </span>
                          )}
                        </span>

                        <span
                          className={
                            subjectPickerOpen
                              ? 'student-subject-multiselect-chevron is-open'
                              : 'student-subject-multiselect-chevron'
                          }
                          aria-hidden="true"
                        >
                          <ChevronDownIcon />
                        </span>
                      </button>

                      {subjectPickerOpen ? (
                        <div
                          id="student-subject-multiselect-menu"
                          className="student-subject-multiselect-menu subject-dropdown"
                          role="listbox"
                          aria-multiselectable="true"
                        >
                          {subjects.length ? (
                            <>
                              <div className="subject-dropdown-search-wrapper">
                                <span className="subject-dropdown-search-icon" aria-hidden="true">
                                  <SearchIcon />
                                </span>
                                <input
                                  type="search"
                                  className="student-subject-search subject-dropdown-search-input"
                                  value={subjectSearchValue}
                                  onChange={(event) => setSubjectSearchValue(event.target.value)}
                                  placeholder="Search subjects..."
                                />
                              </div>

                              <div className="student-subject-options subject-dropdown-options">
                                {filteredCreateSubjects.length ? (
                                  filteredCreateSubjects.map((subject) => {
                                    const isSelected = createStudentForm.subjectIds.includes(subject.id)

                                    return (
                                      <label
                                        key={subject.id}
                                        className={
                                          isSelected
                                            ? 'student-subject-option subject-option is-selected'
                                            : 'student-subject-option subject-option'
                                        }
                                      >
                                        <input
                                          type="checkbox"
                                          className="student-subject-checkbox subject-option-checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleCreateStudentSubject(subject.id)}
                                        />
                                        <span className="subject-option-text">{subject.label}</span>
                                      </label>
                                    )
                                  })
                                ) : (
                                  <div className="student-subject-option student-subject-option--empty subject-dropdown-empty">
                                    <span>No subjects found.</span>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : isLoading ? (
                            <div className="student-subject-option student-subject-option--empty subject-dropdown-empty create-student-menu-state">
                              <span>Loading subjects...</span>
                            </div>
                          ) : errorMessage ? (
                            <div className="student-subject-option student-subject-option--empty subject-dropdown-empty create-student-menu-state">
                              <span>Unable to load subjects.</span>
                            </div>
                          ) : (
                            <div className="student-subject-option student-subject-option--empty subject-dropdown-empty create-student-menu-state">
                              <span>No subjects available.</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>

                <div className="student-modal-actions create-student-footer">
                  <button
                    type="button"
                    className="subject-detail-action create-student-cancel"
                    onClick={closeCreateStudentDialog}
                    disabled={isCreatingStudent}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className="subject-detail-action subject-detail-action--solid create-student-save"
                    disabled={isCreatingStudent}
                  >
                    <span>{isCreatingStudent ? 'Creating...' : 'Save Student'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </InstructorShell>
  )
}
