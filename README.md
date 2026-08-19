# St. Anthony Portal

This repo now follows a clean full-stack layout:

```text
st.anthony-portal/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── utils/
├── backend/
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
- `npm run start:backend` starts the backend starter API at `http://localhost:3000`.

## Notes

- Frontend environment variables live in `frontend/.env`.
- Backend environment variables live in `backend/.env`.
- The backend starter intentionally uses Node's built-in `http` module so the repo works without adding extra packages first.
