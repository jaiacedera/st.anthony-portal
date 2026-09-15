import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { request } from 'node:http'
import test from 'node:test'
import { createAbuseConfig } from '../config/abuseLimits.js'
import { createAbuseProtection, getClientAddress, normalizeAddress } from './abuseProtection.js'
import { createApp } from '../app.js'
import { readJsonBody } from '../utils/request.js'
import { sendJson } from '../utils/http.js'

function response() {
  const res = new EventEmitter()
  res.headers = {}
  res.setHeader = (name, value) => { res.headers[name] = value }
  res.writeHead = status => { res.status = status }
  res.end = body => { res.body = JSON.parse(body); res.emit('finish') }
  return res
}
function req(ip = '192.0.2.1', method = 'GET', headers = {}) {
  return { socket: { remoteAddress: ip }, method, headers }
}
function attempt(limiter, path = '/api/instructor/dashboard', ip, method) {
  const res = response()
  const allowed = limiter.beforeRequest(req(ip, method), res, path)
  if (allowed) res.emit('finish')
  return { allowed, res }
}

test('IP burst limits reset and cannot be bypassed by switching routes or user identifiers', () => {
  let time = 1000
  const limiter = createAbuseProtection({ ...createAbuseConfig(), ipPerMinute: 2 }, () => time)
  assert.equal(attempt(limiter).allowed, true)
  assert.equal(attempt(limiter, '/api/student/dashboard').allowed, true)
  const blocked = attempt(limiter, '/api/unknown')
  assert.equal(blocked.res.status, 429)
  assert.equal(blocked.res.headers['Retry-After'], '60')
  assert.equal(blocked.res.body.success, false)
  assert.equal(attempt(limiter, undefined, '192.0.2.2').allowed, true)
  time += 60000
  assert.equal(attempt(limiter).allowed, true)
})

test('daily quotas outlast the minute window and blocked calls do not extend their reset', () => {
  let time = 1000
  const limiter = createAbuseProtection({ ...createAbuseConfig(), ipPerDay: 1 }, () => time)
  assert.equal(attempt(limiter).allowed, true)
  time += 60000
  const blocked = attempt(limiter)
  assert.equal(blocked.res.body.code, 'USAGE_LIMIT_EXCEEDED')
  assert.equal(blocked.res.headers['Retry-After'], '86340')
  time += 86400000
  assert.equal(attempt(limiter).allowed, true)
})

test('site-wide budgets cover multiple clients; health checks remain available', () => {
  const limiter = createAbuseProtection({ ...createAbuseConfig(), globalPerDay: 1 })
  assert.equal(attempt(limiter).allowed, true)
  assert.equal(attempt(limiter, undefined, '192.0.2.2').allowed, false)
  assert.equal(attempt(limiter, '/api/health').allowed, true)
})

test('preflight is burst limited without consuming daily usage', () => {
  const limiter = createAbuseProtection({ ...createAbuseConfig(), ipPerDay: 1, ipPerMinute: 3 })
  assert.equal(attempt(limiter, '/api/student/profile', undefined, 'OPTIONS').allowed, true)
  assert.equal(attempt(limiter).allowed, true)
  assert.equal(attempt(limiter, '/', undefined, 'OPTIONS').allowed, true)
  assert.equal(attempt(limiter, '/', undefined, 'OPTIONS').allowed, false)
})

test('write, creation, request and database initialization limits stop costly handlers', () => {
  for (const [setting, path] of [
    ['writesPerMinute', '/api/instructor/profile'],
    ['writesPerDay', '/api/instructor/grades/post'],
    ['creationsPerDay', '/api/instructor/students'],
    ['requestsPerDay', '/api/student/requests'],
    ['initPerHour', '/api/database/google-sheets/init'],
    ['resetPerHour', '/api/auth/student/forgot-password'],
    ['loginPerWindow', '/api/auth/student/login'],
  ]) {
    const limiter = createAbuseProtection({ ...createAbuseConfig(), [setting]: 1 })
    assert.equal(attempt(limiter, path, undefined, 'POST').allowed, true, setting)
    assert.equal(attempt(limiter, path, undefined, 'POST').allowed, false, setting)
    assert.equal(attempt(limiter).allowed, true, 'reads remain available')
  }
})

test('login and reset targets share budgets across IPs, aliases and letter case', () => {
  const limiter = createAbuseProtection({ ...createAbuseConfig(), loginTargetPerWindow: 1, resetTargetPerHour: 1 })
  const path = '/api/auth/student/login'
  assert.equal(limiter.beforeBodyAction(req('192.0.2.1', 'POST'), response(), path, { email: ' Person@Example.com ' }), true)
  const blocked = response()
  assert.equal(limiter.beforeBodyAction(req('192.0.2.2', 'POST'), blocked, path, { email: 123, credential: 'person@example.com' }), false)
  assert.equal(blocked.status, 429)
  const resetPath = '/api/auth/student/forgot-password'
  assert.equal(limiter.beforeBodyAction(req(undefined, 'POST'), response(), resetPath, { email: 'person@example.com' }), true)
  assert.equal(limiter.beforeBodyAction(req(undefined, 'POST'), response(), resetPath, { email: 'PERSON@example.com' }), false)
})

