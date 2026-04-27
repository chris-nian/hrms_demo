"""Seed initial enterprise data into the database."""
import os
import random
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base, SessionLocal, engine
from models import ApprovalFlow, ApprovalRecord, Attendance, Candidate, Department, Employee, Position, SalaryConfig

DEPARTMENTS = [
    ("Executive Office", "Corporate governance, strategic coordination, and key project oversight", 6),
    ("Human Resources", "Workforce planning, recruiting, performance, compensation, and employee relations", 8),
    ("Finance & Accounting", "Budgeting, financial reporting, treasury, tax compliance, and business analysis", 7),
    ("Product Management", "Product strategy, roadmap planning, and business growth initiatives", 9),
    ("Engineering", "Platform development, architecture, quality assurance, and delivery efficiency", 20),
    ("Customer Success", "Client delivery, renewal management, and service quality", 12),
    ("Sales & Marketing", "Brand awareness, lead generation, and revenue conversion", 14),
    ("Administration & Procurement", "Office operations, asset management, and vendor coordination", 6),
]

POSITIONS = {
    "Executive Office": [("Business Analysis Manager", "M2", 2), ("Executive Assistant", "P5", 2), ("Project Coordinator", "P4", 2)],
    "Human Resources": [("HR Director", "M3", 1), ("Recruiting Manager", "M1", 2), ("Compensation & Benefits Specialist", "P5", 3), ("Employee Relations Specialist", "P4", 2)],
    "Finance & Accounting": [("Finance Manager", "M2", 1), ("Accounting Supervisor", "M1", 2), ("Financial Analyst", "P5", 2), ("Treasury Analyst", "P4", 2)],
    "Product Management": [("Head of Product", "M2", 1), ("Senior Product Manager", "P7", 3), ("Product Manager", "P6", 4), ("Data Analyst", "P5", 1)],
    "Engineering": [("VP of Engineering", "M3", 1), ("Backend Engineer", "P6", 6), ("Frontend Engineer", "P6", 4), ("QA Engineer", "P5", 3), ("DevOps Engineer", "P5", 2), ("Solutions Architect", "P8", 2)],
    "Customer Success": [("Customer Success Manager", "M1", 3), ("Implementation Consultant", "P5", 4), ("Technical Support Engineer", "P5", 3), ("Service Operations Specialist", "P4", 2)],
    "Sales & Marketing": [("Sales Director", "M3", 1), ("Key Account Manager", "P6", 5), ("Marketing Manager", "M1", 2), ("Brand Strategist", "P5", 2), ("Sales Operations Analyst", "P4", 2)],
    "Administration & Procurement": [("Office Manager", "M1", 1), ("Procurement Specialist", "P4", 2), ("Administrative Assistant", "P3", 3)],
}

LAST_NAMES = ["Anderson", "Brown", "Clark", "Davis", "Evans", "Foster", "Garcia", "Harris", "Jackson", "Kim", "Lee", "Martinez", "Nelson", "O'Brien", "Parker", "Robinson"]
FIRST_NAMES = ["James", "Emily", "Michael", "Sarah", "David", "Jessica", "Robert", "Ashley", "Daniel", "Amanda", "William", "Stephanie", "Andrew", "Nicole", "Christopher", "Rachel"]
LOCATIONS = ["New York HQ", "San Francisco Office", "London Branch", "Singapore Center", "Austin Campus"]
EMPLOYMENT_TYPES = ["full_time", "contractor", "intern"]


def _name(index: int) -> str:
    return f"{FIRST_NAMES[(index * 3) % len(FIRST_NAMES)]} {LAST_NAMES[index % len(LAST_NAMES)]}"


