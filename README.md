# HRMS-Eng

A full-stack Human Resource Management System for small-to-medium enterprises, covering the entire employee lifecycle, organizational hierarchy, attendance tracking, compensation, and internal approval workflows.

## Overview

HRMS-Eng provides a unified web interface for three user roles—**employees**, **managers**, and **HR administrators**—to view and act on people-related data. It is designed to replace scattered spreadsheets with a centralized, self-hosted solution that includes China mainland payroll tax calculations and a multi-level approval state machine.

### Key Capabilities

| Module | Description |
|--------|-------------|
| **Employee Management** | Onboarding, profile management, soft-delete retention, manager relationships |
| **Departments & Positions** | Organizational hierarchy with level designations (P3–P8, M1–M3) |
| **Attendance Tracking** | Daily check-in/check-out with status classification (normal, late, absent, leave) and monthly aggregation |
| **Salary & Compensation** | Automated China mainland IIT (individual income tax), social insurance, and housing fund calculations |
| **Approval Workflows** | Multi-level state machine: draft → pending_manager → pending_hr → approved/rejected |
| **Recruiting** | Candidate pipeline, interview scheduling, evaluations, and offer management |
| **Dashboard** | Role-aware metrics for attendance rate, pending approvals, and headcount |

### User Roles

| Role | Permissions |
|------|-------------|
| **Employee** | View personal profile, check attendance, view salary config, submit approval requests |
| **Manager** | Review and approve/reject subordinate requests; view team metrics |
| **HR** | Full admin access: onboard employees, manage org structure, final approvals, salary calculation |

> **Note:** The frontend provides a client-side role switcher for rapid demo and testing. Real authorization is enforced on the backend approval router.

## Tech Stack

### Backend
- **Python** >= 3.9
- **FastAPI** 0.115.12 — REST API framework
- **SQLAlchemy** 2.0.40 — ORM
- **Pydantic** v2 — Data validation
- **SQLite** — Embedded database (auto-initialized)
- **Uvicorn** — ASGI server

### Frontend
- **React** 18.3 — UI library
- **TypeScript** ~5.7 — Type safety
- **Vite** 6.3 — Build tool
- **Tailwind CSS** v4 — Styling
- **Zustand** 5.0 — State management
- **Recharts** 2.15 — Data visualization
- **react-i18next** — Internationalization (zh / en)

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # DB engine & connection
│   ├── seed.py              # Demo data seeder
│   ├── routers/             # API route modules
│   │   ├── employees.py
│   │   ├── departments.py
│   │   ├── positions.py
│   │   ├── attendance.py
│   │   ├── salary.py
│   │   ├── approvals.py
│   │   ├── dashboard.py
│   │   ├── candidates.py
│   │   ├── interviews.py
│   │   ├── evaluations.py
│   │   └── offers.py
│   ├── services/            # Business logic
│   │   ├── approval_engine.py
│   │   ├── salary_calculator.py
│   │   └── hiring_service.py
│   └── tests/               # pytest test suite
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Route definitions
│   │   ├── api/index.ts     # API client
│   │   ├── stores/          # Zustand stores
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── locales/         # i18n translation files
│   │   └── index.css        # Semantic CSS design system
│   └── package.json
├── hrms                     # Project management script
├── run-tests.sh             # Test runner (backend + frontend)
├── Dockerfile               # Multi-stage Docker build
└── docker-compose.yml       # Single-container deployment
```

## Quick Start

### Prerequisites
- Python >= 3.9
- Node.js >= 20 (with npm)
- macOS / Linux (the `./hrms` script is bash-based)

### 1. Clone and Start

```bash
# Start the application (auto-builds frontend and installs Python deps if needed)
./hrms start
```

Then open http://localhost:8000 in your browser.

### 2. Management Commands

The [`hrms`](hrms) script is the canonical entry point for all operations:

| Command | Description |
|---------|-------------|
| `./hrms start` | Start the server (auto-build if needed) |
| `./hrms stop` | Stop the server |
| `./hrms restart` | Stop then start |
| `./hrms rebuild` | Rebuild from latest source and start |
| `./hrms build` | Build frontend & install dependencies without starting |
| `./hrms status` | Show server status and health check |
| `./hrms logs` | Tail the server log file |
| `./hrms help` | Show usage help |

### 3. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the application at http://localhost:8000
```

The container serves both the REST API and the built frontend SPA on port `8000`. Data is persisted via a volume at `./data`.

## Testing

Use the [`run-tests.sh`](run-tests.sh) script to execute the test suite:

```bash
# Run all tests (backend + frontend)
./run-tests.sh

# Run only backend tests (pytest)
./run-tests.sh backend

# Run only frontend tests (vitest)
./run-tests.sh frontend
```

Test logs are saved to `test_logs/`.

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

API documentation is auto-generated at http://localhost:8000/docs (Swagger UI).

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend at `localhost:8000`.

## Design Notes

- **Soft deletes only**: Employee deletion sets `status = "inactive"`; no hard-delete endpoint exists.
- **Approval side effects**: When a flow reaches `approved`, the router applies side effects such as creating attendance leave records or updating salary configs.
- **Semantic CSS**: The frontend uses semantic classes (`.surface-panel`, `.metric-card`, `.data-table`, `.status-badge`) defined in [`frontend/src/index.css`](frontend/src/index.css) rather than raw Tailwind utilities for common UI patterns.
- **Default language**: Chinese (`zh`) is the default i18n locale.

## License

MIT
