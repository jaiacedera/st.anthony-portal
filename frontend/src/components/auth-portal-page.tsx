import { useState } from 'react'
import logoImage from '../assets/student/logo.png'
import '../pages/student/student-auth-page.css'
import { getApiBaseUrl } from '../utils/apiBaseUrl'

const apiBaseUrl = getApiBaseUrl()

type AuthPortalPageProps = {
  portalLabel: 'STUDENT' | 'INSTRUCTOR'
  firstFieldName: string
  firstFieldPlaceholder: string
  forgotPasswordHref: string
}

function FirstFieldIcon() {
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
      <path d="M12 13 3.5 8.5 12 4l8.5 4.5L12 13Z" />
      <path d="M6 10.2V15c0 1.3 2.7 3 6 3s6-1.7 6-3v-4.8" />
    </svg>
  )
}

function InstructorFieldIcon() {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function LockIcon() {
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
      <rect x="5" y="11" width="14" height="10" rx="2.8" />
      <path d="M8 11V8.4a4 4 0 1 1 8 0V11" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
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
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.8" />
      </svg>
    )
  }

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
      <path d="M3 3 21 21" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-4.1 4.5" />
      <path d="M6.1 6.9C3.5 8.6 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.9 9.8A3 3 0 0 0 14.2 14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4.2 4.2L19 6.5" />
    </svg>
  )
}

export function AuthPortalPage({
  portalLabel,
  firstFieldName,
  firstFieldPlaceholder,
  forgotPasswordHref,
}: AuthPortalPageProps) {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isInstructorPortal = portalLabel === 'INSTRUCTOR'
  const leadingFieldIcon = isInstructorPortal ? <InstructorFieldIcon /> : <FirstFieldIcon />

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        isInstructorPortal
          ? `${apiBaseUrl}/api/auth/instructor/login`
          : `${apiBaseUrl}/api/auth/student/login`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isInstructorPortal ? { username: credential } : { email: credential }),
          credential,
          password,
          rememberMe,
        }),
        },
      )

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
        account?: {
          accountId: string
          username: string
          role: string
          instructorId?: string
          studentId?: string
          email?: string
        }
      }

      if (!response.ok || !payload.success || !payload.account) {
        setErrorMessage(
          payload.message ??
            (isInstructorPortal
              ? 'Unable to sign in to the instructor portal.'
              : 'Unable to sign in to the student portal.'),
        )
        return
      }

      const authPayload = JSON.stringify({
        accountId: payload.account.accountId,
        instructorId: payload.account.instructorId,
        studentId: payload.account.studentId,
        email: payload.account.email,
        username: payload.account.username,
        role: payload.account.role,
        rememberMe,
        signedInAt: new Date().toISOString(),
      })

      const storageKey = isInstructorPortal ? 'instructor-auth' : 'student-auth'

      if (rememberMe) {
        window.localStorage.setItem(storageKey, authPayload)
        window.sessionStorage.removeItem(storageKey)
      } else {
        window.sessionStorage.setItem(storageKey, authPayload)
        window.localStorage.removeItem(storageKey)
      }

      window.location.href = isInstructorPortal
        ? '/instructor/dashboard'
        : '/student/dashboard'
    } catch {
      setErrorMessage(
        isInstructorPortal
          ? 'Instructor login is unavailable. Check that the backend service is running and the API URL is configured correctly.'
          : 'Student login is unavailable. Check that the backend service is running and the API URL is configured correctly.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const headingClassName =
    portalLabel === 'INSTRUCTOR'
      ? 'portal-heading portal-heading--instructor'
      : 'portal-heading'

  return (
    <main className="student-auth-page">
      <div className="login-background" aria-hidden="true"></div>
      <div className="login-overlay" aria-hidden="true"></div>

      <header className="school-brand">
        <img
          className="school-brand-logo"
          src={logoImage}
          alt="St. Anthony College Calapan City crest"
        />
        <div className="school-brand-text">
          <h1 className="school-name">St. Anthony College</h1>
          <p className="school-location">CALAPAN CITY INC.</p>
        </div>
      </header>

      <div className="login-card-wrapper">
        <section className="login-container" aria-label={`${portalLabel.toLowerCase()} portal sign in`}>
          <img
            className="portal-logo"
            src={logoImage}
            alt="St. Anthony College Calapan City crest"
          />

          <h2 className={headingClassName}>
            <strong>{portalLabel}</strong> <span>PORTAL</span>
          </h2>

          <p className="auth-subtitle">Welcome back! Please log in to continue.</p>

          <form className="student-auth-form" onSubmit={handleSubmit}>
            <label className="student-number-field">
              <span className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  {leadingFieldIcon}
                </span>
                <input
                  type="text"
                  name={firstFieldName}
                  placeholder={firstFieldPlaceholder}
                  value={credential}
                  onChange={(event) => setCredential(event.target.value)}
                />
              </span>
            </label>

            <label className="password-field">
              <span className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="field-visibility"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </span>
            </label>

            <div className="remember-actions">
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className="remember-checkbox" aria-hidden="true">
                  <CheckIcon />
                </span>
                <span>Remember me</span>
              </label>

              <a className="forgot-password" href={forgotPasswordHref}>
                Forgot password?
              </a>
            </div>

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'SIGNING IN...' : 'LOG IN'}
            </button>

            {errorMessage ? <p className="auth-error-message">{errorMessage}</p> : null}
          </form>
        </section>
      </div>
    </main>
  )
}
