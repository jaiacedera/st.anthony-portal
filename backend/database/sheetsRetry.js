export function isSheetsQuotaError(error) {
  const status = Number(error?.response?.status ?? error?.code)
  const reasons = error?.response?.data?.error?.errors ?? []
  return status === 429 || (status === 403 && reasons.some(({ reason }) =>
    ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason)))
}

// Only retry reads: replaying an append after an ambiguous failure can duplicate rows.
export async function retrySheetsRead(request, {
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  random = Math.random,
} = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request()
    } catch (error) {
      if (!isSheetsQuotaError(error) || attempt >= 4) throw error
      await sleep(1000 * 2 ** attempt + Math.floor(random() * 1000))
    }
  }
}
