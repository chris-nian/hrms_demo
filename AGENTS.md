# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

HRMS (人力资源管理系统) - A full-stack HR management system with FastAPI backend and React frontend.

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4
- **State Management**: Zustand
- **Routing**: React Router v7
- **i18n**: react-i18next (zh/en)
- **Build Tool**: Custom bash script (`./hrms`)

编码必须符合MCP服务上面的xxx规范

## Quick Commands

```bash
# Start development server (builds frontend + starts backend)
./hrms start

# Stop running server
./hrms stop

# Build frontend only
./hrms build

# Full rebuild (install deps + build)
./hrms rebuild

# View logs
./hrms logs
```

## Project Structure

```
backend/           # FastAPI backend
├── main.py        # App entry point, serves static frontend in prod
├── database.py    # SQLAlchemy setup with SQLite
├── models.py      # SQLAlchemy ORM models
├── schemas.py     # Pydantic schemas
├── seed.py        # Initial data seeding
├── routers/       # API route handlers
└── services/      # Business logic (approval_engine, salary_calculator)

frontend/          # React frontend
├── src/
│   ├── api/       # Axios API client with /api baseURL
│   ├── components/# Reusable UI components
│   ├── pages/     # Route pages
│   ├── stores/    # Zustand state management
│   └── locales/   # i18n translations
└── dist/          # Build output (served by backend)

data/              # SQLite database storage
```

## Key Conventions

### Frontend

- **Path alias**: `@/` maps to `src/` (configured in vite.config.ts and tsconfig.json)
- **API client**: Use `src/api/index.ts` - all endpoints return `.then(r => r.data)`
- **Styling**: Tailwind v4 with CSS variables in `index.css`
- **Custom CSS classes**: `surface-panel`, `metric-card`, `page-enter` animations defined in index.css
- **i18n keys**: Stored in `localStorage` as `hrms-lang`, fallback to 'zh'
- **Role storage**: `localStorage.getItem('hrms-role')` - values: 'employee' | 'manager' | 'hr'

### Backend

- **API prefix**: All routers use `/api/*` prefix (e.g., `/api/employees`)
- **Database**: SQLite stored in `data/hrms.db`, path configurable via `HRMS_DATA_DIR` env var
- **Response format**: List endpoints return `{ total: number, items: [] }`
- **Schema pattern**: `*Base`, `*Create`, `*Update`, `*Out` for each entity
- **Router pattern**: Each entity has its own router with `prefix` and `tags`

### Data Flow

1. Backend creates tables and seeds data on startup (`main.py` lines 14-15)
2. Frontend proxy in dev forwards `/api` to `localhost:8000` (vite.config.ts)
3. In production, backend serves `frontend/dist/` as static files

## Testing Guidelines (Mandatory)

### ⚠️ 测试执行规则 (必须遵守)

**每次代码改动或新增功能时，必须遵循以下测试流程：**

1. **新增功能必须配套测试** - 任何新功能、新 API、新组件都必须编写对应的测试用例
2. **修改代码必须全量测试** - 每次代码改动后，必须执行完整测试套件，确保不破坏现有功能
3. **测试通过才能提交** - 所有测试必须通过后方可视为任务完成

### 测试命令

```bash
# 运行所有测试（推荐）
./run-tests.sh

# 仅后端测试
./run-tests.sh backend

# 仅前端测试
./run-tests.sh frontend

# 后端详细测试
cd backend && python3 -m pytest tests/ -v

# 前端详细测试
cd frontend && npm run test
```

### 测试框架

- **Backend**: pytest + pytest-asyncio
- **Frontend**: vitest + @testing-library/react
- **测试文档**: [`.cospec/TEST_GUIDE.md`](.cospec/TEST_GUIDE.md:1)

## Port Configuration

- Frontend dev server: Vite default (5173)
- Backend API: 8000
- Production: Both served on 8000
