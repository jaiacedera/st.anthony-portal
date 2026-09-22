import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readJsonBody } from './request.js'

test('Vercel parsed bodies work after the request stream has been consumed', async () => {
  const req = { headers: {}, body: { username: 'test', password: 'example' } }
  assert.deepEqual(await readJsonBody(req), req.body)
  assert.equal(readJsonBody(req), readJsonBody(req))
  assert.deepEqual(await readJsonBody({ headers: {}, body: '{"value":1}' }), { value: 1 })
})

test('Vercel bodies retain JSON validation and payload limits', async () => {
  for (const body of ['{', 'null', '[]', 123]) {
    await assert.rejects(readJsonBody({ headers: {}, body }), { statusCode: 400 })
  }
  await assert.rejects(readJsonBody({ headers: {}, body: { data: '12345' } }, 5), { statusCode: 413 })
  await assert.rejects(readJsonBody({ headers: { 'content-length': '100' }, body: {} }, 50), { statusCode: 413 })
  await assert.rejects(readJsonBody({ headers: {}, get body() { throw new SyntaxError('Invalid JSON') } }), { statusCode: 400 })
})