test('untrusted forwarded headers are ignored and configured hops are read from the right', () => {
  const incoming = req('10.0.0.1', 'GET', { 'x-forwarded-for': '192.0.2.55, 198.51.100.9' })
  assert.equal(getClientAddress(incoming), '10.0.0.1')
  assert.equal(getClientAddress(incoming, 1), '198.51.100.9')
  assert.equal(getClientAddress(incoming, 2), '192.0.2.55')
  assert.equal(getClientAddress(incoming, 3), '10.0.0.1')
  assert.equal(getClientAddress(req('10.0.0.1', 'GET', { 'x-forwarded-for': 'garbage' }), 1), '10.0.0.1')
  assert.equal(normalizeAddress('::ffff:192.0.2.1'), normalizeAddress('192.0.2.1'))
  assert.equal(normalizeAddress('2001:db8:1:2::1'), normalizeAddress('2001:0db8:0001:0002:ffff::1234'))
  assert.notEqual(normalizeAddress('2001:db8:1:2::1'), normalizeAddress('2001:db8:1:3::1'))
})

test('concurrency is released once on finish or disconnect', () => {
  const limiter = createAbuseProtection({ ...createAbuseConfig(), maxConcurrent: 1 })
  const first = response()
  assert.equal(limiter.beforeRequest(req(), first, '/api/student/dashboard'), true)
  assert.equal(attempt(limiter).res.status, 503)
  first.emit('close')
  first.emit('finish')
  const next = response()
  assert.equal(limiter.beforeRequest(req(), next, '/api/student/dashboard'), true)
  assert.equal(attempt(limiter).res.status, 503)
})

test('full counter storage fails closed instead of evicting active quotas', () => {
  const limiter = createAbuseProtection({ ...createAbuseConfig(), maxEntries: 4 })
  assert.equal(attempt(limiter).allowed, true)
  assert.equal(attempt(limiter, undefined, '192.0.2.2').res.status, 503)
})

test('invalid configuration cannot silently disable protection', () => {
  for (const value of ['0', '-1', 'NaN', '', '1.5']) {
    assert.throws(() => createAbuseConfig({ RATE_LIMIT_IP_PER_MINUTE: value }))
  }
  assert.equal(createAbuseConfig({ RATE_LIMIT_TRUST_PROXY_HOPS: '0' }).trustProxyHops, 0)
})

async function startServer(t, limits) {
  let calls = 0
  const server = createApp({ limits: { ...createAbuseConfig(), ...limits }, routeResolver: () => async (req, res) => {
    calls += 1
    const body = req.method === 'POST' ? await readJsonBody(req) : {}
    sendJson(res, 200, { success: true, body })
  } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)) })
  return { url: `http://127.0.0.1:${server.address().port}`, calls: () => calls }
}

test('HTTP integration blocks quota violations before the route and exposes retry guidance', async t => {
  const server = await startServer(t, { ipPerMinute: 1 })
  assert.equal((await fetch(`${server.url}/api/student/dashboard`)).status, 200)
  const blocked = await fetch(`${server.url}/api/instructor/dashboard?username=another-user`, { headers: { 'X-Forwarded-For': '192.0.2.3' } })
  assert.equal(blocked.status, 429)
  assert.equal(blocked.headers.get('access-control-expose-headers'), 'Retry-After')
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  assert.equal((await blocked.json()).code, 'RATE_LIMIT_EXCEEDED')
  assert.equal(server.calls(), 1)
})

test('HTTP integration accepts cached JSON and rejects invalid or oversized bodies', async t => {
  const server = await startServer(t, { maxBodyBytes: 32 })
  const post = body => fetch(`${server.url}/api/student/profile`, { method: 'POST', body })
  const valid = await post('{"name":"Student"}')
  assert.deepEqual((await valid.json()).body, { name: 'Student' })
  for (const body of ['null', '[]', '{broken']) assert.equal((await post(body)).status, 400)
  assert.equal((await post('x'.repeat(33))).status, 413)
  const chunked = await new Promise((resolve, reject) => {
    const outgoing = request(`${server.url}/api/student/profile`, { method: 'POST', headers: { 'Transfer-Encoding': 'chunked' } }, res => {
      res.resume()
      res.on('end', () => resolve(res.statusCode))
    })
    outgoing.on('error', reject)
    outgoing.write('x'.repeat(20))
    outgoing.end('x'.repeat(20))
  })
  assert.equal(chunked, 413)
  assert.equal(server.calls(), 1)
})
