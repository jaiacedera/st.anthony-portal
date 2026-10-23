export type GradeNotification = { id: string; title: string; detail: string; timestamp: number }
export const gradeNotificationEvent = 'portal-grade-notification'
const key = (username: string) => `grade-notifications:${username}`

export function readGradeNotifications(username: string): GradeNotification[] {
  try { return JSON.parse(sessionStorage.getItem(key(username)) ?? '[]') } catch { return [] }
}

export function notifyGradeEvent(username: string, event: string, title: string, detail: string) {
  const timestamp = Date.now()
  const items = readGradeNotifications(username)
  const recent = items.find(item => item.id.startsWith(`${event}:${detail}:`) && timestamp - item.timestamp < 60000)
  const notification = { id: recent?.id ?? `${event}:${detail}:${timestamp}`, title, detail, timestamp }
  const next = [notification, ...items.filter(item => item.id !== notification.id)].slice(0, 30)
  try { sessionStorage.setItem(key(username), JSON.stringify(next)) } catch { /* The live bell still receives the event. */ }
  window.dispatchEvent(new CustomEvent(gradeNotificationEvent, { detail: { username, items: next } }))
}
