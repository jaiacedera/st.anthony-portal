import { randomUUID } from 'node:crypto'
import { SHEET_NAMES as S } from '../../database/sheetsSchema.js'
import { getAllRows, findRows, appendRow, updateRowById, deleteRowById } from '../../database/sheetsService.js'
import { subjectContext } from './sharedSubjectsService.js'
import { withWriteLock } from '../utils/writeLock.js'

const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }) }
async function readGroups(subjectId) {
  const groups = await findRows(S.SUBJECT_GROUPS, { subject_id: subjectId })
  const members = (await getAllRows(S.SUBJECT_GROUP_MEMBERS)).filter(member => groups.some(group => group.id === member.group_id))
  return { success: true, groups, members }
}
export async function getSubjectGroups({ username, subjectId }) {
  await subjectContext(username, subjectId)
  return readGroups(subjectId)
}
export async function changeSubjectGroup({ username, subjectId, action, groupId, groupName, studentId }) {
  // Deleting Sheets rows shifts row indices, so serialize group writes across subjects too.
  return withWriteLock('subject-groups', () => withWriteLock(subjectId, async () => {
    await subjectContext(username, subjectId)
    const { groups, members } = await readGroups(subjectId)
    const group = groups.find(item => item.id === groupId)
    if (action !== 'create' && !(action === 'assign' && groupId === '') && !group) fail('Group does not belong to this subject.')
    if (action === 'create' || action === 'rename') {
      const name = typeof groupName === 'string' ? groupName.trim() : ''
      if (!name || name.length > 100) fail('Enter a group name of 1–100 characters.')
      if (groups.some(item => item.id !== groupId && item.group_name.toLowerCase() === name.toLowerCase())) fail('This group name already exists.')
      if (action === 'create') await appendRow(S.SUBJECT_GROUPS, { id: randomUUID(), subject_id: subjectId, group_name: name, created_at: new Date().toISOString() })
      else await updateRowById(S.SUBJECT_GROUPS, 'id', groupId, { group_name: name })
    } else if (action === 'delete') {
      for (const member of members.filter(item => item.group_id === groupId)) await deleteRowById(S.SUBJECT_GROUP_MEMBERS, 'id', member.id)
      await deleteRowById(S.SUBJECT_GROUPS, 'id', groupId)
    } else if (action === 'assign') {
      const enrollment = await findRows(S.SUBJECT_STUDENTS, { subject_id: subjectId, student_id: studentId, status: 'ACTIVE' })
      if (!studentId || !enrollment.length) fail('Student is not enrolled in this subject.')
      const existing = members.filter(item => item.student_id === studentId)
      if (groupId && existing.length) {
        await updateRowById(S.SUBJECT_GROUP_MEMBERS, 'id', existing[0].id, { group_id: groupId, added_at: new Date().toISOString() })
        for (const duplicate of existing.slice(1)) await deleteRowById(S.SUBJECT_GROUP_MEMBERS, 'id', duplicate.id)
      } else if (groupId) {
        await appendRow(S.SUBJECT_GROUP_MEMBERS, { id: randomUUID(), group_id: groupId, student_id: studentId, added_at: new Date().toISOString() })
      } else {
        for (const member of existing) await deleteRowById(S.SUBJECT_GROUP_MEMBERS, 'id', member.id)
      }
    } else fail('Invalid group action.')
    return readGroups(subjectId)
  }))
}
