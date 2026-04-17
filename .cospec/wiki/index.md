# HRMS Project Technical Documentation Index

## 📚 Documentation Navigation

This index provides complete technical documentation navigation for the HRMS project, supporting quick information location and context understanding.

### 📋 Project Overview

**Project Positioning**: Full-stack HR management system with FastAPI backend and React frontend
**Technology Stack**: FastAPI + SQLAlchemy + SQLite | React 18 + TypeScript + Vite + Tailwind CSS v4
**Architecture Characteristics**: Layered architecture: Router→Service→Model→Schema, State machine approval engine

### 🏗️ Organizational Structure

hrms/
├─ backend/                    # FastAPI backend: API + business logic
│  ├─ main.py                  # App entry, depends on routers/ and seed.py
│  ├─ database.py              # SQLAlchemy config, HRMS_DATA_DIR env
│  ├─ models.py                # 7 ORM models with relationships
│  ├─ schemas.py               # Pydantic: *Base/*Create/*Update/*Out
│  ├─ seed.py                  # Demo data seeder
│  ├─ requirements.txt         # Python dependencies
│  ├─ routers/                 # API layer: 7 route handlers
│  │  ├─ departments.py        # /api/departments CRUD
│  │  ├─ employees.py          # /api/employees CRUD + search
│  │  ├─ salary.py             # /api/salary config + calculate
│  │  └─ approvals.py          # /api/approvals + state actions
│  └─ services/                # Business logic: 2 domain engines
│     ├─ approval_engine.py    # State machine, depends on routers/approvals.py
│     └─ salary_calculator.py  # Tax engine, depends on routers/salary.py
├─ frontend/                   # React 18 + TypeScript frontend
│  └─ src/
│     ├─ main.tsx              # Entry point
│     ├─ App.tsx               # Route config, 6 routes
│     ├─ api/index.ts          # Axios client, baseURL /api
│     ├─ components/           # Layout.tsx + ui.tsx
│     ├─ pages/                # 6 page components
│     ├─ stores/appStore.ts    # Zustand: role + sidebar
│     └─ locales/              # i18n: zh.json + en.json
├─ data/                       # SQLite database storage
├─ hrms                        # Bash CLI: start/stop/rebuild
├─ Dockerfile                  # Multi-stage: node→python
└─ docker-compose.yml          # Container orchestration

### 🎯 Core Documentation Navigation

| Document Name | File Path | Main Content | Applicable Scenarios |
|---------|---------|---------|---------|
| **Project Overview & Quick Start** | [.cospec/wiki/1、Project Overview & Quick Start.md](.cospec/wiki/1、Project Overview & Quick Start.md) | Project overview and setup guide | project understanding, onboarding, tech selection |
| **System Architecture & Technical Design** | [.cospec/wiki/2、System Architecture & Technical Design.md](.cospec/wiki/2、System Architecture & Technical Design.md) | System architecture and design | architecture design, data modeling, system integration |
| **Business Modules & Implementation** | [.cospec/wiki/3、Business Modules & Implementation.md](.cospec/wiki/3、Business Modules & Implementation.md) | Business module implementation | feature development, module understanding, API usage |
| **Core Services & Deployment** | [.cospec/wiki/4、Core Services & Deployment.md](.cospec/wiki/4、Core Services & Deployment.md) | Core services and deployment | approval logic, salary calculation, deployment |
