import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { createAbuseConfig } from '../config/abuseLimits.js'
import { sendJson } from '../utils/http.js'

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// IPv6 privacy addresses in the same /64 share a quota; mapped IPv4 shares its IPv4 quota.
export function normalizeAddress(address) {
  address = address.split('%')[0]
  if (isIP(address) === 4) return address
  if (isIP(address) !== 6) return 'unknown'
  const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1)
  const [left, right = ''] = canonical.split('::')
  const start = left ? left.split(':') : []
  const end = right ? right.split(':') : []
  const parts = [...start, ...Array(8 - start.length - end.length).fill('0'), ...end]
    .map(part => Number.parseInt(part, 16))
  if (parts.slice(0, 5).every(part => part === 0) && parts[5] === 65535) {
    return [parts[6] >> 8, parts[6] & 255, parts[7] >> 8, parts[7] & 255].join('.')
  }
  return `${parts.slice(0, 4).map(part => part.toString(16)).join(':')}::/64`
}

export function getClientAddress(req, trustProxyHops = 0) {
  const peer = req.socket.remoteAddress ?? ''
  if (!trustProxyHops) return normalizeAddress(peer)
  const forwarded = req.headers['x-forwarded-for']
  const chain = typeof forwarded === 'string' ? forwarded.split(',').map(ip => ip.trim()) : []
  // Never accept a partial/malformed chain or arbitrary leftmost client input.
  if (chain.length < trustProxyHops || chain.some(ip => !isIP(ip))) return normalizeAddress(peer)
  return normalizeAddress(chain[chain.length - trustProxyHops])
}

export function createAbuseProtection(config = createAbuseConfig(), now = Date.now) {
  const counters = new Map()
  let lastSweep = 0
  let active = 0

  function reject(res, code, retrySeconds, status = 429) {
    res.setHeader('Retry-After', String(retrySeconds))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Connection', 'close')
    const wait = retrySeconds < 60 ? `${retrySeconds} seconds` : `${Math.ceil(retrySeconds / 60)} minutes`
    sendJson(res, status, {
      success: false,
      code,
      retryAfterSeconds: retrySeconds,
      message: code === 'USAGE_LIMIT_EXCEEDED'
        ? `The usage limit has been reached. Please try again in ${wait}.`
        : `Too many requests. Please try again in ${wait}.`,
    })
    return false
  }

  function consume(res, policies) {
    const time = now()
    if (time - lastSweep >= MINUTE || counters.size + policies.length > config.maxEntries) {
      for (const [key, counter] of counters) if (counter.reset <= time) counters.delete(key)
      lastSweep = time
    }
    const pending = policies.map(([key, limit, duration]) => {
      const existing = counters.get(key)
      const counter = existing && existing.reset > time ? existing : { count: 0, reset: time + duration }
      return { key, limit, duration, counter }
    })
    const blocked = pending.filter(item => item.counter.count >= item.limit)
      .sort((a, b) => b.counter.reset - a.counter.reset)[0]
    if (blocked) return reject(res, blocked.duration === DAY ? 'USAGE_LIMIT_EXCEEDED' : 'RATE_LIMIT_EXCEEDED', Math.max(1, Math.ceil((blocked.counter.reset - time) / 1000)))
    if (counters.size + pending.filter(item => !counters.has(item.key)).length > config.maxEntries) {
      return reject(res, 'LIMITER_CAPACITY_REACHED', 60, 503)
    }
    for (const { key, counter } of pending) {
      counter.count += 1
      counters.set(key, counter)
    }
    return true
  }

  function beforeRequest(req, res, pathname) {
    // Keep the lightweight platform liveness probe available even when quotas are exhausted.
    if (req.method === 'GET' && pathname === '/api/health') return true
    const ip = getClientAddress(req, config.trustProxyHops)
    if (!consume(res, [
      ['global:minute', config.globalPerMinute, MINUTE],
      [`ip:${ip}:minute`, config.ipPerMinute, MINUTE],
    ])) return false
    // Preflight consumes the burst budget, but never the application's daily usage budget.
    if (req.method === 'OPTIONS') return true
    if (!consume(res, [
      ['global:day', config.globalPerDay, DAY],
      [`ip:${ip}:day`, config.ipPerDay, DAY],
    ])) return false
    if (req.method === 'POST') {
      const policies = [
        [`ip:${ip}:write-minute`, config.writesPerMinute, MINUTE],
        [`ip:${ip}:write-day`, config.writesPerDay, DAY],
      ]
      if (pathname.startsWith('/api/auth/') || pathname === '/api/instructor/profile/password') {
        policies.push([`ip:${ip}:auth`, config.loginPerWindow, 15 * MINUTE])
      }
      if (pathname === '/api/auth/student/forgot-password') {
        policies.push([`ip:${ip}:reset`, config.resetPerHour, HOUR], ['global:reset-day', config.resetGlobalPerDay, DAY])
      }
      if (pathname === '/api/instructor/students') policies.push([`ip:${ip}:create-day`, config.creationsPerDay, DAY])
      if (pathname === '/api/student/requests') policies.push([`ip:${ip}:request-day`, config.requestsPerDay, DAY])
      if (pathname === '/api/database/google-sheets/init') policies.push(['global:init', config.initPerHour, HOUR])
      if (!consume(res, policies)) return false
    }
    if (active >= config.maxConcurrent) return reject(res, 'SERVER_BUSY', 5, 503)
    active += 1
    let released = false
    const release = () => {
      if (released) return
      released = true
      active -= 1
      res.removeListener('finish', release)
      res.removeListener('close', release)
    }
    res.once('finish', release)
    res.once('close', release)
    return true
  }

  function beforeBodyAction(req, res, pathname, body) {
    if (req.method !== 'POST') return true
    let target
    let reset = false
    if (pathname === '/api/auth/instructor/login') target = typeof body.username === 'string' ? body.username : body.credential
    if (pathname === '/api/auth/student/login') target = typeof body.email === 'string' ? body.email : body.credential
    if (pathname === '/api/auth/student/forgot-password') { target = body.email; reset = true }
    if (pathname === '/api/auth/student/reset-password') target = body.token
    if (pathname === '/api/auth/student/change-password') target = body.email
    if (typeof target !== 'string' || !target.trim()) return true
    const normalized = pathname.endsWith('/reset-password') ? target.trim() : target.trim().toLowerCase()
    const hash = createHash('sha256').update(normalized).digest('hex')
    return consume(res, [[`target:${pathname}:${hash}`, reset ? config.resetTargetPerHour : config.loginTargetPerWindow, reset ? HOUR : 15 * MINUTE]])
  }

  return { beforeRequest, beforeBodyAction }
}
