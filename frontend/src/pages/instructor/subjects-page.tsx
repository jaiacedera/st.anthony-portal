import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  createInstructorSubject,
  fetchInstructorSubjects,
  type InstructorSubjectRecord,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'

type CreateSubjectFormState = {
  subjectCode: string
  subjectName: string
  schedule: string
  room: string
  semester: string
  schoolYear: string
}

const subjectColorClasses = [
  'subject-code-pill--ruby',
  'subject-code-pill--amber',
  'subject-code-pill--gold',
  'subject-code-pill--emerald',
  'subject-code-pill--sky',
  'subject-code-pill--indigo',
] as const

const semesterOptions = ['1st Semester', '2nd Semester']

function getDefaultSchoolYear() {
  const year = new Date().getFullYear()
  return `${year}-${year + 1}`
}

function createDefaultSubjectForm(
  semester = semesterOptions[0],
  schoolYear = getDefaultSchoolYear(),
): CreateSubjectFormState {
  return {
    subjectCode: '',
    subjectName: '',
    schedule: '',
    room: '',
    semester,
    schoolYear,
  }
}

function sortSubjects(subjects: InstructorSubjectRecord[]) {
  return [...subjects].sort((left, right) => left.code.localeCompare(right.code))
}

function getSubjectColorClass(seed: string) {
  let hash = 0

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }

  return subjectColorClasses[Math.abs(hash) % subjectColorClasses.length]
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v17H6a2.5 2.5 0 0 0-2.5 2" />
      <path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v17H18a2.5 2.5 0 0 1 2.5 2" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function PanelLead() {
  return (
    <span className="instructor-panel-lead" aria-hidden="true">
      <BookIcon />
      <span className="instructor-panel-underline"></span>
    </span>
  )
}

function DetailIcon({
  children,
}: {
  children: ReactNode
}) {
  return <span className="selected-subject-detail-icon">{children}</span>
}

function InstructorDetailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.7l3.1 1.7" />
    </svg>
  )
}

function RoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18a1 1 0 0 1 1 1v13" />
      <path d="M3 20h18" />
      <path d="M8 9.5h3" />
      <path d="M8 13h3" />
      <path d="M15 16.5h.01" />
    </svg>
  )
}

function StudentsDetailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4.2 18v-.6A4.3 4.3 0 0 1 8.5 13h1" />
      <circle cx="16.5" cy="9.5" r="2.1" />
      <path d="M13.6 18v-.3A3.7 3.7 0 0 1 17.3 14h.3" />
    </svg>
  )
}

function SemesterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9.5h16" />
    </svg>
  )
}

function AcademicYearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 7.5 12 4l7.5 3.5L12 11 4.5 7.5Z" />
      <path d="M7.5 10v4.2c0 1 2 2.8 4.5 2.8s4.5-1.8 4.5-2.8V10" />
      <path d="M19.5 9.5v5" />
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

