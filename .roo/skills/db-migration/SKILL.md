---
name: db-migration
description: Manage SQLite database schema migrations for the HRMS project. Use when the user needs to add new tables, add columns to existing tables, or modify the database schema. This skill leverages the existing SQLAlchemy models and the lightweight upgrade_sqlite_schema utility.
---

# Database Migration

## Overview

This skill manages schema changes for the SQLite database used by the HRMS backend. Since the project uses SQLAlchemy with SQLite (not Alembic), migrations are handled through a combination of:

1. **Model updates** in `backend/models.py`
2. **Schema upgrades** via `backend/database.py`'s `upgrade_sqlite_schema()` function
3. **Table recreation** when structural changes are complex

## When to Use This Skill

Use this skill when:

- Adding a new entity/table (e.g., `Project`, `Training`, `Asset`)
- Adding columns to existing tables
- Modifying column types or constraints
- Creating new indexes or relationships
- The user says "add a new model", "migrate the database", or "update the schema"

## Workflow

### Step 1: Analyze the Required Change

Determine whether the change is:
- **Additive only** (new table, new nullable column) → safest, can use `upgrade_sqlite_schema`
- **Destructive** (drop column, rename column, change type) → requires table recreation

### Step 2: Update SQLAlchemy Models

Edit `backend/models.py` to add or modify the model class.

Follow existing conventions:
- Use `Mapped[type] = mapped_column(...)` style (SQLAlchemy 2.0)
- Import types from `sqlalchemy`: `String`, `Integer`, `Float`, `Date`, `DateTime`, `ForeignKey`, `Text`, `JSON`
- Use `default=` for default values, not `server_default=`
- Add relationships using `relationship(back_populates=...)`

Example adding a new table:

```python
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    manager: Mapped["Employee | None"] = relationship(foreign_keys=[manager_id])
```

### Step 3: Update Pydantic Schemas

Edit `backend/schemas.py` to add corresponding Pydantic v2 schemas.

Follow existing conventions:
- Use `from_attributes = True` in `Config` (Pydantic v2, not `orm_mode`)
- Create `Base`, `Create`, `Update`, and `Response` variants if needed

Example:

```python
class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    manager_id: int | None = None
    status: str = "active"
    start_date: date | None = None
    end_date: date | None = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    manager_id: int | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

### Step 4: Handle Schema Migration

#### Option A: Additive Changes (New Table or New Nullable Column)

If adding a new table or a nullable column to an existing table:

1. Add the model to `backend/models.py`
2. For new columns on existing tables, add the column definition to `upgrade_sqlite_schema()` in `backend/database.py`:

```python
def upgrade_sqlite_schema():
    inspector = inspect(engine)
    if not inspector.has_table("employees"):
        return

    additions = {
        "employees": {
            # existing columns...
            "new_column": "VARCHAR(100)",
        },
        # add other tables as needed
    }
    # ... rest of the function
```

3. `Base.metadata.create_all(bind=engine)` in `main.py` will create new tables automatically on startup.

#### Option B: Complex Changes (Requires Table Recreation)

SQLite has limited `ALTER TABLE` support. For complex changes:

1. Create a backup of the database file:
   ```bash
   cp data/hrms.db data/hrms.db.backup.$(date +%s)
   ```

2. Write a Python migration script in `backend/` that:
   - Renames the old table
   - Creates the new table with the updated schema
   - Copies data from old to new
   - Drops the old table

3. Run the script:
   ```bash
   cd backend && python3 migrate_xyz.py
   ```

### Step 5: Update Seed Data (Optional)

If the new model should have demo data, update `backend/seed.py`:

```python
from models import Project

# Inside seed() function:
if db.query(Project).first() is None:
    db.add(Project(name="Website Redesign", status="active"))
    db.commit()
```

### Step 6: Verify

1. Restart the backend: `./hrms restart`
2. Check logs for errors
3. Verify the new table/column exists:
   ```bash
   cd backend && python3 -c "from database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
   ```

## Safety Rules

- **Always backup** the SQLite database before destructive migrations
- **Never drop data** without explicit user confirmation
- **Prefer additive changes** — add nullable columns instead of modifying existing ones when possible
- **Test migrations** against a copy of the database, not production data
- The `HRMS_DATA_DIR` environment variable controls where the database file lives
