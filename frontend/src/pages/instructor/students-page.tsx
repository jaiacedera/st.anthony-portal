import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
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

function createDefaultStudentForm(subjectIds: string[] = []): CreateStudentFormState {
  return {
    email: '',
    subjectIds,
  }
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v17H6a2.5 2.5 0 0 0-2.5 2" />
      <path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v17H18a2.5 2.5 0 0 1 2.5 2" />
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

function PanelLead() {
  return (
    <span className="instructor-panel-lead" aria-hidden="true">
      <BookIcon />
      <span className="instructor-panel-underline"></span>
    </span>
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
  const [students, setStudents] = useState<InstructorStudentRecord[]>([])
  const [subjects, setSubjects] = useState<InstructorRosterSubject[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [schoolYearLabel, setSchoolYearLabel] = useState('Not set')
  const [semesterLabel, setSemesterLabel] = useState('Not set')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingEnrollment, setIsUpdatingEnrollment] = useState(false)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [isDeletingStudent, setIsDeletingStudent] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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
  const deferredSearchValue = useDeferredValue(searchValue)

  async function loadStudents(signal?: AbortSignal) {
    const payload = await fetchInstructorStudents(username, signal)

    if (signal?.aborted) {
      return
    }

    setStudents(payload.students)
    setSubjects(payload.subjects)
    setSchoolYearLabel(payload.header.schoolYear)
    setSemesterLabel(payload.header.semester)
    setBindingMessage(payload.needsBinding ? payload.message ?? '' : '')
    setSelectedSubjectId((current) =>
      payload.subjects.some((subject) => subject.id === current)
        ? current
        : payload.subjects[0]?.id ?? '',
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
  }

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

    loadStudents(abortController.signal)
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
  }, [username])

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
    viewStudentId,
  ])

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
        activeTab !== 'subject' ||
        !selectedSubjectId ||
        student.subjects.some((subject) => subject.id === selectedSubjectId)

      return matchesQuery && matchesSubject
    })
  }, [activeTab, deferredSearchValue, selectedSubjectId, students])

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

  function openCreateStudentDialog() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsCreateStudentOpen(true)
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

  function renderStudentTableRow(student: InstructorStudentRecord) {
    const canAddToSubject = student.subjects.length < subjects.length
    const canRemoveFromSubject = student.subjects.length > 0

    return (
      <div key={student.id} className="instructor-table-row table-layout--students student-roster-row">
        <div className="student-name-cell">
          <span className="student-avatar">{getInitials(student.fullName)}</span>
          <div className="student-name-copy">
            <strong>{student.fullName}</strong>
            <span>{student.studentId}</span>
          </div>
        </div>

        <span className="student-email-cell">{student.email}</span>
        <span className="student-enrollment-cell">{countLabel(student.subjectCount, 'subject')}</span>

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
    >
      <section className="students-page students-page-content">
        <article className="instructor-panel students-management-card">
          <div className="instructor-panel-header student-panel-heading">
            <PanelLead />
            <h2>Student Management</h2>
          </div>

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
            <div className="student-tab-list" role="tablist" aria-label="Student roster views">
              <button
                type="button"
                className={activeTab === 'all' ? 'student-tab is-active' : 'student-tab'}
                onClick={() => setActiveTab('all')}
                role="tab"
                aria-selected={activeTab === 'all'}
              >
                All Students
              </button>
              <button
                type="button"
                className={activeTab === 'subject' ? 'student-tab is-active' : 'student-tab'}
                onClick={() => setActiveTab('subject')}
                role="tab"
                aria-selected={activeTab === 'subject'}
              >
                By Subject
              </button>
            </div>

            <div className="students-filter-bar">
              {activeTab === 'subject' ? (
                <label className="students-subject-filter">
                  <select
                    value={selectedSubjectId}
                    onChange={(event) => setSelectedSubjectId(event.target.value)}
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
              ) : null}

              <label className="students-search-field">
                <span className="students-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search student..."
                />
              </label>

              <button
                type="button"
                className="subjects-primary-button create-subject-button"
                onClick={openCreateStudentDialog}
              >
                <span className="subjects-primary-button-plus" aria-hidden="true">
                  +
                </span>
                <span>Create Student</span>
              </button>
            </div>
          </div>

          <div className="students-table-shell">
            <div className="instructor-table-head table-layout--students student-table-header">
              <span>Full Name</span>
              <span>Email</span>
              <span>Subjects Enrolled</span>
              <span>Actions</span>
            </div>

            <div className="dashboard-panel-content students-table-body">
              {isLoading ? (
                <div className="dashboard-loading-block">
                  <div className="dashboard-loading-row student-loading-row" />
                  <div className="dashboard-loading-row student-loading-row" />
                  <div className="dashboard-loading-row student-loading-row" />
                </div>
              ) : filteredStudents.length ? (
                filteredStudents.map(renderStudentTableRow)
              ) : (
                <div className="dashboard-empty-state">
                  {students.length
                    ? 'No students matched the current filters.'
                    : 'No enrolled students found for this instructor yet.'}
                </div>
              )}
            </div>
          </div>
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
          className="student-modal-backdrop"
          onClick={() => {
            if (!isCreatingStudent) {
              closeCreateStudentDialog()
            }
          }}
        >
          <div
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-student-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-header">
              <div>
                <h2 id="create-student-title">Create Student</h2>
                <p>Add a new student and place them into one of your handled subjects.</p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={closeCreateStudentDialog}
                disabled={isCreatingStudent}
                aria-label="Close create student popup"
              >
                <CloseIcon />
              </button>
            </div>

            <form className="student-create-form" onSubmit={handleCreateStudent}>
              {!subjects.length ? (
                <p className="student-modal-empty">
                  You can create the student now and assign subjects later.
                </p>
              ) : null}

              <div className="student-create-grid">
                <label className="student-create-field student-create-field--wide">
                  <span>Email</span>
                  <input
                    type="email"
                    value={createStudentForm.email}
                    onChange={(event) =>
                      setCreateStudentForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))}
                    placeholder="student@email.com"
                    required
                  />
                </label>

                <label className="student-create-field student-create-field--wide">
                  <span>Assign Subjects (Optional)</span>
                  <div className="student-subject-picker">
                    {subjects.length ? (
                      subjects.map((subject) => {
                        const isSelected = createStudentForm.subjectIds.includes(subject.id)

                        return (
                          <label key={subject.id} className="student-subject-option">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) =>
                                setCreateStudentForm((current) => ({
                                  ...current,
                                  subjectIds: event.target.checked
                                    ? [...current.subjectIds, subject.id]
                                    : current.subjectIds.filter((currentId) => currentId !== subject.id),
                                }))}
                              disabled={!subjects.length}
                            />
                            <span>{subject.label}</span>
                          </label>
                        )
                      })
                    ) : (
                      <div className="student-subject-option student-subject-option--empty">
                        <span>No subjects available</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className="subject-detail-action subject-detail-action--solid"
                  disabled={isCreatingStudent}
                >
                  <span>{isCreatingStudent ? 'Creating...' : 'Save Student'}</span>
                </button>
                <button
                  type="button"
                  className="subject-detail-action"
                  onClick={closeCreateStudentDialog}
                  disabled={isCreatingStudent}
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
