import { useEffect, useRef, useState } from 'react'
import { changeSubjectGroup, fetchSubjectGroups, type SubjectGroups } from '../services/sharedSubjectsApi'

export function useSubjectGroups(subjectId: string) {
  const [result, setResult] = useState<{ subjectId: string; data: SubjectGroups } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  useEffect(() => {
    if (!subjectId) return
    const controller = new AbortController()
    const version = ++revision.current
    fetchSubjectGroups(subjectId, controller.signal).then(data => {
      if (!controller.signal.aborted && version === revision.current) { setResult({ subjectId, data }); setError('') }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [subjectId])
  const data = result?.subjectId === subjectId ? result.data : null
  async function change(input: Record<string, string>) {
    const version = ++revision.current
    setBusy(true)
    setError('')
    try {
      const data = await changeSubjectGroup(subjectId, input)
      if (version === revision.current) setResult({ subjectId, data })
      return true
    }
    catch (error) {
      if (version === revision.current) setError(error instanceof Error ? error.message : 'Unable to update groups.')
      return false
    }
    finally { setBusy(false) }
  }
  return { groups: data?.groups ?? [], members: data?.members ?? [], ready: Boolean(data), error, busy, change }
}