def _backfill_existing(db):
    employees = db.query(Employee).order_by(Employee.id.asc()).all()
    departments = db.query(Department).all()
    positions = db.query(Position).all()
    managers = [employee for employee in employees if employee.role in {"manager", "hr"} and employee.status == "active"]
    fallback_manager = managers[0] if managers else None

    for index, dept in enumerate(departments):
        if not dept.headcount_plan:
            dept.headcount_plan = max(6, db.query(Employee).filter(Employee.department_id == dept.id).count() + 2)
        if not dept.manager_id:
            manager = next((employee for employee in managers if employee.department_id == dept.id), fallback_manager)
            dept.manager_id = manager.id if manager else None

    for pos in positions:
        if pos.description is None:
            pos.description = f"Responsible for delivering on core duties and business objectives as {pos.title}."
        if not pos.headcount_plan:
            pos.headcount_plan = max(2, db.query(Employee).filter(Employee.position_id == pos.id).count() + 1)

    for index, emp in enumerate(employees):
        if not emp.employee_no:
            emp.employee_no = f"EMP{emp.id:04d}"
        if not emp.employment_type:
            emp.employment_type = "full_time"
        if not emp.work_location:
            emp.work_location = LOCATIONS[index % len(LOCATIONS)]
        if not emp.contract_end_date:
            emp.contract_end_date = date.today() + timedelta(days=90 + (index * 17) % 360)
        if not emp.manager_id and fallback_manager and fallback_manager.id != emp.id:
            dept_manager = next((employee for employee in managers if employee.department_id == emp.department_id and employee.id != emp.id), None)
            emp.manager_id = (dept_manager or fallback_manager).id
        if not emp.emergency_contact:
            emp.emergency_contact = _name(index + 6)
        if not emp.emergency_phone:
            emp.emergency_phone = f"+1{random.randint(2000000000, 9999999999)}"
        if not db.query(SalaryConfig).filter(SalaryConfig.employee_id == emp.id).first():
            db.add(SalaryConfig(
                employee_id=emp.id,
                base_salary=random.choice([9000, 12000, 15000, 18000, 22000]),
                housing_fund_rate=0.12,
                social_insurance_rate=0.105,
            ))
    db.commit()


def _expand_existing(db, target_count: int = 64):
    employees = db.query(Employee).order_by(Employee.id.asc()).all()
    if len(employees) >= target_count:
        return
    departments = db.query(Department).all()
    positions = db.query(Position).all()
    if not departments:
        return
    if not positions:
        for dept in departments:
            pos = Position(
                title=f"{dept.name} Specialist",
                department_id=dept.id,
                level="P4",
                description=f"Generalist role within {dept.name}",
                headcount_plan=4,
            )
            db.add(pos)
            db.flush()
            positions.append(pos)

    managers = [employee for employee in employees if employee.role in {"manager", "hr"} and employee.status == "active"]
    if not managers and employees:
        employees[0].role = "manager"
        managers = [employees[0]]
    hr = next((employee for employee in employees if employee.role == "hr" and employee.status == "active"), None)
    if not hr and len(employees) > 1:
        employees[1].role = "hr"
        hr = employees[1]

    existing_numbers = {employee.employee_no for employee in employees if employee.employee_no}
    start_index = len(employees)
    for i in range(start_index, target_count):
        dept = departments[i % len(departments)]
        dept_positions = [position for position in positions if position.department_id == dept.id] or positions
        pos = dept_positions[i % len(dept_positions)]
        employee_no = f"EMP{1001 + i}"
        while employee_no in existing_numbers:
            i += 1
            employee_no = f"EMP{1001 + i}"
        existing_numbers.add(employee_no)
        manager = next((employee for employee in managers if employee.department_id == dept.id), None) or (managers[0] if managers else None)
        role = "employee"
        if i % 17 == 0:
            role = "manager"
        elif i % 19 == 0:
            role = "hr"
        emp = Employee(
            employee_no=employee_no,
            name=_name(i),
            email=f"emp{1001 + i}@horizon-people.com",
            phone=f"+1{random.randint(2000000000, 9999999999)}",
            gender="female" if i % 3 == 0 else "male",
            department_id=dept.id,
            position_id=pos.id,
            manager_id=manager.id if manager else None,
            work_location=LOCATIONS[i % len(LOCATIONS)],
            employment_type=EMPLOYMENT_TYPES[0 if i % 10 else 1],
            hire_date=date(2021 + (i % 4), (i % 12) + 1, (i % 25) + 1),
            contract_end_date=date.today() + timedelta(days=45 + (i * 13) % 420),
            emergency_contact=_name(i + 8),
            emergency_phone=f"+1{random.randint(2000000000, 9999999999)}",
            status="inactive" if i % 23 == 0 else "active",
            role=role,
        )
        db.add(emp)
        db.flush()
        if role in {"manager", "hr"}:
            managers.append(emp)
            if not dept.manager_id:
                dept.manager_id = emp.id
        db.add(SalaryConfig(
            employee_id=emp.id,
            base_salary=random.choice([9000, 12000, 15000, 18000, 22000, 28000]),
            housing_fund_rate=0.12,
            social_insurance_rate=0.105,
            bonus=random.choice([0, 800, 1500, 2500]),
        ))

    today = date.today()
    month_start = today.replace(day=1)
    for emp in db.query(Employee).filter(Employee.status == "active").all():
        if db.query(Attendance).filter(Attendance.employee_id == emp.id).first():
            continue
        for offset in range(min(today.day, 12)):
            work_date = month_start + timedelta(days=offset)
            if work_date.weekday() >= 5:
                continue
            status = random.choices(["normal", "late", "absent", "leave"], weights=[84, 7, 4, 5], k=1)[0]
            check_in = datetime(work_date.year, work_date.month, work_date.day, 8, random.randint(45, 59)) if status in {"normal", "late"} else None
            if status == "late":
                check_in = datetime(work_date.year, work_date.month, work_date.day, 9, random.randint(5, 35))
            check_out = datetime(work_date.year, work_date.month, work_date.day, 18, random.randint(0, 40)) if status in {"normal", "late"} else None
            db.add(Attendance(employee_id=emp.id, date=work_date, check_in=check_in, check_out=check_out, status=status))
    db.commit()


