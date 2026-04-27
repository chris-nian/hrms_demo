## Implementation

- [x] 1.1 Add Candidate model to backend
     【Target Object】`backend/models.py`
     【Purpose】Define the Candidate entity with relationships to Position and Employee (owner)
     【Method】Append new `Candidate` class using SQLAlchemy 2.0 `Mapped`/`mapped_column` syntax
     【Dependencies】None
     【Content】
        - Add `Candidate` model with fields: `id` (PK), `name`, `email`, `phone`, `position_id` (FK `positions.id`, nullable), `owner_id` (FK `employees.id`, nullable), `stage` (String, default `"new"`), `source` (String, nullable), `notes` (Text, nullable), `created_at` (DateTime, default `datetime.utcnow`), `updated_at` (DateTime, default `datetime.utcnow`, onupdate `datetime.utcnow`)
        - Add `position` relationship to `Position`
        - Add `owner` relationship to `Employee`

- [x] 1.2 Add Candidate schemas
     【Target Object】`backend/schemas.py`
     【Purpose】Provide Pydantic v2 schemas for request/response serialization
     【Method】Follow existing Base → Create/Update → Out pattern
     【Dependencies】None
     【Content】
        - Add `CandidateBase` with `name`, `email`, `phone`, `position_id`, `owner_id`, `stage`, `source`, `notes`
        - Add `CandidateCreate(CandidateBase)`
        - Add `CandidateUpdate(CandidateBase)`
        - Add `CandidateOut(CandidateBase)` with `id`, `created_at`, `updated_at`, `position_title`, `owner_name`, plus `Config: from_attributes = True`

- [x] 1.3 Create candidates router
     【Target Object】`backend/routers/candidates.py` (new file)
     【Purpose】Expose CRUD and list/filter endpoints for candidates
     【Method】Follow existing router patterns (`_to_out` enrichment, `_validate_*` validation) from `backend/routers/employees.py` or `backend/routers/positions.py`
     【Dependencies】`backend/models.py` Candidate model, `backend/schemas.py` Candidate schemas
     【Content】
        - Create `APIRouter(prefix="/api/candidates", tags=["candidates"])`
        - `_to_out(candidate, db)` → queries `Position` and `Employee` to hydrate `position_title` and `owner_name`
        - `_validate_candidate(data, db, candidate_id=None)` → validate name not empty, `position_id` and `owner_id` FKs exist
        - `GET ""` with query params: `search`, `stage`, `position_id`, `owner_id`, `page`, `page_size`; returns `{"total": N, "items": [...]}`
        - `GET "{id}"` → returns `CandidateOut`
        - `POST ""` → create, return `CandidateOut`
        - `PUT "{id}"` → update, return `CandidateOut`
        - `DELETE "{id}"` → hard delete (recruiting data is not employee data, so use hard delete); return `{"ok": true}`

- [x] 1.4 Register candidates router in main app
     【Target Object】`backend/main.py`
     【Purpose】Wire up the new candidates API
     【Method】Import and `app.include_router(candidates.router)`
     【Dependencies】`backend/routers/candidates.py`
     【Content】
        - Add `candidates` to the existing `from routers import departments, positions, employees, attendance, salary, approvals, dashboard` import line
        - Add `app.include_router(candidates.router)` after existing router registrations

- [x] 1.5 Seed sample candidate data
     【Target Object】`backend/seed.py`
     【Purpose】Provide demo candidates across multiple stages so the board is not empty on first run
     【Method】Append candidate seeding at the end of the existing `seed()` function
     【Dependencies】`backend/models.py` Candidate model
     【Content】
        - Add `Candidate` to the existing `from models import ...` import at the top of `seed.py`
        - After employee/position seeding, create ~8–10 sample candidates distributed across stages (`new`, `screening`, `interview`, `offer`, `hired`, `rejected`) referencing existing positions and employees as owners

