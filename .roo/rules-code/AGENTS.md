# Project Coding Rules (Non-Obvious Only)

- Python imports have no package prefix because `sys.path.insert` is used in `main.py` and `seed.py`. Never add `from backend.` prefixes.
- Pydantic v2 schemas use `from_attributes = True` in `Config` classes (not `orm_mode`).
- Employee deletion is a soft-delete: `DELETE /api/employees/{id}` sets `status = "inactive"` in the router.
- Approval side effects (leave attendance records, salary updates) are applied inside `routers/approvals.py`, not in `services/approval_engine.py`.
- Frontend uses semantic CSS classes from `index.css` (`.surface-panel`, `.metric-card`, `.field`, `.btn-primary`, `.data-table`, `.status-badge`, `.info-cell`) rather than composing Tailwind utilities for common UI patterns.
- All API endpoints use `/api` prefix. Router prefixes are set in each router file (`prefix="/api/employees"`, etc.).
- The `ListResponse<T>` type in `api/index.ts` sometimes includes `active_total` as an optional field.
