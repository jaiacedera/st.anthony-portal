import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function setupLogout(portal) {
  const entries = [
    ['student-auth', 'student-session'],
    ['instructor-auth', 'instructor-session'],
    ['student-remembered-email', 'student@example.com'],
  ]
  const local = new Map(entries)
  const session = new Map(entries)
  const navigation = []
  const window = {
    localStorage: { removeItem: key => local.delete(key) },
    sessionStorage: { removeItem: key => session.delete(key) },
    location: { pathname: `/${portal}/dashboard` },
    history: {
      replaceState: (_state, _title, path) => {
        window.location.pathname = path
        navigation.push(['replace', path])
      },
      pushState: () => assert.fail('Logout must replace the current history entry'),
    },
    dispatchEvent: event => {
      assert.equal(local.has(`${portal}-auth`), false)
      assert.equal(session.has(`${portal}-auth`), false)
      navigation.push(['event', event.type])
    },
  }
  function load(file, dependencies = {}) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    })
    const exports = {}
    runInNewContext(outputText, { exports, window, Event, require: name => dependencies[name] })
    return exports
  }
  const module = load('./logout.ts', { './navigation': load('./navigation.ts') })
  return { ...module, local, session, navigation }
}

for (const portal of ['student', 'instructor']) {
  test(`${portal} logout clears both session stores before navigating to its sign-in page`, () => {
    const { clearLogoutSession, local, session, navigation } = setupLogout(portal)
    clearLogoutSession(portal)
    assert.deepEqual(navigation, [['replace', `/${portal}`], ['event', 'app:navigate']])
    const otherPortal = portal === 'student' ? 'instructor' : 'student'
    for (const store of [local, session]) {
      assert.equal(store.has(`${portal}-auth`), false)
      assert.equal(store.get(`${otherPortal}-auth`), `${otherPortal}-session`)
      assert.equal(store.get('student-remembered-email'), 'student@example.com')
    }
  })
}