- [x] 2.1 Add Candidate types and API functions to frontend client
     【Target Object】`frontend/src/api/index.ts`
     【Purpose】Let the Recruiting page communicate with the backend
     【Method】Co-locate type and functions following existing API patterns
     【Dependencies】None
     【Content】
        - Add `Candidate` interface with all scalar fields plus `position_title` and `owner_name`
        - Add `CandidatePayload = Partial<Omit<Candidate, 'id' | 'created_at' | 'updated_at' | 'position_title' | 'owner_name'>>`
        - Add `getCandidates(params?)`, `getCandidate(id)`, `createCandidate(data)`, `updateCandidate(id, data)`, `deleteCandidate(id)`

- [x] 2.2 Create Recruiting Board page
     【Target Object】`frontend/src/pages/Recruiting.tsx` (new file)
     【Purpose】Render a kanban-style board grouped by hardcoded interview stage with CRUD support
     【Method】Use existing UI components (`PageHeader`, `Panel`, `StatCard`, `ModalShell`, `EmptyState`, `LoadingState`) and design-system CSS classes (`.surface-panel`, `.status-badge`, `.field`, `.btn-primary`, etc.)
     【Dependencies】`frontend/src/api/index.ts` Candidate APIs, `frontend/src/components/ui.tsx`
     【Content】
        - Define `STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected']` with color mappings for badges
        - Load candidates via `useEffect` + `useCallback`; maintain `loading` and `error` state
        - Render top `StatCard` row: total candidates + count per stage
        - Render board as horizontal scrollable columns (CSS grid/flex): one column per stage with column header and count
        - Each candidate rendered as a `.surface-panel` card showing name, position title, owner name, source, and a `.status-badge` for stage
        - Clicking a card opens an edit modal (`ModalShell`) with form fields (name, email, phone, position select, owner select, stage select, source, notes)
        - "Add Candidate" button in `PageHeader` opens the same modal with empty state
        - Delete button inside edit modal with confirmation prompt
        - Use `.page-enter` class on the board container for route transition animation

- [x] 2.3 Register recruiting route
     【Target Object】`frontend/src/App.tsx`
     【Purpose】Make the Recruiting page reachable at `/recruiting`
     【Method】Add `Route` inside the existing `Layout` route
     【Dependencies】`frontend/src/pages/Recruiting.tsx`
     【Content】
        - `import Recruiting from './pages/Recruiting'`
        - `<Route path="recruiting" element={<Recruiting />} />`

- [x] 2.4 Add recruiting navigation and page titles
     【Target Object】`frontend/src/components/Layout.tsx`
     【Purpose】Surface the new feature in the sidebar and header
     【Method】Append to `navItems`, `pageTitleKeys`, and `pageSubtitleKeys`
     【Dependencies】None
     【Content】
        - Add nav item object with `path: '/recruiting'`, `titleKey: 'nav.recruiting'`, and an inline SVG icon (briefcase or user-search style)
        - Add `/recruiting` entries to `pageTitleKeys` and `pageSubtitleKeys`

- [x] 2.5 Add i18n translations for recruiting
     【Target Object】`frontend/src/locales/zh.json` and `frontend/src/locales/en.json`
     【Purpose】Support Chinese (default) and English labels for the new page
     【Method】Add keys under `nav.recruiting` and a new `recruiting` namespace
     【Dependencies】None
     【Content】
        - `nav.recruiting`: "招聘看板" / "Recruiting Board"
        - `recruiting.title`, `recruiting.subtitle`, `recruiting.addCandidate`, `recruiting.editCandidate`, `recruiting.deleteConfirm`
        - Stage labels: `recruiting.stage.new`, `screening`, `interview`, `offer`, `hired`, `rejected`
        - Field labels: `recruiting.position`, `recruiting.owner`, `recruiting.source`, `recruiting.notes`, `recruiting.stage`
        - Empty/copy keys: `recruiting.empty`, `recruiting.totalCandidates`
