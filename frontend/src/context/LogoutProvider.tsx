import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { LogoutContext, type LogoutPortal } from './logout'
import { clearLogoutSession } from '../utils/logout'
import logoImage from '../assets/student/logo.png'
import '../components/logout-screen.css'

export function LogoutProvider({ children }: { children: ReactNode }) {
  const [portal, setPortal] = useState<LogoutPortal | null>(null)
  const isLoggingOut = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!portal) return
    headingRef.current?.focus()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      isLoggingOut.current = false
      setPortal(null)
    }, reducedMotion ? 200 : 900)
    return () => window.clearTimeout(timer)
  }, [portal])

  function logout(nextPortal: LogoutPortal) {
    if (isLoggingOut.current) return
    isLoggingOut.current = true
    // Unmount protected pages before removing their session, including pending requests.
    flushSync(() => setPortal(nextPortal))
    clearLogoutSession(nextPortal)
  }

  return (
    <LogoutContext.Provider value={logout}>
      {portal ? (
        <main className="logout-screen" aria-busy="true">
          <section className="logout-screen-content" role="status" aria-live="polite">
            <div className="logout-screen-emblem" aria-hidden="true">
              <span className="logout-screen-ring" />
              <img src={logoImage} alt="" />
            </div>
            <h1 ref={headingRef} tabIndex={-1}>Signing you out…</h1>
            <p>See you next time.</p>
            <div className="logout-screen-progress" aria-hidden="true"><span /></div>
          </section>
        </main>
      ) : children}
    </LogoutContext.Provider>
  )
}
