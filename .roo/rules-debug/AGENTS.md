# Project Debug Rules (Non-Obvious Only)

- Server logs are written to `.hrms.log` in the project root when using `./hrms start`.
- The `./hrms` script health-checks against `http://localhost:8000/api/dashboard/stats` to confirm startup.
- SQLite database path defaults to `data/hrms.db` relative to project root, or respects `HRMS_DATA_DIR` env var.
- `backend/database.py` has `upgrade_sqlite_schema()` which silently adds missing columns to existing SQLite tables on startup using `ALTER TABLE`.
- Test output is written to `test_logs/backend_test.log`, `test_logs/frontend_test.log`, and `test_logs/test_summary.txt`.
- If `./hrms start` fails silently, check that `frontend/dist` exists; the script auto-builds if missing, but build failures can be hidden by `tail` truncation.
