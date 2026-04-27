# Project Architecture Rules (Non-Obvious Only)

- The backend and frontend are **not** separate deployable services in production. FastAPI serves the built React SPA from `frontend/dist` via `StaticFiles` and a catch-all route.
- There is **no authentication system**. The frontend role switcher is purely UI state (`localStorage` + Zustand). Only the approval workflow backend enforces role checks (manager for `pending_manager`, HR for `pending_hr`).
- SQLite is used with `check_same_thread=False` because FastAPI handles requests across threads.
- The database is auto-seeded on every application startup (`main.py` imports trigger `seed()`). There is no way to start the app with an empty database.
- Schema changes are forward-only via `upgrade_sqlite_schema()` in `database.py` — it uses raw `ALTER TABLE ADD COLUMN` for SQLite compatibility and does not support rollbacks or column removal.
- Approval state transitions are centralized in `services/approval_engine.py`, but business logic side effects remain in `routers/approvals.py`, creating a split responsibility.
