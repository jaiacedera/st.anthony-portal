import { useMemo, useState } from 'react'
import logoImage from '../../assets/student/logo.png'
import { getApiBaseUrl } from '../../utils/apiBaseUrl'
import { navigateTo } from '../../utils/navigation'
import './student-auth-page.css'

const apiBaseUrl = getApiBaseUrl()

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.8" />
      <path d="M8 11V8.4a4 4 0 1 1 8 0V11" />
    </svg>
  )
}

export default function StudentResetPasswordPage() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token')?.trim() ?? '',
    [],
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/student/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      })
      const payload = (await response.json()) as { success?: boolean; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? 'Unable to reset password.')
        return
      }

      setSuccessMessage(payload.message ?? 'Your password has been reset successfully. You can now sign in.')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setErrorMessage('Password reset is unavailable right now. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="student-auth-page">
      <div className="login-background" aria-hidden="true"></div>
      <div className="login-overlay" aria-hidden="true"></div>

      <header className="school-brand">
        <img className="school-brand-logo" src={logoImage} alt="St. Anthony College Calapan City crest" />
        <div className="school-brand-text">
          <h1 className="school-name">St. Anthony College</h1>
          <p className="school-location">CALAPAN CITY INC.</p>
        </div>
      </header>

      <div className="login-card-wrapper">
        <section className="login-container login-container--support" aria-label="student portal password reset">
          <h2 className="portal-heading portal-heading--static">
            <strong>Reset Password</strong>
          </h2>
          <p className="auth-subtitle auth-subtitle--static">
            Choose a new password for your student portal account.
          </p>

          <form className="support-auth-form" onSubmit={handleSubmit}>
            <label className="support-auth-field">
              <span>New Password</span>
              <span className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="New password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </span>
            </label>

            <label className="support-auth-field">
              <span>Confirm Password</span>
              <span className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </span>
            </label>

            <div className="support-auth-actions">
              <button
                type="button"
                className="support-auth-button support-auth-button--secondary"
                onClick={() => navigateTo('/student')}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="support-auth-button" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save New Password'}
              </button>
            </div>

            {errorMessage ? <p className="auth-error-message auth-error-message--static">{errorMessage}</p> : null}
            {successMessage ? (
              <div className="support-auth-success-stack">
                <p className="auth-success-message auth-success-message--static">{successMessage}</p>
                <button type="button" className="support-auth-link" onClick={() => navigateTo('/student')}>
                  Back to Student Login
                </button>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}
