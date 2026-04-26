from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

import os

DATA_DIR = os.environ.get("HRMS_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'hrms.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upgrade_sqlite_schema():
    """Add new lightweight columns when an existing SQLite file is reused."""
    inspector = inspect(engine)
    if not inspector.has_table("employees"):
        return

    additions = {
        "employees": {
            "employee_no": "VARCHAR(50)",
            "manager_id": "INTEGER",
            "work_location": "VARCHAR(100)",
            "employment_type": "VARCHAR(30) DEFAULT 'full_time'",
            "contract_end_date": "DATE",
            "emergency_contact": "VARCHAR(100)",
            "emergency_phone": "VARCHAR(50)",
        },
        "departments": {
            "manager_id": "INTEGER",
            "headcount_plan": "INTEGER DEFAULT 0",
        },
        "positions": {
            "description": "TEXT",
            "headcount_plan": "INTEGER DEFAULT 0",
        },
    }

    with engine.begin() as connection:
        for table, columns in additions.items():
            if not inspector.has_table(table):
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
