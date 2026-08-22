import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { StudentShell } from '../../components/student-shell'
import {
  fetchStudentDashboard,
  updateStudentProfile,
  type StudentDashboardPayload,
} from '../../services/studentApi'
import { navigateTo } from '../../utils/navigation'
import {
  clearStudentAuth,
  isInvalidStudentSessionMessage,
  readStudentAuth,
} from '../../utils/studentAuth'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.8" />
      <path d="M8 11V8.4a4 4 0 1 1 8 0V11" />
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

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7 10.4a16 16 0 0 0 6.6 6.6l1.9-1.9a2 2 0 0 1 1.8-.6l3 .5A2 2 0 0 1 22 16.9Z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M8 2.8v4" />
      <path d="M16 2.8v4" />
      <path d="M3 9.5h18" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.3" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a8.5 8.5 0 0 1 15 0" />
    </svg>
  )
}

type StudentProfileFormState = {
  studentNumber: string
  firstName: string
  middleName: string
  lastName: string
  yearLevel: string
  phone: string
  address: string
  dateOfBirth: string
  gender: string
}

function formatValue(value: string) {
  return value.trim() || 'Not set'
}

function formatFullDate(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'Not set'
  }

  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function formatJoinedDate(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'Joined date not available'
  }

  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return 'Joined date not available'
  }

  return `Joined ${new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(parsed)}`
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'ST'
}

function createProfileFormState(student?: StudentDashboardPayload['student'] | null): StudentProfileFormState {
  return {
    studentNumber: student?.studentNumber ?? '',
    firstName: student?.firstName ?? '',
    middleName: student?.middleName ?? '',
    lastName: student?.lastName ?? '',
    yearLevel: student?.yearLevel ?? '',
    phone: student?.phone ?? '',
    address: student?.address ?? '',
    dateOfBirth: student?.dateOfBirth ?? '',
    gender: student?.gender ?? '',
  }
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="student-profile-info-row">
      <span className="student-profile-info-label">{label}</span>
      <span className="student-profile-info-value">{value}</span>
    </div>
  )
}

