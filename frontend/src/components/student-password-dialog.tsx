import { useEffect, useRef, useState, type FormEvent } from 'react'
import { changeStudentPassword } from '../services/studentApi'

export function StudentPasswordDialog({ email, studentId, onClose }: {
  email: string
  studentId: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || success) return
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('Choose a password different from your current password.')
      return
    }
    setIsSaving(true)
    try {
      const result = await changeStudentPassword({ email, studentId, currentPassword, newPassword, confirmPassword })
      setSuccess(result.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to change password. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="student-profile-modal student-password-dialog" aria-labelledby="student-password-title"
      onCancel={event => { event.preventDefault(); if (!isSaving) onClose() }}>
      <div className="student-profile-modal-header">
        <div>
          <h3 id="student-password-title">Change Password</h3>
          <p>Use at least 8 characters for your new password.</p>
        </div>
      </div>
      <form className="student-profile-form" onSubmit={handleSubmit}>
        {success ? (
          <p role="status" className="student-password-success">{success}</p>
        ) : (
          <>
            <label className="student-profile-form-field">
              <span>Current Password</span>
              <input name="currentPassword" type="password" autoComplete="current-password" required disabled={isSaving}
                value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            </label>
            <label className="student-profile-form-field">
              <span>New Password</span>
              <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required disabled={isSaving}
                value={newPassword} onChange={event => setNewPassword(event.target.value)} />
            </label>
            <label className="student-profile-form-field">
              <span>Confirm New Password</span>
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required disabled={isSaving}
                value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            </label>
            {error ? <p role="alert" className="student-profile-form-message">{error}</p> : null}
          </>
        )}
        <div className="student-profile-form-actions">
          <button type="button" className="student-profile-outline-button" disabled={isSaving} onClick={onClose}>
            {success ? 'Done' : 'Cancel'}
          </button>
          {!success ? <button type="submit" className="student-profile-solid-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save New Password'}
          </button> : null}
        </div>
      </form>
    </dialog>
  )
}
