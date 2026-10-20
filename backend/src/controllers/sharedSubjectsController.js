import { readJsonBody } from '../utils/request.js'
import { sendJson } from '../utils/http.js'
import { getSubjectMembers, changeSubjectProfessor, getProfessorGrades, saveProfessorGrade } from '../services/sharedSubjectsService.js'

export async function subjectMembersData(req, res) {
  const input = req.method === 'POST' ? await readJsonBody(req) : Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
  sendJson(res, 200, await (req.method === 'POST' ? changeSubjectProfessor : getSubjectMembers)({ ...input, username: req.auth.username }))
}
export async function professorGradesData(req, res) {
  const input = req.method === 'POST' ? await readJsonBody(req) : Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
  // instructorId in the submitted body is deliberately never used.
  sendJson(res, 200, await (req.method === 'POST' ? saveProfessorGrade : getProfessorGrades)({ ...input, username: req.auth.username }))
}
