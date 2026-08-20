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

The backend initializes and expects these tabs only:

- `Students`
- `Instructors`
- `Subjects`
- `SubjectStudents`
- `Grades`
- `GradeBreakdownRequests`

## Connection and initialization

- `GET /api/database/google-sheets/status` checks the server-side Sheets connection.
- `POST /api/database/google-sheets/init` initializes missing tabs and headers.
- `npm run init:sheets` runs the same initialization from the command line.
