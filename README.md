# St. Anthony Portal

This repo uses a Vite frontend and a lightweight Node backend. The Google
Sheets data-access layer lives under `backend/database`.

## Structure

```text
st.anthony-portal/
├── frontend/
├── backend/
│   ├── database/
│   │   ├── googleSheets.js
│   │   ├── initSheets.js
│   │   ├── sheetsSchema.js
│   │   └── sheetsService.js
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
└── database/
    └── schema.sql
```

## Scripts

- `npm run dev` starts the Vite frontend using `frontend/` as the app root.
- `npm run build` type-checks and builds the frontend.
- `npm run lint` runs ESLint with the frontend config.
- `npm run start:backend` starts the backend API at `http://localhost:3000`.
- `npm run init:sheets` verifies the required Google Sheets tabs and headers.
- `npm run migrate:auth -- path/to/authAccounts.json` imports legacy accounts into Sheets without overwriting existing accounts.

## Deploy frontend and backend to Vercel

Use **one Vercel project**, imported from this repository. Select the repository
root (`./`), not `frontend` or `backend`. Select Vite and Node.js 24.x. The root
`vercel.json` sets the build command to `npm run build` and output directory to
`frontend/dist`. Vercel serves the frontend and runs `api/index.js` for `/api/*`.
Frontend page refreshes fall back to `index.html`; unknown API routes return JSON 404s.
The frontend uses the same origin in production, so no separate backend URL is needed.

Before switching traffic from Render:

1. Back up the spreadsheet and obtain the latest `backend/database/authAccounts.json`
   from the running Render backend. A local copy may lack password/profile changes
   made since the last deployment. Keep this export private.
2. With your existing Google credentials in `backend/.env`, run
   `npm run init:sheets`, then `npm run migrate:auth -- path/to/authAccounts.json`.
   If the local file is confirmed current, `npm run migrate:auth` uses it by default.
   The importer preserves password hashes and account IDs and skips existing matches.
   It adds `InstructorAuthAccounts` and migrates legacy students to `StudentAuthAccounts`.
   Run one importer at a time. These commands update your spreadsheet; they are not build steps.
3. In Vercel Project Settings > Environment Variables, add the values below for
   Production. For previews, use a separate test spreadsheet and test credentials.
4. Deploy the repository. Set `FRONTEND_ORIGIN` to your actual HTTPS site URL
   (without a trailing slash), then redeploy if that value changed.
5. Verify `/api/health`, `/api/database/google-sheets/status`, instructor/student
   login, profile/password changes, student creation/deletion, and password reset emails.
   Refresh a nested frontend page to verify routing. Verify a changed password after
   another deployment, then switch your domain and retire Render once checks pass.

| Vercel variable | Value |
| --- | --- |
| `GOOGLE_PROJECT_ID` | Existing Google project ID |
| `GOOGLE_CLIENT_EMAIL` | Existing service account email; it needs editor access to the spreadsheet |
| `GOOGLE_PRIVATE_KEY` | Existing private key; literal `\n` escapes are supported; omit surrounding quotes |
| `GOOGLE_SHEET_ID` | Existing spreadsheet ID |
| `BREVO_API_KEY` | Existing Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender email |
| `BREVO_SENDER_NAME` | `St. Anthony Portal` or your preferred sender name |
| `FRONTEND_ORIGIN` | `https://your-project.vercel.app` or your custom domain |
| `AUTH_STORE` | `sheets` (Vercel always uses Sheets) |
| `RATE_LIMIT_TRUST_PROXY_HOPS` | `1` for Vercel's forwarding proxy |

Leave `VITE_API_BASE_URL` unset on Vercel. Remove any old Render or localhost
override there. Never put backend credentials in `VITE_*` variables; those are public.
For local development, `npm run dev` starts both servers. Local instructor storage
defaults to the JSON file; set `AUTH_STORE=sheets` locally to test migrated accounts.

Vercel does not provide durable local file storage for accounts. The deployed backend
does not read the legacy JSON file or `backend/.env`; supply credentials through Vercel.
The existing rate limits and Sheets caches are per function instance, so global quotas
are not shared across instances. Use a shared limiter or Vercel Firewall if you need
deployment-wide enforcement.

Local `.env` files and `backend/database/authAccounts.json` must remain untracked.
Copy the `.env.example` files for local setup; the examples contain no credentials.
Run `npm run check:public` before committing to check the Git index for private
files and common credential patterns. This targeted check does not certify that
the repository or its history contains no sensitive data.

**Publication is blocked until historical data is cleaned up.** Earlier commits
contain backend credentials and account records. Removing files from the current
version does not remove those copies. Before making the repository public:

1. Replace the Google service account key and Brevo API key, update local and
   hosting environment settings, verify the app, and revoke the old credentials.
   Reset passwords for real accounts whose password hashes were committed.
2. Remove `backend/.env`, `frontend/.env`, and
   `backend/database/authAccounts.json` from all Git history in a separate clone
   using `git-filter-repo`. Coordinate the history rewrite with collaborators
   before force-pushing; old clones can reintroduce the sensitive history.
3. Review other branches, tags, pull requests, releases, and artifacts for private
   data. Follow [GitHub's sensitive-data removal guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
   for cached references and support-assisted removal where necessary.

All source code retained in a public repository is visible. Keep proprietary
code in a separate private repository. Store private exports in the ignored
`private/`, `backups/`, or `exports/` directories; do not force-add ignored files.
Frontend `VITE_*` values are included in browser code and must never contain secrets.

The old `render.yaml` remains available during the cutover; Vercel uses `vercel.json`.
Platform references: [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
and [rewrites](https://vercel.com/docs/rewrites).

## Backend environment variables

### Student password recovery

Students can open `/student/forgot-password` from the login page, enter their
registered email, and receive a Brevo email linking to `/student/reset-password`.
The email link expires after one hour. Students enter and confirm a password of
at least eight characters, then return to student login. Missing or expired links
can be replaced through the request page.

Set `FRONTEND_ORIGIN=https://st-anthony-portal.vercel.app` and the `BREVO_*`
variables in Vercel, then redeploy. Student accounts must exist in the
`StudentAuthAccounts` sheet. Reset requests store only a token hash; successful
resets clear it and update the password hash. Authentication data is read fresh
from Sheets so another function instance sees password and token changes.

`npm test` covers the reset flow using mocked Sheets and email delivery. A live
delivery check still requires a registered test account and working Brevo credentials.

Set these in `backend/.env`:

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_PROJECT_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

## Google Sheets tabs

The backend initializes and expects these tabs:

- `Students`
- `StudentAuthAccounts`
- `InstructorAuthAccounts`
- `Instructors`
- `Subjects`
- `SubjectStudents`
- `Grades`
- `GradebookDrafts` (Save Changes; instructor drafts available across devices)
- `GradePublications`
- `GradeBreakdownRequests`
- `GradeBreakdownResponses`

## Connection and initialization

On the instructor gradebook, **Apply Scores** stages edits and **Save Changes**
writes them to `GradebookDrafts`. The server reads the saved data back before
confirming success. **Post Grades** publishes student-visible results to `Grades`.
Previously browser-only grades must be saved from the original browser with
Save Changes. Deploy both frontend and backend changes to Vercel for fixes to
take effect on the live site.

- `GET /api/database/google-sheets/status` checks the server-side Sheets connection.
- `POST /api/database/google-sheets/init` initializes missing tabs and headers.
- `npm run init:sheets` runs the same initialization from the command line.
