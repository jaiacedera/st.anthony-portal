import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import {
  changeInstructorPassword,
  fetchInstructorProfile,
  updateInstructorProfile,
  type InstructorProfilePayload,
} from '../../services/instructorApi'
import { readInstructorAuth } from '../../utils/instructorAuth'

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.3" />
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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3.4 8 7 10 3.6-2 7-5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
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

type ProfileFormState = {
  fullName: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
}

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
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

function formatLastLogin(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'Not available'
  }

  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'IN'
}

function createProfileFormState(profile?: InstructorProfilePayload['profile'] | null): ProfileFormState {
  return {
    fullName: profile?.fullName ?? '',
    phone: profile?.contactNumber ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    gender: profile?.gender ?? '',
    address: profile?.address ?? '',
  }
}

function createPasswordFormState(): PasswordFormState {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: ReactNode
}) {
  return (
    <div className="instructor-profile-info-row">
      <span className="instructor-profile-info-label">{label}</span>
      <div className="instructor-profile-info-value-wrap">
        <span className="instructor-profile-info-value">{value}</span>
        {action}
      </div>
    </div>
  )
}

export default function InstructorProfilePage() {
  const auth = readInstructorAuth()
  const username = auth?.username ?? ''
  const sessionErrorMessage = username
    ? ''
    : 'No instructor session was found. Please sign in again.'
  const [payload, setPayload] = useState<InstructorProfilePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormState>(createProfileFormState())
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(createPasswordFormState())
  const [modalMessage, setModalMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  useEffect(() => {
    if (!username) {
      setIsLoading(false)
      setErrorMessage('No instructor session was found. Please sign in again.')
      return
    }

    const abortController = new AbortController()

    setIsLoading(true)
    setErrorMessage('')

    fetchInstructorProfile(username, abortController.signal)
      .then((nextPayload) => {
        setPayload(nextPayload)
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load instructor profile data.',
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
    if (!successMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage('')
    }, 7000)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  const profile = payload?.profile ?? null

  useEffect(() => {
    if (!isEditing) {
      setProfileForm(createProfileFormState(profile))
      setModalMessage('')
    }
  }, [isEditing, profile])

  useEffect(() => {
    if (!isChangingPassword) {
      setPasswordForm(createPasswordFormState())
      setPasswordMessage('')
    }
  }, [isChangingPassword])

  const summaryName = formatValue(profile?.fullName ?? '')
  const summaryRole = 'Instructor'
  const accountRole = formatValue(profile?.role ?? '')
  const summaryEmail = formatValue(profile?.email ?? '')
  const summaryJoinedAt = formatJoinedDate(profile?.joinedAt ?? '')
  const employeeId = formatValue(profile?.employeeId ?? '')
  const department = formatValue(profile?.department ?? '')
  const contactNumber = formatValue(profile?.contactNumber ?? '')
  const dateOfBirth = formatFullDate(profile?.dateOfBirth ?? '')
  const gender = formatValue(profile?.gender ?? '')
  const address = formatValue(profile?.address ?? '')
  const usernameValue = formatValue(profile?.username ?? '')
  const lastLogin = formatLastLogin(profile?.lastLogin ?? '')
  const statusLabel = formatValue(profile?.status ?? 'Active')
  const initials = useMemo(() => getInitials(profile?.fullName ?? ''), [profile?.fullName])
  const pageAlerts = [
    sessionErrorMessage,
    errorMessage,
    successMessage,
    payload?.needsBinding ? payload.message ?? '' : '',
  ].filter(Boolean)

  function handleProfileFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handlePasswordFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username) {
      return
    }

    setIsSaving(true)
    setModalMessage('')

    try {
      const nextPayload = await updateInstructorProfile({
        username,
        ...profileForm,
      })

      setPayload(nextPayload)
      setSuccessMessage(nextPayload.message ?? 'Instructor profile updated successfully.')
      setIsEditing(false)
    } catch (error) {
      setModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update instructor profile.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username) {
      return
    }

    setIsChanging(true)
    setPasswordMessage('')

    try {
      const nextPayload = await changeInstructorPassword({
        username,
        ...passwordForm,
      })

      setSuccessMessage(nextPayload.message ?? 'Password changed successfully.')
      setIsChangingPassword(false)
    } catch (error) {
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : 'Unable to change password.',
      )
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <InstructorShell
      active="profile"
      schoolYearLabel={payload?.header.schoolYear ?? 'Loading...'}
      semesterLabel={payload?.header.semester ?? 'Loading...'}
    >
      <section className="instructor-profile-page">
        {pageAlerts.length ? (
          <div className="dashboard-alert-stack" aria-live="polite">
            {pageAlerts.map((message) => (
              <section key={message} className="dashboard-alert-row">
                <div className="dashboard-alert">{message}</div>
              </section>
            ))}
          </div>
        ) : null}

        <section className="instructor-profile-summary">
          <div className="instructor-summary-left">
            <div className="instructor-avatar">
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt={summaryName} className="instructor-avatar-image" />
              ) : (
                <span>{isLoading ? '...' : initials}</span>
              )}

              <button
                type="button"
                className="instructor-avatar-camera"
                aria-label="Change profile photo"
              >
                <CameraIcon />
              </button>
            </div>

            <div className="instructor-summary-copy">
              <h2 className="instructor-summary-name">{isLoading ? 'Loading...' : summaryName}</h2>
              <p className="instructor-summary-role">{isLoading ? 'Loading...' : summaryRole}</p>

              <div className="instructor-summary-meta">
                <div className="instructor-summary-meta-row">
                  <span className="instructor-summary-meta-icon" aria-hidden="true">
                    <MailIcon />
                  </span>
                  <span>{isLoading ? 'Loading...' : summaryEmail}</span>
                </div>

                <div className="instructor-summary-meta-row">
                  <span className="instructor-summary-meta-icon" aria-hidden="true">
                    <CalendarIcon />
                  </span>
                  <span>{isLoading ? 'Loading...' : summaryJoinedAt}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="instructor-summary-right">
            <div className="instructor-summary-detail-row">
              <span className="instructor-summary-detail-label">Employee ID</span>
              <strong className="instructor-summary-detail-value">
                {isLoading ? 'Loading...' : employeeId}
              </strong>
            </div>

            <div className="instructor-summary-detail-row">
              <span className="instructor-summary-detail-label">Department</span>
              <strong className="instructor-summary-detail-value">
                {isLoading ? 'Loading...' : department}
              </strong>
            </div>
          </div>
        </section>

        <section className="instructor-profile-details-grid">
          <article className="instructor-profile-card">
            <div className="instructor-profile-card-header">
              <div className="instructor-profile-card-title-wrap">
                <span className="instructor-profile-card-icon" aria-hidden="true">
                  <EditIcon />
                </span>
                <h2 className="instructor-profile-card-title">Personal Information</h2>
              </div>

              <button
                type="button"
                className="instructor-profile-card-action"
                onClick={() => setIsEditing(true)}
              >
                <EditIcon />
                <span>Edit</span>
              </button>
            </div>

            <div className="instructor-profile-card-body">
              <InfoRow label="Full Name" value={isLoading ? 'Loading...' : summaryName} />
              <InfoRow label="Email" value={isLoading ? 'Loading...' : summaryEmail} />
              <InfoRow label="Contact Number" value={isLoading ? 'Loading...' : contactNumber} />
              <InfoRow label="Date of Birth" value={isLoading ? 'Loading...' : dateOfBirth} />
              <InfoRow label="Gender" value={isLoading ? 'Loading...' : gender} />
              <InfoRow label="Address" value={isLoading ? 'Loading...' : address} />
            </div>
          </article>

          <article className="instructor-profile-card">
            <div className="instructor-profile-card-header">
              <div className="instructor-profile-card-title-wrap">
                <span className="instructor-profile-card-icon" aria-hidden="true">
                  <ShieldIcon />
                </span>
                <h2 className="instructor-profile-card-title">Account Information</h2>
              </div>
            </div>

            <div className="instructor-profile-card-body">
              <InfoRow label="Role" value={isLoading ? 'Loading...' : accountRole} />
              <InfoRow label="Username" value={isLoading ? 'Loading...' : usernameValue} />
              <InfoRow
                label="Password"
                value="••••••••"
                action={(
                  <button
                    type="button"
                    className="instructor-inline-change-button"
                    onClick={() => setIsChangingPassword(true)}
                  >
                    Change
                  </button>
                )}
              />
              <InfoRow label="Last Login" value={isLoading ? 'Loading...' : lastLogin} />
              <InfoRow
                label="Status"
                value=""
                action={(
                  <span className="account-status active">
                    {isLoading ? 'Loading...' : statusLabel}
                  </span>
                )}
              />
            </div>
          </article>
        </section>

        {isEditing ? (
          <div
            className="instructor-profile-modal-overlay"
            onClick={() => {
              if (!isSaving) {
                setIsEditing(false)
              }
            }}
          >
            <section
              className="instructor-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-instructor-profile-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="instructor-profile-modal-header">
                <div>
                  <h3 id="edit-instructor-profile-title">Edit Personal Information</h3>
                  <p>Update your profile details stored in the portal.</p>
                </div>

                <button
                  type="button"
                  className="instructor-profile-modal-close"
                  onClick={() => {
                    if (!isSaving) {
                      setIsEditing(false)
                    }
                  }}
                  aria-label="Close edit profile modal"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="instructor-profile-form" onSubmit={handleProfileSave}>
                <div className="instructor-profile-form-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleProfileFieldChange}
                    placeholder="Full name"
                    disabled={isSaving}
                  />
                </div>

                <div className="instructor-profile-form-field">
                  <span>Email</span>
                  <input type="email" value={profile?.email ?? ''} disabled />
                </div>

                <div className="instructor-profile-form-grid">
                  <div className="instructor-profile-form-field">
                    <span>Contact Number</span>
                    <input
                      type="text"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileFieldChange}
                      placeholder="Contact number"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="instructor-profile-form-field">
                    <span>Date of Birth</span>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={profileForm.dateOfBirth}
                      onChange={handleProfileFieldChange}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="instructor-profile-form-grid">
                  <div className="instructor-profile-form-field">
                    <span>Gender</span>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleProfileFieldChange}
                      disabled={isSaving}
                    >
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="instructor-profile-form-field">
                    <span>Employee ID</span>
                    <input type="text" value={profile?.employeeId ?? ''} disabled />
                  </div>
                </div>

                <div className="instructor-profile-form-field">
                  <span>Address</span>
                  <textarea
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileFieldChange}
                    placeholder="Address"
                    rows={4}
                    disabled={isSaving}
                  />
                </div>

                {modalMessage ? (
                  <p className="instructor-profile-form-message">{modalMessage}</p>
                ) : null}

                <div className="instructor-profile-form-actions">
                  <button
                    type="button"
                    className="instructor-secondary-button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="instructor-primary-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {isChangingPassword ? (
          <div
            className="instructor-profile-modal-overlay"
            onClick={() => {
              if (!isChanging) {
                setIsChangingPassword(false)
              }
            }}
          >
            <section
              className="instructor-profile-modal instructor-profile-modal--compact"
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-instructor-password-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="instructor-profile-modal-header">
                <div>
                  <h3 id="change-instructor-password-title">Change Password</h3>
                  <p>Use your current password to set a new one.</p>
                </div>

                <button
                  type="button"
                  className="instructor-profile-modal-close"
                  onClick={() => {
                    if (!isChanging) {
                      setIsChangingPassword(false)
                    }
                  }}
                  aria-label="Close change password modal"
                >
                  <CloseIcon />
                </button>
              </div>

              <form className="instructor-profile-form" onSubmit={handlePasswordChange}>
                <div className="instructor-profile-form-field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFieldChange}
                    disabled={isChanging}
                  />
                </div>

                <div className="instructor-profile-form-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange}
                    disabled={isChanging}
                  />
                </div>

                <div className="instructor-profile-form-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange}
                    disabled={isChanging}
                  />
                </div>

                {passwordMessage ? (
                  <p className="instructor-profile-form-message">{passwordMessage}</p>
                ) : null}

                <div className="instructor-profile-form-actions">
                  <button
                    type="button"
                    className="instructor-secondary-button"
                    onClick={() => setIsChangingPassword(false)}
                    disabled={isChanging}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="instructor-primary-button"
                    disabled={isChanging}
                  >
                    {isChanging ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </InstructorShell>
  )
}
