# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Lifecycle
- `./hrms start|stop|restart|rebuild|status|logs` — Canonical entry point. Auto-builds frontend and installs Python deps if missing. Not `npm run dev` or `uvicorn main:app`.
- `./run-tests.sh [backend|frontend|all]` — Runs both test suites; outputs logs to `test_logs/`.

## Backend Gotchas
- **Imports lack package prefix**: `main.py` and `seed.py` use `sys.path.insert(0, ...)` so modules import as `from database import engine` rather than `from backend.database import engine`. This path hack is required for direct execution.
- **Database auto-seeds on module import**: `main.py` calls `seed()` at import time. Tests must set `HRMS_DATA_DIR` to a temp directory **before** importing `main` (see `conftest.py`).
- **Soft deletes only**: `DELETE /api/employees/{id}` sets `status = "inactive"`; no hard-delete endpoint exists.
- **Approval state machine**: `services/approval_engine.py` hardcodes transitions `draft → pending_manager → pending_hr → approved|rejected`. Side effects (e.g., creating attendance leave records) only apply on final `approved`.

## Frontend Gotchas
- **Default language is Chinese**: `i18n.ts` defaults to `zh` (not `en`).
- **Role switcher is not real auth**: The UI role (employee/manager/hr) is just a Zustand store + `localStorage`. Backend approval router enforces real role checks.
- **Custom CSS design system**: Components primarily use semantic classes defined in `index.css` (`.surface-panel`, `.metric-card`, `.field`, `.btn-primary`, `.data-table`, `.status-badge`, `.info-cell`), not raw Tailwind utilities.
- **Backend serves the SPA in production**: FastAPI mounts `frontend/dist` statically. The Vite dev proxy (`/api → localhost:8000`) is development-only.

## Testing
- Backend tests must run from `backend/` directory (`python3 -m pytest tests/ -v`).
- Frontend tests live in `src/**/__tests__/` folders (not a root `tests/` dir). `vitest.config.ts` uses `globals: true`.
- `frontend/src/test/setup.ts` globally mocks `react-i18next`, `localStorage`, `matchMedia`, and `IntersectionObserver`.

## Style
- Pydantic v2 schemas use `from_attributes = True` (not v1's `orm_mode`).
- TypeScript path alias `@/` maps to `src/`. No ESLint or Prettier configs are present.
