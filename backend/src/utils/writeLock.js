const queues = new Map()

// Serialize related writes within one backend process, including retries.
export async function withWriteLock(key, work) {
  const previous = queues.get(key) || Promise.resolve()
  const next = previous.catch(() => {}).then(work)
  queues.set(key, next)
  try { return await next } finally { if (queues.get(key) === next) queues.delete(key) }
}
