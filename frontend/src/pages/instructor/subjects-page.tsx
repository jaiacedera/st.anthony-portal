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
  updateInstructorSubject,
  type InstructorSubjectRecord,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'
import { navigateTo } from '../../utils/navigation'
import './subjects-page.css'

type CreateSubjectFormState = {
  subjectCode: string
  units: string
  subjectName: string
  schedule: string
  room: string
  semester: string
  schoolYear: string
}

type SubjectFormMode = 'create' | 'edit'

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
    units: '',
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

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" />
      <path d="M14 3v6h5M9 13h6M9 17h6" />
    </svg>
  )
}

function PanelLead({ document = false }: { document?: boolean }) {
  return (
    <span className="instructor-panel-lead" aria-hidden="true">
      {document ? <DocumentIcon /> : <BookIcon />}
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

function ActionStudentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4.5 18.5a4.8 4.8 0 0 1 9 0" />
      <path d="M17 8v8" />
      <path d="M13 12h8" />
    </svg>
  )
}

function ActionClassListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6.5h11" />
      <path d="M8 12h11" />
      <path d="M8 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ActionEditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
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
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(
    () => new URLSearchParams(window.location.search).get('open') === 'create',
  )
  const [subjectFormMode, setSubjectFormMode] = useState<SubjectFormMode>('create')
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
        [subject.code, subject.title, subject.units, subject.schedule, subject.room]
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
    setSubjectFormMode('create')
    setIsCreateFormOpen(true)
    setFormState(createDefaultSubjectForm(selectedSemester, schoolYearLabel))
  }

  function openEditForm() {
    if (!selectedSubject) {
      return
    }

    setSuccessMessage('')
    setErrorMessage('')
    setSubjectFormMode('edit')
    setIsCreateFormOpen(true)
    setFormState({
      subjectCode: selectedSubject.code,
      units: selectedSubject.units === 'Not set' ? '' : selectedSubject.units,
      subjectName: selectedSubject.title,
      schedule: selectedSubject.schedule === 'Not set' ? '' : selectedSubject.schedule,
      room: selectedSubject.room === 'Not set' ? '' : selectedSubject.room,
      semester: selectedSubject.semester === 'Not set' ? selectedSemester : selectedSubject.semester,
      schoolYear:
        selectedSubject.schoolYear === 'Not set' ? schoolYearLabel : selectedSubject.schoolYear,
    })
  }

  function closeCreateForm() {
    setIsCreateFormOpen(false)
    setSubjectFormMode('create')
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
      const payload =
        subjectFormMode === 'edit' && selectedSubject
          ? await updateInstructorSubject({
              username,
              subjectId: selectedSubject.id,
              subjectCode: formState.subjectCode,
              subjectName: formState.subjectName,
              units: formState.units,
              semester: formState.semester,
              schoolYear: formState.schoolYear,
              schedule: formState.schedule,
              room: formState.room,
            })
          : await createInstructorSubject({
              username,
              subjectCode: formState.subjectCode,
              subjectName: formState.subjectName,
              units: formState.units,
              semester: formState.semester,
              schoolYear: formState.schoolYear,
              schedule: formState.schedule,
              room: formState.room,
            })

      if (!payload.subject) {
        throw new Error(
          subjectFormMode === 'edit'
            ? 'The subject was updated but no subject record was returned.'
            : 'The subject was created but no subject record was returned.',
        )
      }

      const nextSubjects = sortSubjects([
        ...subjects.filter((subject) => subject.id !== payload.subject?.id),
        payload.subject,
      ])

      setSubjects(nextSubjects)
      setSelectedSemester(payload.subject.semester)
      setSemesterLabel(payload.subject.semester)
      setSchoolYearLabel(payload.subject.schoolYear)
      setSelectedSubjectId(payload.subject.id)
      setIsCreateFormOpen(false)
      setSubjectFormMode('create')
      setFormState(createDefaultSubjectForm(payload.subject.semester, payload.subject.schoolYear))
      setSuccessMessage(
        payload.message ??
          (subjectFormMode === 'edit'
            ? 'Subject updated successfully.'
            : 'Subject created successfully.'),
      )
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : subjectFormMode === 'edit'
            ? 'Unable to update subject.'
            : 'Unable to create subject.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const alerts = [errorMessage, bindingMessage, successMessage].filter(Boolean)

  return (
    <InstructorShell
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      active="subjects"
      schoolYearLabel={schoolYearLabel}
      semesterLabel={semesterLabel}
    >
      <section className="subjects-page subjects-page-content subjects-layout">
        <article className="instructor-panel subjects-management-card subject-management-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead />
            <div>
              <h2 className="panel-title">Subject List</h2>
              <p className="subject-panel-description">View, search, and manage subjects for the active semester.</p>
            </div>
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
                placeholder="Search subject code or title..."
                aria-label="Search subject code or title"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>

            <div className="subjects-toolbar-actions">
              <label className="subjects-semester-field semester-filter">
                <select
                  name="subject-semester"
                  aria-label="Filter subjects by semester"
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
                <span>Units</span>
                <span>Schedule</span>
                <span>Room</span>
                <span>Students</span>
            </div>

            <div className="subjects-table-body">
              {isLoading ? (
                <div className="subjects-empty-state" role="status">
                  <BookIcon />
                  <strong>Loading subjects...</strong>
                </div>
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
                      <span className="subjects-inline-meta subject-meta">{subject.units}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.schedule}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.room}</span>
                      <span className="table-stat student-count">{subject.students}</span>
                    </div>
                  )
                })
              ) : (
                <div className="subjects-empty-state" role="status">
                  <BookIcon />
                  <strong>{errorMessage ? 'Unable to load subjects.' : deferredSearchValue.trim()
                    ? 'No subjects matched your search.'
                    : 'No subjects created yet.'}</strong>
                  <p>{errorMessage ? 'Please try again after resolving the error above.' : deferredSearchValue.trim()
                    ? 'Try a different subject code or title.'
                    : 'Get started by creating a subject for the selected semester.'}</p>
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="instructor-panel selected-subject-card selected-subject-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead document />
            <div>
              <h2 className="panel-title">Selected Subject</h2>
              <p className="subject-panel-description">View subject details, enrolled students, and other information.</p>
            </div>
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

                <div className="selected-subject-action-list selected-subject-actions">
                  <button
                    type="button"
                    className="subject-detail-action subject-detail-action--solid"
                    onClick={() =>
                      navigateTo(
                        `/instructor/students?subjectId=${encodeURIComponent(selectedSubject.id)}&open=create`,
                      )
                    }
                  >
                    <span className="subject-detail-action-icon" aria-hidden="true">
                      <ActionStudentsIcon />
                    </span>
                    <span>Add Students</span>
                  </button>

                  <button
                    type="button"
                    className="subject-detail-action"
                    onClick={() =>
                      navigateTo(`/instructor/students?subjectId=${encodeURIComponent(selectedSubject.id)}`)
                    }
                  >
                    <span className="subject-detail-action-icon" aria-hidden="true">
                      <ActionClassListIcon />
                    </span>
                    <span>View Class List</span>
                  </button>

                  <button
                    type="button"
                    className="subject-detail-action"
                    onClick={openEditForm}
                  >
                    <span className="subject-detail-action-icon" aria-hidden="true">
                      <ActionEditIcon />
                    </span>
                    <span>Edit Subject</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="subjects-empty-state subjects-empty-state--detail">
                <div className="subject-empty-state-panel">
                  <DocumentIcon />
                  <strong>No subject selected yet.</strong>
                  <p>Select a subject from the list to view details, or create a new subject.</p>
                  <button
                    type="button"
                    className="subject-detail-action"
                    onClick={openCreateForm}
                  >
                    <BookIcon />
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
                <h2 id="create-subject-title">
                  {subjectFormMode === 'edit' ? 'Edit Subject' : 'Create Subject'}
                </h2>
                <p>
                  {subjectFormMode === 'edit'
                    ? 'Update the selected subject details for your teaching load.'
                    : 'Add a new subject to your active teaching load.'}
                </p>
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

                <label className="subject-create-field">
                  <span>Units</span>
                  <input
                    type="number"
                    name="units"
                    value={formState.units}
                    onChange={handleFormFieldChange}
                    placeholder="e.g. 3"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
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
                  <span>
                    {isSubmitting
                      ? subjectFormMode === 'edit'
                        ? 'Saving...'
                        : 'Creating...'
                      : subjectFormMode === 'edit'
                        ? 'Save Changes'
                        : 'Save Subject'}
                  </span>
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
