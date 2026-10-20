import { getApiBaseUrl } from '../utils/apiBaseUrl'
import { authenticatedFetch } from './authenticatedFetch'
const fetch = authenticatedFetch('INSTRUCTOR')

export type SubjectMembers = {
  professors: Array<{ id: string; name: string; email: string }>
  availableProfessors: Array<{ id: string; name: string; email: string }>
  students: Array<{ id: string; name: string; email: string; yearLevel: string }>
}
export type ProfessorGrade = {
  studentId: string; studentName: string
  knowledge: string; performance: string; attitude: string; myGrade: string; status: string
}
async function request<T>(path: string, input: Record<string, unknown>, save = false, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]))
  const response = await fetch(`${getApiBaseUrl()}/api/instructor/${path}${save ? '' : `?${query}`}`, {
    method: save ? 'POST' : 'GET', signal,
    headers: { 'Content-Type': 'application/json' },
    body: save ? JSON.stringify(input) : undefined,
  })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.message || 'The request failed.')
  return data
}
export const fetchSubjectMembers = (subjectId: string, signal?: AbortSignal) =>
  request<SubjectMembers>('subjects/members', { subjectId }, false, signal)
export const changeProfessor = (subjectId: string, instructorId: string, action: 'add' | 'remove') =>
  request<{ message: string }>('subjects/professors', { subjectId, instructorId, action }, true)
export const fetchProfessorGrades = (subjectId: string, signal?: AbortSignal) =>
  request<{ rows: ProfessorGrade[] }>('grades/independent', { subjectId }, false, signal)
export const saveProfessorGrade = (subjectId: string, row: ProfessorGrade) =>
  request<{ message: string }>('grades/independent', {
    subjectId, studentId: row.studentId,
    knowledge: Number(row.knowledge), performance: Number(row.performance), attitude: Number(row.attitude),
  }, true)
