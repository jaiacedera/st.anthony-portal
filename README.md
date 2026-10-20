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

### Shared classes and independent professor grades

The portal retains Google Sheets and the existing `InstructorAuthAccounts`,
`StudentAuthAccounts`, `Instructors`, and `Students` tabs instead of creating
duplicate users/profile tables. Passwords continue to use the existing salted
hashing and account creation code.

Run `npm run init:sheets`, then `npm run migrate:subjects` with the existing
server credentials before deploying this feature. Initialization only appends
missing schema columns and creates missing tabs; unexpected headers are rejected.
The migration backfills each existing subject owner's assignment and
`created_by`, and can be rerun without duplicating assignments. It does not
delete or reinterpret old grades.

New subjects use independent professor grading. Adding another professor to a
legacy subject enables that flow for the subject; existing `Grades` and
`GradebookDrafts` data is retained, but professors must submit the three category
grades in the new table. Legacy subjects without additional professors keep the
existing grading interface. Removing a professor does not delete their historical
grade entry; only currently assigned professors contribute to the aggregate.
At least one professor must remain assigned.

| Existing/proposed relation | Sheets storage |
| --- | --- |
| `subject_instructors` | `SubjectInstructors`: deterministic `id` for subject + professor, `assigned_by`, `assigned_at`, `status` |
| `subjects` | Existing `Subjects`, extended with `section`, `created_by`, `grading_mode` |
| `subject_students` | Existing `SubjectStudents`; re-enrollment reactivates the existing relation |
| `instructor_grades` | `InstructorGrades`: one logical entry per enrollment + professor, three categories, unrounded mean, submission/update timestamps |
| `final_grades` | `FinalGrades`: aggregate per enrollment, `FINAL`/`PENDING`, submission/assignment counts and calculation time |
| `grade_breakdown_requests` | Existing `GradeBreakdownRequests`, extended with `subject_student_id` and `requested_by`; existing reviewer fields retained |
| API sessions | `AuthSessions`: SHA-256 token hashes, role and identity, 24-hour expiry; raw tokens are returned only at login |

Only the current professor's fields are returned by the editable grade endpoint.
Each category is required, numeric, and between 0 and 100 (zero is valid).
The server computes `(knowledge + performance + attitude) / 3`, verifies the
saved entry in Sheets, and recalculates the aggregate. A pending aggregate is
shown as a provisional average and is excluded from final GPA calculations.
Student reads calculate from current assignments and submissions, so an old
derived row cannot expose a stale final status.

Subject Management includes assigned professors, enrollment lists, professor
assignment/removal, and student creation/enrollment by name, email and year.
Existing accounts are reused without changing passwords. New accounts use the
existing welcome-email flow. Assignment notifications use the existing
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and sender-name configuration, and contain
the subject name/code, section and assigning professor. Repeated assignments
do not send another email; delivery failures are reported in the UI.

Breakdown requests for shared classes are unique per enrollment. Any currently
assigned professor may approve or reject a pending request. Approval saves a
server-generated snapshot before exposing it to that student. Individual
professor grades are absent from the default student dashboard.

All instructor/student API routes now require a bearer session issued by the
existing login endpoints. Browser-supplied usernames/student IDs are checked
against that session. Users with old browser sessions must sign in again after
deployment. Database initialization/status HTTP routes also require an instructor
session; the initialization CLI remains available.

Google Sheets does not provide database unique constraints or transactions.
Deterministic IDs, fresh reads and process-local write serialization enforce
logical uniqueness for normal requests and retries, but simultaneous writes from
different server instances are not transactionally serialized. For strict
cross-instance uniqueness and exactly-once notifications, a transactional store
or shared lock/outbox service is still required. Do not manually duplicate
relation rows. Tests use a simulated Sheets client and do not send real emails.

On the instructor gradebook, **Apply Scores** and **Apply Breakdown** stage edits locally. **Save Changes**
writes them to `GradebookDrafts`. The server reads the saved data back before
confirming success. **Post Grades** publishes student-visible results to `Grades`.
Previously browser-only grades must be saved from the original browser with
Save Changes. Deploy both frontend and backend changes to Vercel for fixes to
take effect on the live site.

`GradebookDrafts` stores one draft per instructor, subject, and grading period.
Its columns are `draft_id` (the JSON-encoded identity tuple), `instructor_id`,
`subject_id`, `grading_period`, `updated_at` (ISO timestamp), and `payload_0`
through `payload_15`. Join the payload cells in order to read the JSON containing
`sections`, `components`, and score `overrides`; each cell holds up to 40,000
characters. These are draft scores, not rows in the published `Grades` tab.

Draft loads and save verification bypass the server's sheet-data cache; the API
and browser requests use `no-store`. Save confirmation requires the payload and
timestamp to match a fresh Sheets read. Browser storage is only a recovery cache:
cloud drafts load even when storage is unavailable. Applying a breakdown keeps
the gradebook unsaved until Save Changes succeeds. To recover older local-only
scores, keep the original browser data and save from that browser. Reopen the
gradebook on the other device to fetch the latest draft; simultaneous editing
does not merge changes.

- `GET /api/database/google-sheets/status` checks the server-side Sheets connection.
- `POST /api/database/google-sheets/init` initializes missing tabs and headers.
- `npm run init:sheets` runs the same initialization from the command line.
