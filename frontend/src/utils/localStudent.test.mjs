import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function loadLocalStudent(dev, hostname) {
  const source = readFileSync(new URL('./localStudent.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env.DEV', String(dev))
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  })
  const storage = new Map()
  const exports = {}
  runInNewContext(outputText, {
    exports,
    window: {
      location: { hostname },
      sessionStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    },
  })
  return exports
}

test('local login requires the exact password and a loopback development environment', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const local = loadLocalStudent(true, hostname)
    assert.equal(local.getLocalStudentLogin('student', 'student123').success, true)
    assert.equal(local.getLocalStudentLogin('student', 'wrong').success, false)
    assert.equal(local.getLocalStudentLogin('someone@example.com', 'student123'), null)
  }
  for (const [dev, hostname] of [[false, 'localhost'], [false, 'portal.example.com'], [true, 'portal.example.com'], [true, 'localhost.example.com']]) {
    const local = loadLocalStudent(dev, hostname)
    assert.equal(local.getLocalStudentLogin('student', 'student123'), null)
    assert.equal(local.isLocalStudent(local.LOCAL_STUDENT_ID), false)
    assert.throws(() => local.getLocalStudentDashboard(), /unavailable/)
  }
})

test('demo data supports dashboard, requests, and local profile updates', () => {
  const local = loadLocalStudent(true, 'localhost')
  const dashboard = local.getLocalStudentDashboard()
  assert.equal(dashboard.student.id, local.LOCAL_STUDENT_ID)
  assert.equal(dashboard.subjects.length, 0)
  assert.equal(dashboard.requests.length, 0)
  const updated = local.updateLocalStudentProfile({ ...dashboard.student, firstName: 'Test', studentId: local.LOCAL_STUDENT_ID })
  assert.equal(updated.student.fullName, 'Test Student')
  assert.equal(local.getLocalStudentDashboard().student.firstName, 'Test')
})
