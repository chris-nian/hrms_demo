---
name: hr-data-seeding
description: Generate realistic demo seed data for the HRMS database. Use when the user needs to populate the system with sample employees, departments, positions, attendance records, salary data, or approval workflows for demonstration or testing purposes.
---

# HR Data Seeding

## Overview

This skill generates realistic, demo-ready seed data for the HRMS SQLite database. It extends the existing `backend/seed.py` with additional data generators for comprehensive demonstrations.

## When to Use This Skill

Use this skill when:

- The user wants demo data for a presentation or video recording
- Testing requires realistic data volumes (e.g., 100+ employees)
- A new model needs sample data
- The user says "seed the database", "add demo data", or "generate test data"

## Existing Seed Infrastructure

The project already has `backend/seed.py` which:
- Creates departments (HR, Engineering, Sales, Marketing)
- Creates positions per department
- Creates employees with relationships
- Creates initial attendance records
- Is called automatically on `main.py` import via `seed()`

## Workflow

### Step 1: Determine Data Requirements

Ask the user (or infer from context):
- What entities need data? (departments, employees, attendance, salary, approvals)
- How many records? (small: 10-20, medium: 50-100, large: 200+)
- Any specific scenarios? (e.g., "an employee with pending approval", "a department at full headcount")

### Step 2: Extend Seed Script

Edit `backend/seed.py` to add or enhance data generation.

#### Generate Departments

```python
department_data = [
    {"name": "人力资源部", "description": "HR Department", "headcount_plan": 10},
    {"name": "技术研发部", "description": "Engineering", "headcount_plan": 50},
    {"name": "销售部", "description": "Sales", "headcount_plan": 30},
    {"name": "市场部", "description": "Marketing", "headcount_plan": 20},
    {"name": "财务部", "description": "Finance", "headcount_plan": 15},
]
```

#### Generate Employees with Realistic Data

Use Faker or deterministic generators:

```python
from datetime import date, timedelta
import random

first_names_male = ["伟", "强", "磊", "军", "明", "辉", "建", "涛", "超", "勇"]
first_names_female = ["芳", "娜", "敏", "静", "丽", "艳", "娟", "玲", "婷", "雪"]
surnames = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周"]

def generate_employee_name(gender=None):
    surname = random.choice(surnames)
    if gender == "male":
        return surname + random.choice(first_names_male)
    elif gender == "female":
        return surname + random.choice(first_names_female)
    return surname + random.choice(first_names_male + first_names_female)

def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))
```

#### Generate Attendance Records

```python
from datetime import datetime, time

for employee in employees:
    for day_offset in range(30):  # Last 30 days
        record_date = date.today() - timedelta(days=day_offset)
        # Skip weekends
        if record_date.weekday() >= 5:
            continue
        
        status = random.choices(
            ["normal", "late", "absent", "leave"],
            weights=[0.85, 0.08, 0.04, 0.03]
        )[0]
        
        check_in = None
        check_out = None
        if status == "normal":
            check_in = datetime.combine(record_date, time(8, random.randint(45, 59)))
            check_out = datetime.combine(record_date, time(17, random.randint(30, 45)))
        elif status == "late":
            check_in = datetime.combine(record_date, time(9, random.randint(10, 30)))
            check_out = datetime.combine(record_date, time(17, random.randint(30, 45)))
        
        db.add(AttendanceRecord(
            employee_id=employee.id,
            date=record_date,
            check_in=check_in,
            check_out=check_out,
            status=status,
        ))
```

#### Generate Salary Data

```python
for employee in employees:
    db.add(SalaryConfig(
        employee_id=employee.id,
        base_salary=random.randint(8000, 50000),
        housing_allowance=random.randint(1000, 5000),
        transport_allowance=random.randint(500, 2000),
        meal_allowance=random.randint(300, 1000),
    ))
```

#### Generate Approval Workflows

```python
approval_types = ["leave", "expense", "overtime"]
approval_statuses = ["draft", "pending_manager", "pending_hr", "approved", "rejected"]

for _ in range(20):
    employee = random.choice(employees)
    approver = random.choice([e for e in employees if e.role in ("manager", "hr")])
    db.add(Approval(
        type=random.choice(approval_types),
        applicant_id=employee.id,
        status=random.choice(approval_statuses),
        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
    ))
```

### Step 3: Add CLI Interface (Optional)

For flexibility, add a CLI to control data volume:

```python
if __name__ == "__main__":
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    seed_employee_count(count)
```

### Step 4: Reset and Reseed

To apply new seed data, remove the existing database and restart:

```bash
rm data/hrms.db
./hrms restart
```

Or set a different data directory:

```bash
HRMS_DATA_DIR=/tmp/hrms_demo ./hrms start
```

### Step 5: Verify Data

Check the seeded data via API or SQLite CLI:

```bash
# Count employees
cd backend && python3 -c "from database import SessionLocal; from models import Employee; db=SessionLocal(); print(db.query(Employee).count())"

# Sample API call
curl http://localhost:8000/api/employees/
```

## Rules

- Use `random.seed(42)` for reproducible demo data when needed
- Generate Chinese names by default (the app's default language is Chinese)
- Ensure referential integrity — employees reference valid departments and positions
- Avoid generating sensitive-looking data (real ID numbers, real phone numbers)
- Keep the `seed()` function idempotent — check if data exists before creating
- Do not commit `data/hrms.db` to Git (it is already in `.gitignore`)