export default function StudentProfilePage() {
  const auth = readStudentAuth()
  const hasStudentIdentity = Boolean(auth?.studentId || auth?.email || auth?.username)
  const sessionErrorMessage = hasStudentIdentity
    ? ''
    : 'No student session was found. Please sign in again.'
  const [dashboard, setDashboard] = useState<StudentDashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [profileForm, setProfileForm] = useState<StudentProfileFormState>(
    createProfileFormState(),
  )

  useEffect(() => {
    if (!hasStudentIdentity) {
      return
    }

    const abortController = new AbortController()

    fetchStudentDashboard(
      {
        studentId: auth?.studentId,
        email: auth?.email ?? auth?.username,
      },
      abortController.signal,
    )
      .then((payload) => {
        setDashboard(payload)
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof Error && isInvalidStudentSessionMessage(error.message)) {
          clearStudentAuth()
          navigateTo('/student', { replace: true })
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load student profile data.',
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
  }, [auth?.email, auth?.studentId, auth?.username, hasStudentIdentity])

  const profile = dashboard?.student

  useEffect(() => {
    if (!isEditing) {
      setProfileForm(createProfileFormState(profile))
    }
  }, [isEditing, profile])

  const fullName = formatValue(profile?.fullName ?? '')
  const studentNumber = formatValue(profile?.studentNumber ?? '')
  const courseYear = formatValue(profile?.yearLevel ?? '')
  const email = formatValue(profile?.email ?? '')
  const phone = formatValue(profile?.phone ?? '')
  const address = formatValue(profile?.address ?? '')
  const dateOfBirth = formatFullDate(profile?.dateOfBirth ?? '')
  const gender = formatValue(profile?.gender ?? '')
  const joinedAt = formatJoinedDate(profile?.createdAt ?? '')

  function handleEditOpen() {
    setProfileForm(createProfileFormState(profile))
    setSaveMessage('')
    setIsEditing(true)
  }

  function handleEditClose() {
    setIsEditing(false)
    setSaveMessage('')
    setProfileForm(createProfileFormState(profile))
  }

  function handleFormChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSaveMessage('')

    try {
      const payload = await updateStudentProfile({
        studentId: auth?.studentId,
        email: auth?.email ?? auth?.username,
        ...profileForm,
      })

      setDashboard((current) =>
        current
          ? {
              ...current,
              student: payload.student,
            }
          : current,
      )
      setSaveMessage(payload.message ?? 'Student profile updated successfully.')
      setIsEditing(false)
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : 'Unable to update student profile.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <StudentShell
      active="profile"
      schoolYearLabel={dashboard?.header.schoolYear ?? 'Loading...'}
      semesterLabel={dashboard?.header.semester ?? 'Loading...'}
      notificationCount={dashboard?.stats.pendingRequestCount ?? 0}
    >
      <section className="student-profile-page">
        {sessionErrorMessage || errorMessage ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            <section className="dashboard-alert-row">
              <div className="dashboard-alert">{sessionErrorMessage || errorMessage}</div>
            </section>
          </div>
        ) : null}

        <div className="student-profile-layout">
          <aside className="instructor-panel student-profile-summary">
            <div className="student-profile-avatar-shell">
              <div className="student-profile-avatar-ring">
                <div className="student-profile-avatar-core">
                  {isLoading ? '...' : getInitials(fullName)}
                </div>
                <span className="student-profile-avatar-chip" aria-hidden="true">
                  <CameraIcon />
                </span>
              </div>
            </div>

            <div className="student-profile-summary-content">
              <div className="student-profile-heading">
                <h2 className="student-profile-summary-title">{isLoading ? 'Loading...' : fullName}</h2>
                <p>{isLoading ? 'Loading...' : courseYear}</p>
                <span>{isLoading ? 'Loading...' : studentNumber}</span>
              </div>

              <div className="student-profile-contact-list student-profile-summary-meta">
                <div className="student-profile-contact-row student-profile-contact-row--email student-profile-summary-meta-row">
                  <span className="student-profile-contact-icon" aria-hidden="true">
                    <MailIcon />
                  </span>
                  <span className="student-profile-contact-value student-profile-summary-meta-value">
                    {isLoading ? 'Loading...' : email}
                  </span>
                </div>

                <div className="student-profile-contact-row student-profile-contact-row--phone student-profile-summary-meta-row">
                  <span className="student-profile-contact-icon" aria-hidden="true">
                    <PhoneIcon />
                  </span>
                  <span className="student-profile-contact-value student-profile-summary-meta-value">
                    {isLoading ? 'Loading...' : phone}
                  </span>
                </div>

                <div className="student-profile-contact-row student-profile-contact-row--address student-profile-summary-meta-row">
                  <span className="student-profile-contact-icon" aria-hidden="true">
                    <PinIcon />
                  </span>
                  <span className="student-profile-contact-value student-profile-summary-meta-value">
                    {isLoading ? 'Loading...' : address}
                  </span>
                </div>

                <div className="student-profile-contact-row student-profile-contact-row--joined student-profile-summary-meta-row">
                  <span className="student-profile-contact-icon" aria-hidden="true">
                    <CalendarIcon />
                  </span>
                  <span className="student-profile-contact-value student-profile-summary-meta-value">
                    {isLoading ? 'Loading...' : joinedAt}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="student-profile-main">
            <article className="instructor-panel student-profile-card">
              <div className="student-profile-card-header">
                <h3>Personal Information</h3>
                <button
                  type="button"
                  className="student-profile-outline-button"
                  onClick={handleEditOpen}
                  disabled={isLoading}
                >
                  <EditIcon />
                  <span>Edit</span>
                </button>
              </div>

              <div className="student-profile-info-grid">
                <ProfileInfoRow label="Full Name" value={isLoading ? 'Loading...' : fullName} />
                <ProfileInfoRow label="Student ID" value={isLoading ? 'Loading...' : studentNumber} />
                <ProfileInfoRow label="Course & Year" value={isLoading ? 'Loading...' : courseYear} />
                <ProfileInfoRow label="Email" value={isLoading ? 'Loading...' : email} />
                <ProfileInfoRow label="Phone" value={isLoading ? 'Loading...' : phone} />
                <ProfileInfoRow label="Address" value={isLoading ? 'Loading...' : address} />
                <ProfileInfoRow label="Date of Birth" value={isLoading ? 'Loading...' : dateOfBirth} />
                <ProfileInfoRow label="Gender" value={isLoading ? 'Loading...' : gender} />
              </div>
            </article>

            <article className="instructor-panel student-profile-card student-profile-card--security">
              <div className="student-profile-card-header">
                <h3>Security</h3>
              </div>

              <div className="student-profile-security-row">
                <span className="student-profile-security-icon" aria-hidden="true">
                  <PersonIcon />
                </span>
                <p>Manage your password and account security.</p>
              </div>

              <div className="student-profile-security-actions">
                <button type="button" className="student-profile-solid-button">
                  <LockIcon />
                  <span>Change Password</span>
                </button>
              </div>
            </article>
          </div>
        </div>

        {isEditing ? (
          <div className="student-profile-modal-backdrop" role="presentation">
            <div
              className="student-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-profile-edit-title"
            >
              <div className="student-profile-modal-header">
                <div>
                  <h3 id="student-profile-edit-title">Edit Profile</h3>
                  <p>Update your personal information.</p>
                </div>
                <button
                  type="button"
                  className="student-profile-outline-button"
                  onClick={handleEditClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>

              <form className="student-profile-form" onSubmit={handleProfileSave}>
                <label className="student-profile-form-field">
                  <span>Email</span>
                  <input type="email" value={profile?.email ?? ''} disabled />
                </label>

                <label className="student-profile-form-field">
                  <span>Student ID</span>
                  <input
                    type="text"
                    name="studentNumber"
                    value={profileForm.studentNumber}
                    onChange={handleFormChange}
                  />
                </label>

                <div className="student-profile-form-grid">
                  <label className="student-profile-form-field">
                    <span>First Name</span>
                    <input
                      type="text"
                      name="firstName"
                      value={profileForm.firstName}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label className="student-profile-form-field">
                    <span>Middle Name</span>
                    <input
                      type="text"
                      name="middleName"
                      value={profileForm.middleName}
                      onChange={handleFormChange}
                    />
                  </label>
                </div>

                <label className="student-profile-form-field">
                  <span>Last Name</span>
                  <input
                    type="text"
                    name="lastName"
                    value={profileForm.lastName}
                    onChange={handleFormChange}
                  />
                </label>

                <label className="student-profile-form-field">
                  <span>Course &amp; Year</span>
                  <input
                    type="text"
                    name="yearLevel"
                    value={profileForm.yearLevel}
                    onChange={handleFormChange}
                  />
                </label>

                <div className="student-profile-form-grid">
                  <label className="student-profile-form-field">
                    <span>Phone</span>
                    <input
                      type="text"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label className="student-profile-form-field">
                    <span>Gender</span>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleFormChange}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </label>
                </div>

                <div className="student-profile-form-grid">
                  <label className="student-profile-form-field">
                    <span>Date of Birth</span>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={profileForm.dateOfBirth}
                      onChange={handleFormChange}
                    />
                  </label>
                </div>

                <label className="student-profile-form-field">
                  <span>Address</span>
                  <textarea
                    name="address"
                    rows={3}
                    value={profileForm.address}
                    onChange={handleFormChange}
                  />
                </label>

                {saveMessage ? (
                  <p className="student-profile-form-message">{saveMessage}</p>
                ) : null}

                <div className="student-profile-form-actions">
                  <button
                    type="button"
                    className="student-profile-outline-button"
                    onClick={handleEditClose}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="student-profile-solid-button" disabled={isSaving}>
                    <EditIcon />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </StudentShell>
  )
}