export default function SubjectsPage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)
  const [subjects, setSubjects] = useState<InstructorSubjectRecord[]>([])
  const [selectedSemester, setSelectedSemester] = useState(semesterOptions[0])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [schoolYearLabel, setSchoolYearLabel] = useState(getDefaultSchoolYear())
  const [semesterLabel, setSemesterLabel] = useState(semesterOptions[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [bindingMessage, setBindingMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formState, setFormState] = useState<CreateSubjectFormState>(() =>
    createDefaultSubjectForm(),
  )

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

    fetchInstructorSubjects(username, abortController.signal)
      .then((payload) => {
        const nextSubjects = sortSubjects(payload.subjects)
        const nextSemester =
          nextSubjects.find((subject) => subject.semester === selectedSemester)?.semester ??
          nextSubjects[0]?.semester ??
          (payload.header.semester !== 'Not set' ? payload.header.semester : semesterOptions[0])
        const nextSchoolYear =
          payload.header.schoolYear !== 'Not set'
            ? payload.header.schoolYear
            : nextSubjects[0]?.schoolYear ?? getDefaultSchoolYear()

        setSubjects(nextSubjects)
        setSelectedSemester(nextSemester)
        setSemesterLabel(nextSemester)
        setSchoolYearLabel(nextSchoolYear)
        setBindingMessage(payload.needsBinding ? payload.message ?? '' : '')
        setFormState(createDefaultSubjectForm(nextSemester, nextSchoolYear))

        if (!nextSubjects.some((subject) => subject.id === selectedSubjectId)) {
          setSelectedSubjectId(nextSubjects[0]?.id ?? '')
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor subject data.',
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

  const filteredSubjects = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase()

    return subjects.filter((subject) => {
      const matchesQuery =
        !normalizedQuery ||
        [subject.code, subject.title, subject.schedule, subject.room]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesQuery && subject.semester === selectedSemester
    })
  }, [deferredSearchValue, selectedSemester, subjects])

  useEffect(() => {
    if (!filteredSubjects.length) {
      if (selectedSubjectId) {
        setSelectedSubjectId('')
      }
      return
    }

    if (!filteredSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(filteredSubjects[0].id)
    }
  }, [filteredSubjects, selectedSubjectId])

  useEffect(() => {
    if (!isCreateFormOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        closeCreateForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCreateFormOpen, isSubmitting])

  const selectedSubject =
    filteredSubjects.find((subject) => subject.id === selectedSubjectId) ??
    filteredSubjects[0] ??
    null

  function handleFormFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setFormState((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreateForm() {
    setSuccessMessage('')
    setErrorMessage('')
    setIsCreateFormOpen(true)
    setFormState(createDefaultSubjectForm(selectedSemester, schoolYearLabel))
  }

  function closeCreateForm() {
    setIsCreateFormOpen(false)
    setFormState(createDefaultSubjectForm(selectedSemester, schoolYearLabel))
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username) {
      setErrorMessage('No instructor session was found. Please sign in again.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await createInstructorSubject({
        username,
        subjectCode: formState.subjectCode,
        subjectName: formState.subjectName,
        semester: formState.semester,
        schoolYear: formState.schoolYear,
        schedule: formState.schedule,
        room: formState.room,
      })

      if (!payload.subject) {
        throw new Error('The subject was created but no subject record was returned.')
      }

      const nextSubjects = sortSubjects([...subjects, payload.subject])

      setSubjects(nextSubjects)
      setSelectedSemester(payload.subject.semester)
      setSemesterLabel(payload.subject.semester)
      setSchoolYearLabel(payload.subject.schoolYear)
      setSelectedSubjectId(payload.subject.id)
      setIsCreateFormOpen(false)
      setFormState(createDefaultSubjectForm(payload.subject.semester, payload.subject.schoolYear))
      setSuccessMessage(payload.message ?? 'Subject created successfully.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create subject.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const alerts = [errorMessage, bindingMessage, successMessage].filter(Boolean)

  return (
    <InstructorShell
      active="subjects"
      schoolYearLabel={schoolYearLabel}
      semesterLabel={semesterLabel}
    >
      <section className="subjects-page subjects-page-content subjects-layout">
        <article className="instructor-panel subjects-management-card subject-management-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead />
            <h2 className="panel-title">Subject Management</h2>
          </div>

          {alerts.length ? (
            <div className="dashboard-alert-stack subject-alert-stack" aria-live="polite">
              {alerts.map((message, index) => (
                <section key={`${message}-${index}`} className="dashboard-alert-row">
                  <div className="dashboard-alert">{message}</div>
                </section>
              ))}
            </div>
          ) : null}

          <div className="subjects-toolbar subject-toolbar">
            <label className="subjects-search-field subject-search">
              <span className="subjects-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="search"
                name="subject-search"
                placeholder="Search subject..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>

            <div className="subjects-toolbar-actions">
              <label className="subjects-semester-field semester-filter">
                <select
                  name="subject-semester"
                  value={selectedSemester}
                  onChange={(event) => {
                    setSelectedSemester(event.target.value)
                    setSemesterLabel(event.target.value)
                  }}
                >
                  {semesterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="subjects-primary-button create-subject-button"
                onClick={openCreateForm}
              >
                <span className="subjects-primary-button-plus" aria-hidden="true">
                  +
                </span>
                <span>Create Subject</span>
              </button>
            </div>
          </div>

          <div className="subjects-table-shell">
            <div className="instructor-table-head subjects-table-layout subject-table-grid subject-table-header">
              <span>Subject Code</span>
              <span>Subject Title</span>
              <span>Schedule</span>
              <span>Room</span>
              <span>Students</span>
            </div>

            <div className="subjects-table-body">
              {isLoading ? (
                <div className="subjects-empty-state">Loading subjects...</div>
              ) : filteredSubjects.length ? (
                filteredSubjects.map((subject) => {
                  const isSelected = subject.id === selectedSubject?.id
                  const subjectColorClass = getSubjectColorClass(subject.code)

                  return (
                    <div
                      key={subject.id}
                      className={
                        isSelected
                          ? 'subjects-table-row subjects-table-layout subject-table-grid subject-row is-selected'
                          : 'subjects-table-row subjects-table-layout subject-table-grid subject-row'
                      }
                      onClick={() => {
                        setIsCreateFormOpen(false)
                        setSelectedSubjectId(subject.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setIsCreateFormOpen(false)
                          setSelectedSubjectId(subject.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className={`course-pill subject-code-pill subject-code ${subjectColorClass}`}>
                        {subject.code}
                      </span>
                      <span className="subjects-inline-title subject-title">{subject.title}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.schedule}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.room}</span>
                      <span className="table-stat student-count">{subject.students}</span>
                    </div>
                  )
                })
              ) : (
                <div className="subjects-empty-state">
                  {subjects.length
                    ? 'No subjects matched your search.'
                    : 'No subjects created yet.'}
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="instructor-panel selected-subject-card selected-subject-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead />
            <h2 className="panel-title">Selected Subject</h2>
          </div>

          <div className="selected-subject-body selected-subject-content">
            {selectedSubject ? (
              <>
                <div className="selected-subject-headline">
                  <span
                    className={`course-pill subject-code-pill subject-code-pill--detail selected-subject-code ${getSubjectColorClass(selectedSubject.code)}`}
                  >
                    {selectedSubject.code}
                  </span>
                  <h3 className="selected-subject-name">{selectedSubject.title}</h3>
                </div>

                <div className="selected-subject-detail-list">
                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <InstructorDetailIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Instructor</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.instructor}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <ClockIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Schedule</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.schedule}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <RoomIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Room</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.room}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <StudentsDetailIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Students</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.students}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <SemesterIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Semester</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.semester}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <AcademicYearIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">School Year</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.schoolYear}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="subjects-empty-state subjects-empty-state--detail">
                <div className="subject-empty-state-panel">
                  <p>No subject selected for this semester yet.</p>
                  <button
                    type="button"
                    className="subject-detail-action subject-detail-action--solid"
                    onClick={openCreateForm}
                  >
                    <span>Create Subject</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {isCreateFormOpen ? (
        <div
          className="subject-modal-backdrop"
          onClick={() => {
            if (!isSubmitting) {
              closeCreateForm()
            }
          }}
        >
          <div
            className="subject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-subject-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="subject-modal-header">
              <div>
                <h2 id="create-subject-title">Create Subject</h2>
                <p>Add a new subject to your active teaching load.</p>
              </div>

              <button
                type="button"
                className="subject-modal-close"
                onClick={closeCreateForm}
                disabled={isSubmitting}
                aria-label="Close create subject popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form className="subject-create-form" onSubmit={handleCreateSubject}>
              <div className="subject-create-grid">
                <label className="subject-create-field">
                  <span>Subject Code</span>
                  <input
                    type="text"
                    name="subjectCode"
                    value={formState.subjectCode}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. IT101"
                    required
                  />
                </label>

                <label className="subject-create-field subject-create-field--wide">
                  <span>Subject Title</span>
                  <input
                    type="text"
                    name="subjectName"
                    value={formState.subjectName}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. Introduction to Computing"
                    required
                  />
                </label>

                <label className="subject-create-field">
                  <span>Schedule</span>
                  <input
                    type="text"
                    name="schedule"
                    value={formState.schedule}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. Mon 8:00 AM - 10:00 AM"
                  />
                </label>

                <label className="subject-create-field">
                  <span>Room</span>
                  <input
                    type="text"
                    name="room"
                    value={formState.room}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. IT Lab 1"
                  />
                </label>

                <label className="subject-create-field">
                  <span>Semester</span>
                  <select
                    name="semester"
                    value={formState.semester}
                    onChange={handleFormFieldChange}
                  >
                    {semesterOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="subject-create-field">
                  <span>School Year</span>
                  <input
                    type="text"
                    name="schoolYear"
                    value={formState.schoolYear}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. 2026-2027"
                  />
                </label>
              </div>

              <div className="subject-modal-actions selected-subject-action-list selected-subject-actions">
                <button
                  type="submit"
                  className="subject-detail-action subject-detail-action--solid"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Creating...' : 'Save Subject'}</span>
                </button>
                <button
                  type="button"
                  className="subject-detail-action"
                  onClick={closeCreateForm}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </InstructorShell>
  )
}