def _seed_candidates(db, employees=None, positions=None):
    if employees is None:
        employees = db.query(Employee).order_by(Employee.id.asc()).all()
    if positions is None:
        positions = db.query(Position).order_by(Position.id.asc()).all()
    candidate_specs = [
        ("Ryan Mitchell", "ryan.mitchell@example.com", "+12025551001", "new", "LinkedIn", "Recent CS graduate with strong fundamentals"),
        ("Sarah Jenkins", "sarah.jenkins@example.com", "+12025551002", "screening", "Indeed", "3 years of product management experience"),
        ("David Chen", "david.chen@example.com", "+12025551003", "interview", "Referral", "Senior backend developer, Python & Go"),
        ("Emily Watson", "emily.watson@example.com", "+12025551004", "interview", "Referral", "Frontend tech lead, React specialist"),
        ("Brian Foster", "brian.foster@example.com", "+12025551005", "offer", "Glassdoor", "Full-stack engineer with DevOps skills"),
        ("Lauren Davis", "lauren.davis@example.com", "+12025551006", "offer", "LinkedIn", "Data analytics and ML background"),
        ("Mark Robinson", "mark.robinson@example.com", "+12025551007", "hired", "Campus Recruiting", "Accepted offer, onboarding next week"),
        ("Julia Nelson", "julia.nelson@example.com", "+12025551008", "rejected", "Indeed", "Skills did not match current needs"),
        ("Kevin Park", "kevin.park@example.com", "+12025551009", "new", "Glassdoor", "5 years of DevOps and cloud experience"),
        ("Hannah Lee", "hannah.lee@example.com", "+12025551010", "screening", "Referral", "QA engineer with automation expertise"),
    ]
    for i, (name, email, phone, stage, source, notes) in enumerate(candidate_specs):
        pos = positions[i % len(positions)] if positions else None
        owner = employees[i % len(employees)] if employees else None
        db.add(Candidate(
            name=name,
            email=email,
            phone=phone,
            position_id=pos.id if pos else None,
            owner_id=owner.id if owner else None,
            stage=stage,
            source=source,
            notes=notes,
        ))


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Employee).count() > 0 or db.query(Department).count() > 0:
        _backfill_existing(db)
        _expand_existing(db)
        if db.query(Candidate).count() == 0:
            _seed_candidates(db)
        db.close()
        return

    departments: list[Department] = []
    for name, description, plan in DEPARTMENTS:
        dept = Department(name=name, description=description, headcount_plan=plan)
        db.add(dept)
        db.flush()
        departments.append(dept)

    positions: list[Position] = []
    positions_by_dept: dict[int, list[Position]] = {}
    for dept in departments:
        positions_by_dept[dept.id] = []
        for title, level, plan in POSITIONS[dept.name]:
            pos = Position(
                title=title,
                department_id=dept.id,
                level=level,
                description=f"Responsible for delivering on core duties and business objectives as {title} within {dept.name}.",
                headcount_plan=plan,
            )
            db.add(pos)
            db.flush()
            positions.append(pos)
            positions_by_dept[dept.id].append(pos)

    employees: list[Employee] = []
    manager_by_dept: dict[int, Employee] = {}
    email_domains = ["horizon-people.com", "horizon-ops.com"]

    for i in range(64):
        dept = departments[i % len(departments)]
        dept_positions = positions_by_dept[dept.id]
        pos = dept_positions[i % len(dept_positions)]
        role = "employee"
        if i in [1, 18, 24, 31, 38, 45, 52, 59]:
            role = "manager"
        if dept.name == "Human Resources" and i % 8 in [1, 5]:
            role = "hr"
        status = "inactive" if i in [12, 27, 49, 61] else "active"
        emp = Employee(
            employee_no=f"EMP{1001 + i}",
            name=_name(i),
            email=f"emp{1001 + i}@{email_domains[i % len(email_domains)]}",
            phone=f"+1{random.randint(2000000000, 9999999999)}",
            gender="female" if i % 3 == 0 else "male",
            avatar=f"https://api.dicebear.com/7.x/notionists/svg?seed=emp{1001 + i}",
            department_id=dept.id,
            position_id=pos.id,
            work_location=LOCATIONS[i % len(LOCATIONS)],
            employment_type=EMPLOYMENT_TYPES[0 if i % 11 else 1 if i % 22 else 2],
            hire_date=date(2020 + (i % 5), (i % 12) + 1, (i % 25) + 1),
            contract_end_date=date.today() + timedelta(days=20 + (i * 11) % 520),
            emergency_contact=f"{_name(i + 4)}",
            emergency_phone=f"+1{random.randint(2000000000, 9999999999)}",
            status=status,
            role=role,
        )
        db.add(emp)
        db.flush()
        employees.append(emp)
        if role in {"manager", "hr"} and dept.id not in manager_by_dept:
            manager_by_dept[dept.id] = emp
            dept.manager_id = emp.id

    fallback_manager = next(emp for emp in employees if emp.role == "manager")
    fallback_hr = next(emp for emp in employees if emp.role == "hr")
    for emp in employees:
        if emp.id in [manager.id for manager in manager_by_dept.values()]:
            continue
        emp.manager_id = manager_by_dept.get(emp.department_id, fallback_manager).id
    for dept in departments:
        if not dept.manager_id:
            dept.manager_id = manager_by_dept.get(dept.id, fallback_manager).id

    salary_bases = [8500, 10500, 12800, 15000, 18000, 22000, 26000, 32000, 38000]
    for i, emp in enumerate(employees):
        db.add(SalaryConfig(
            employee_id=emp.id,
            base_salary=salary_bases[i % len(salary_bases)],
            housing_fund_rate=0.12,
            social_insurance_rate=0.105,
            bonus=random.choice([0, 600, 1200, 2500, 4000]),
            deduction=random.choice([0, 0, 100, 200]),
        ))

    today = date.today()
    month_start = today.replace(day=1)
    for emp in employees:
        if emp.status != "active":
            continue
        for offset in range(min(today.day, 22)):
            work_date = month_start + timedelta(days=offset)
            if work_date.weekday() >= 5:
                continue
            status = random.choices(["normal", "late", "absent", "leave"], weights=[82, 8, 4, 6], k=1)[0]
            check_in = None
            check_out = None
            if status == "normal":
                check_in = datetime(work_date.year, work_date.month, work_date.day, 8, random.randint(45, 59))
                check_out = datetime(work_date.year, work_date.month, work_date.day, 18, random.randint(0, 40))
            elif status == "late":
                check_in = datetime(work_date.year, work_date.month, work_date.day, 9, random.randint(5, 35))
                check_out = datetime(work_date.year, work_date.month, work_date.day, 18, random.randint(0, 40))
            db.add(Attendance(employee_id=emp.id, date=work_date, check_in=check_in, check_out=check_out, status=status))

    approval_specs = [
        ("Leave Request - Annual Leave 2 Days", "leave", employees[3], "pending_manager", {"leave_type": "annual", "start_date": str(today + timedelta(days=5)), "end_date": str(today + timedelta(days=6)), "reason": "Family event"}),
        ("Salary Adjustment Request", "salary_adjust", employees[10], "pending_hr", {"amount": 1800, "reason": "Outstanding quarterly performance"}),
        ("Leave Request - Sick Leave 1 Day", "leave", employees[20], "approved", {"leave_type": "sick", "start_date": str(today - timedelta(days=3)), "end_date": str(today - timedelta(days=3)), "reason": "Medical appointment"}),
        ("Project Allowance Request", "other", employees[36], "rejected", {"reason": "Temporary project assignment allowance"}),
    ]
    for title, flow_type, applicant, state, content in approval_specs:
        manager = db.query(Employee).filter(Employee.id == applicant.manager_id).first() or fallback_manager
        current = manager.id if state == "pending_manager" else fallback_hr.id if state == "pending_hr" else None
        flow = ApprovalFlow(
            title=title,
            type=flow_type,
            applicant_id=applicant.id,
            content=content,
            state=state,
            current_approver_id=current,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 8)),
        )
        db.add(flow)
        db.flush()
        db.add(ApprovalRecord(flow_id=flow.id, approver_id=applicant.id, action="submit", comment="Submitted for approval", created_at=flow.created_at))
        if state in ["pending_hr", "approved"]:
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=manager.id, action="approve", comment="Approved, forwarding to HR for review", created_at=flow.created_at + timedelta(hours=3)))
        if state == "approved":
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=fallback_hr.id, action="approve", comment="Review completed", created_at=flow.created_at + timedelta(hours=7)))
        if state == "rejected":
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=manager.id, action="reject", comment="Does not meet current policy requirements", created_at=flow.created_at + timedelta(hours=2)))

    _seed_candidates(db, employees, positions)

    db.commit()
    db.close()
    print("Initial HRMS data inserted successfully.")


if __name__ == "__main__":
    seed()
