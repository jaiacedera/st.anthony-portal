import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { StudentDashboardSubjectRecord } from '../services/studentApi'

type StudentRequestType = 'grade_breakdown'
type StudentGradingPeriod = 'midterm' | 'final'

type CreateRequestFormValue = {
  requestType: StudentRequestType
  subjectId: string
  gradingPeriod: '' | StudentGradingPeriod
  message: string
}

type StudentCreateRequestModalProps = {
  isOpen: boolean
  subjects: StudentDashboardSubjectRecord[]
  isSubmitting: boolean
  submissionError: string
  initialRequestType?: StudentRequestType | null
  initialSubjectId?: string | null
  initialGradingPeriod?: StudentGradingPeriod | null
  lockRequestType?: boolean
  lockSubject?: boolean
  onClose: () => void
  onSubmit: (value: {
    requestType: StudentRequestType
    subjectId: string
    gradingPeriod: StudentGradingPeriod
    message: string
  }) => void
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

function formatGradingPeriodLabel(value: StudentGradingPeriod) {
  return value === 'final' ? 'Final' : 'Midterm'
}

function buildSubjectLabel(subject: StudentDashboardSubjectRecord) {
  return `${subject.subjectCode} - ${subject.subjectName}`
}

function getDefaultRequestType(
  value: StudentRequestType | null | undefined,
): StudentRequestType {
  return value === 'grade_breakdown' ? value : 'grade_breakdown'
}

function getInitialFormValue(
  subjects: StudentDashboardSubjectRecord[],
  initialRequestType: StudentRequestType | null | undefined,
  initialSubjectId: string | null | undefined,
  initialGradingPeriod: StudentGradingPeriod | null | undefined,
): CreateRequestFormValue {
  const requestType = getDefaultRequestType(initialRequestType)
  const subject = subjects.find((item) => item.subjectId === initialSubjectId) ?? null
  const postedGradingPeriods = subject?.postedGradingPeriods ?? []
  const defaultGradingPeriod =
    initialGradingPeriod && postedGradingPeriods.includes(initialGradingPeriod)
      ? initialGradingPeriod
      : postedGradingPeriods.length === 1
        ? postedGradingPeriods[0]
        : ''

  return {
    requestType,
    subjectId: subject?.subjectId ?? '',
    gradingPeriod: defaultGradingPeriod,
    message: '',
  }
}

export function StudentCreateRequestModal({
  isOpen,
  subjects,
  isSubmitting,
  submissionError,
  initialRequestType = null,
  initialSubjectId = null,
  initialGradingPeriod = null,
  lockRequestType = false,
  lockSubject = false,
  onClose,
  onSubmit,
}: StudentCreateRequestModalProps) {
  const [formValue, setFormValue] = useState<CreateRequestFormValue>(() =>
    getInitialFormValue(
      subjects,
      initialRequestType,
      initialSubjectId,
      initialGradingPeriod,
    ),
  )

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.subjectId === formValue.subjectId) ?? null,
    [formValue.subjectId, subjects],
  )
  const availableGradingPeriods = selectedSubject?.postedGradingPeriods ?? []

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setFormValue(
      getInitialFormValue(
        subjects,
        initialRequestType,
        initialSubjectId,
        initialGradingPeriod,
      ),
    )
  }, [initialGradingPeriod, initialRequestType, initialSubjectId, isOpen, subjects])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (!availableGradingPeriods.length) {
      if (formValue.gradingPeriod) {
        setFormValue((current) => ({
          ...current,
          gradingPeriod: '',
        }))
      }

      return
    }

    if (
      formValue.gradingPeriod &&
      availableGradingPeriods.includes(formValue.gradingPeriod)
    ) {
      return
    }

    setFormValue((current) => {
      const nextGradingPeriod =
        initialGradingPeriod && availableGradingPeriods.includes(initialGradingPeriod)
          ? initialGradingPeriod
          : availableGradingPeriods.length === 1
            ? availableGradingPeriods[0]
            : ''

      if (current.gradingPeriod === nextGradingPeriod) {
        return current
      }

      return {
        ...current,
        gradingPeriod: nextGradingPeriod,
      }
    })
  }, [
    availableGradingPeriods,
    formValue.gradingPeriod,
    initialGradingPeriod,
    isOpen,
  ])

  if (!isOpen) {
    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formValue.subjectId || !formValue.gradingPeriod) {
      return
    }

    onSubmit({
      requestType: formValue.requestType,
      subjectId: formValue.subjectId,
      gradingPeriod: formValue.gradingPeriod,
      message: formValue.message.trim(),
    })
  }

  return (
    <div
      className="student-request-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="student-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-create-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="student-request-modal-header">
          <div>
            <h2 id="student-create-request-title">Create Request</h2>
            <p>Submit a grade breakdown request using the shared student request system.</p>
          </div>

          <button
            type="button"
            className="student-request-modal-close"
            onClick={onClose}
            aria-label="Close create request modal"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="student-request-modal-form" onSubmit={handleSubmit}>
          <label className="student-request-modal-field">
            <span>Request Type</span>
            <div className="student-request-modal-select">
              <select
                value={formValue.requestType}
                onChange={(event) =>
                  setFormValue((current) => ({
                    ...current,
                    requestType: event.target.value as StudentRequestType,
                  }))
                }
                disabled={lockRequestType || isSubmitting}
              >
                <option value="grade_breakdown">Grade Breakdown</option>
              </select>
              <span className="student-request-modal-select-icon" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </div>
          </label>

          <label className="student-request-modal-field">
            <span>Subject</span>
            <div className="student-request-modal-select">
              <select
                value={formValue.subjectId}
                onChange={(event) =>
                  setFormValue((current) => ({
                    ...current,
                    subjectId: event.target.value,
                  }))
                }
                disabled={lockSubject || isSubmitting}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectId}>
                    {buildSubjectLabel(subject)}
                  </option>
                ))}
              </select>
              <span className="student-request-modal-select-icon" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </div>
          </label>

          <label className="student-request-modal-field">
            <span>Grading Period</span>
            <div className="student-request-modal-select">
              <select
                value={formValue.gradingPeriod}
                onChange={(event) =>
                  setFormValue((current) => ({
                    ...current,
                    gradingPeriod: event.target.value as '' | StudentGradingPeriod,
                  }))
                }
                disabled={
                  isSubmitting ||
                  !selectedSubject ||
                  availableGradingPeriods.length <= 1
                }
              >
                <option value="">
                  {selectedSubject ? 'Select Grading Period' : 'Choose a subject first'}
                </option>
                {availableGradingPeriods.map((gradingPeriod) => (
                  <option key={gradingPeriod} value={gradingPeriod}>
                    {formatGradingPeriodLabel(gradingPeriod)}
                  </option>
                ))}
              </select>
              <span className="student-request-modal-select-icon" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </div>
          </label>

          {!selectedSubject ? (
            <p className="student-request-modal-note">
              Choose one of your enrolled subjects to continue.
            </p>
          ) : !availableGradingPeriods.length ? (
            <p className="student-request-modal-note">
              No posted grades are available for breakdown requests.
            </p>
          ) : null}

          <label className="student-request-modal-field">
            <span>Message</span>
            <textarea
              value={formValue.message}
              onChange={(event) =>
                setFormValue((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="Optional message"
              rows={4}
              disabled={isSubmitting}
            />
          </label>

          {submissionError ? (
            <p className="student-request-modal-error">{submissionError}</p>
          ) : null}

          <div className="student-request-modal-actions">
            <button
              type="button"
              className="student-request-modal-secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="student-request-modal-primary-button"
              disabled={
                isSubmitting ||
                !formValue.subjectId ||
                !formValue.gradingPeriod ||
                !availableGradingPeriods.length
              }
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
