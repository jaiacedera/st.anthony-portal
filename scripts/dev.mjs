import { spawn } from 'node:child_process'

const commands = [
  {
    label: 'backend',
    command:
      process.platform === 'win32' ? 'cmd.exe' : process.execPath,
    args:
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'node backend/src/server.js']
        : ['backend/src/server.js'],
  },
  {
    label: 'frontend',
    command: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args:
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npm run dev:frontend']
        : ['run', 'dev:frontend'],
  },
]

const children = commands.map(({ label, command, args }) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`)
      shutdown(code)
    }
  })

  return child
})

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => process.exit(exitCode), 150)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
