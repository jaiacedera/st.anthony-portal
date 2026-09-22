import { useState } from 'react'
import logoImage from '../../assets/student/logo.png'
import { getApiBaseUrl } from '../../utils/apiBaseUrl'
import { navigateTo } from '../../utils/navigation'
import './student-auth-page.css'

const apiBaseUrl = getApiBaseUrl()

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

export default function StudentForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/student/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })
      const payload = (await response.json()) as { success?: boolean; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? 'Unable to start password reset.')
        return
      }

      setSuccessMessage(
        payload.message ?? 'If an active account uses that email, you will receive a password reset link.',
      )
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
        <section className="login-container login-container--support" aria-label="student portal password reset request">
          <h2 className="portal-heading portal-heading--static">
            <strong>Forgot Password</strong>
          </h2>
          <p className="auth-subtitle auth-subtitle--static">
            Enter your registered email to receive a link where you can choose a new password.
          </p>

          <form className="support-auth-form" onSubmit={handleSubmit}>
            <label className="support-auth-field">
              <span>Email</span>
              <span className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  <EmailIcon />
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  placeholder="student@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                Back to Login
              </button>
              <button type="submit" className="support-auth-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            {errorMessage ? <p role="alert" className="auth-error-message auth-error-message--static">{errorMessage}</p> : null}
            {successMessage ? (
              <div role="status" className="support-auth-success-stack">
                <p className="auth-success-message auth-success-message--static">{successMessage}</p>
                <p>Check your inbox and spam folder. The link expires in one hour. If you request another link, use the most recent email.</p>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}
