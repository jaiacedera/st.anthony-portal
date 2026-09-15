const settings = {
  ipPerMinute: ['RATE_LIMIT_IP_PER_MINUTE', 600],
  globalPerMinute: ['RATE_LIMIT_GLOBAL_PER_MINUTE', 1200],
  ipPerDay: ['USAGE_LIMIT_IP_PER_DAY', 30000],
  globalPerDay: ['USAGE_LIMIT_GLOBAL_PER_DAY', 100000],
  writesPerMinute: ['RATE_LIMIT_WRITES_PER_MINUTE', 120],
  writesPerDay: ['USAGE_LIMIT_WRITES_PER_DAY', 2000],
  loginPerWindow: ['RATE_LIMIT_LOGIN_PER_15_MINUTES', 300],
  loginTargetPerWindow: ['RATE_LIMIT_LOGIN_TARGET_PER_15_MINUTES', 10],
  resetPerHour: ['RATE_LIMIT_PASSWORD_RESET_PER_HOUR', 20],
  resetTargetPerHour: ['RATE_LIMIT_PASSWORD_RESET_TARGET_PER_HOUR', 3],
  resetGlobalPerDay: ['USAGE_LIMIT_PASSWORD_RESET_GLOBAL_PER_DAY', 200],
  creationsPerDay: ['USAGE_LIMIT_STUDENT_CREATIONS_PER_DAY', 200],
  requestsPerDay: ['USAGE_LIMIT_STUDENT_REQUESTS_PER_DAY', 500],
  initPerHour: ['RATE_LIMIT_DATABASE_INIT_PER_HOUR', 3],
  maxConcurrent: ['API_MAX_CONCURRENT_REQUESTS', 40],
  maxBodyBytes: ['API_MAX_BODY_BYTES', 1048576],
  maxEntries: ['RATE_LIMIT_MAX_KEYS', 50000],
  trustProxyHops: ['RATE_LIMIT_TRUST_PROXY_HOPS', 0],
}

export function createAbuseConfig(values = {}) {
  return Object.fromEntries(Object.entries(settings).map(([key, [name, fallback]]) => {
    const value = values[name] === undefined ? fallback : Number(values[name])
    if (!Number.isSafeInteger(value) || value < (key === 'trustProxyHops' ? 0 : 1)) {
      throw new Error(`${name} must be a ${key === 'trustProxyHops' ? 'non-negative' : 'positive'} integer.`)
    }
    return [key, value]
  }))
}
