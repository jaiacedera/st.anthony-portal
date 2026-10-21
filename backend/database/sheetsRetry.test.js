import assert from 'node:assert/strict'
import { test } from 'node:test'
import { retrySheetsRead } from './sheetsRetry.js'

test('quota reads recover with bounded exponential backoff', async () => {
  const waits = []
  let calls = 0
  const quota = { response: { status: 429 } }
  const options = { sleep: async ms => waits.push(ms), random: () => 0 }
  assert.equal(await retrySheetsRead(async () => {
    if (++calls < 3) throw quota
    return 'recovered'
  }, options), 'recovered')
  assert.deepEqual(waits, [1000, 2000])
  calls = 0
  await assert.rejects(retrySheetsRead(async () => {
    calls++
    throw quota
  }, options), error => error === quota)
  assert.equal(calls, 5)
})

test('permission failures are not retried', async () => {
  const denied = { response: { status: 403 } }
  await assert.rejects(retrySheetsRead(async () => { throw denied }, {
    sleep: () => assert.fail('Do not retry permission failures'),
  }), error => error === denied)
})
