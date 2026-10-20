import { readJsonBody } from '../utils/request.js'
import { sendJson } from '../utils/http.js'
import { getSubjectGroups, changeSubjectGroup } from '../services/subjectGroupsService.js'

export async function subjectGroupsData(req, res) {
  const input = req.method === 'POST' ? await readJsonBody(req) : Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
  sendJson(res, 200, await (req.method === 'POST' ? changeSubjectGroup : getSubjectGroups)({ ...input, username: req.auth.username }))
}
