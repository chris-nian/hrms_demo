# Change: Add Recruiting Board

## Rationale
The HRMS currently lacks any recruiting/ATS capability. A lightweight Recruiting Board will let HR track candidates through fixed interview stages, assign employee owners, and manage candidate records without adding external dependencies.

## Changes
- Add `Candidate` database model with FK to `Position` and `Employee` (owner).
- Add Pydantic schemas and REST router (`/api/candidates`) with list filtering by stage, position, owner, and search.
- Add seed data for a handful of sample candidates across stages.
- Add frontend Kanban board page (`/recruiting`) showing columns per hardcoded stage: **New → Screening → Interview → Offer → Hired → Rejected**.
- Add CRUD modal for candidates; stage changes via dropdown inside the modal (no drag-and-drop library).
- Add navigation entry, routing, i18n keys, and API client types.

## Impact
- **Affected Specifications**: Recruiting / Candidate Tracking
- **Affected Code**:
  - `backend/models.py`: add `Candidate` SQLAlchemy model.
  - `backend/schemas.py`: add `CandidateBase/Create/Update/Out` schemas.
  - `backend/routers/candidates.py`: new router with list, detail, create, update, delete endpoints.
  - `backend/main.py`: register `candidates` router.
  - `backend/seed.py`: generate sample candidates.
  - `backend/tests/test_candidates.py`: backend API tests.
  - `frontend/src/api/index.ts`: add `Candidate` type and API functions.
  - `frontend/src/pages/Recruiting.tsx`: new Kanban board page.
  - `frontend/src/App.tsx`: add `/recruiting` route.
  - `frontend/src/components/Layout.tsx`: add nav item and page title/subtitle keys.
  - `frontend/src/locales/zh.json` & `en.json`: add recruiting translations.
  - `frontend/src/pages/__tests__/Recruiting.test.tsx`: frontend page tests.
