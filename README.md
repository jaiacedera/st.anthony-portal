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

The repository currently tracks `.env` files. Ignore rules do not untrack existing
files: remove them from Git's index before pushing (`git rm --cached backend/.env
frontend/.env` keeps local copies). If real credentials were pushed previously,
rotate them. `.env.example` files list the configuration without secrets.

The old `render.yaml` remains available during the cutover; Vercel uses `vercel.json`.
Platform references: [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
and [rewrites](https://vercel.com/docs/rewrites).

## Backend environment variables

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
- `GradePublications`
- `GradeBreakdownRequests`
- `GradeBreakdownResponses`

## Connection and initialization

- `GET /api/database/google-sheets/status` checks the server-side Sheets connection.
- `POST /api/database/google-sheets/init` initializes missing tabs and headers.
- `npm run init:sheets` runs the same initialization from the command line.
