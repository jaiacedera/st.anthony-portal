import { execFileSync } from 'node:child_process'

// Inspect staged content, not local .env files. Never print matching values.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean)
const privatePath = /(?:^|\/)(?:\.env(?:\..+)?|authAccounts[^/]*\.json|credentials\.json|[^/]*service[-_]account[^/]*\.json|\.aws|\.secrets|private|backups|exports)(?:\/|$)|\.(?:pem|key|p12|pfx|sqlite3?|db)$/i
const credentials = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /xkeysib-[A-Za-z0-9-]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{30,}/,
]
let failures = 0
for (const file of paths) {
  if (privatePath.test(file) && !file.endsWith('/.env.example') && file !== '.env.example') {
    console.error(`Private file tracked: ${file}`)
    failures++
    continue
  }
  const content = execFileSync('git', ['show', `:${file}`], { maxBuffer: 32 * 1024 * 1024 })
  if (content.includes(0)) continue
  for (const [index, line] of content.toString('utf8').split(/\r?\n/).entries()) {
    if (credentials.some((pattern) => pattern.test(line))) {
      console.error(`Possible credential: ${file}:${index + 1} (value hidden)`)
      failures++
    }
  }
}
if (failures) {
  console.error(`Public-repository check failed: ${failures} finding(s).`)
  process.exitCode = 1
} else {
  console.log('Git index passed the targeted private-file and credential checks. History was not checked.')
}
