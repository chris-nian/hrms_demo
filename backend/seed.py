"""Seed initial enterprise data into the database."""
import os
import random
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base, SessionLocal, engine
from models import ApprovalFlow, ApprovalRecord, Attendance, Department, Employee, Position, SalaryConfig

DEPARTMENTS = [
    ("总裁办公室", "负责公司治理、经营协调与重点项目推进", 6),
    ("人力资源部", "负责人力规划、招聘、绩效、薪酬与员工关系", 8),
    ("财务管理部", "负责预算、核算、税务、资金与经营分析", 7),
    ("产品管理部", "负责产品规划、需求管理与业务增长策略", 9),
    ("技术研发部", "负责平台研发、架构治理、质量保障与交付效率", 20),
    ("客户成功部", "负责客户交付、续约经营与服务质量管理", 12),
    ("市场销售部", "负责品牌传播、商机拓展与销售转化", 14),
    ("行政采购部", "负责办公行政、资产采购与供应商管理", 6),
]

POSITIONS = {
    "总裁办公室": [("经营分析经理", "M2", 2), ("总经理助理", "P5", 2), ("项目管理专员", "P4", 2)],
    "人力资源部": [("HR 负责人", "M3", 1), ("招聘经理", "M1", 2), ("薪酬绩效专员", "P5", 3), ("员工关系专员", "P4", 2)],
    "财务管理部": [("财务经理", "M2", 1), ("会计主管", "M1", 2), ("财务分析师", "P5", 2), ("出纳", "P4", 2)],
    "产品管理部": [("产品负责人", "M2", 1), ("高级产品经理", "P7", 3), ("产品经理", "P6", 4), ("数据分析师", "P5", 1)],
    "技术研发部": [("研发负责人", "M3", 1), ("后端工程师", "P6", 6), ("前端工程师", "P6", 4), ("测试工程师", "P5", 3), ("运维工程师", "P5", 2), ("架构师", "P8", 2)],
    "客户成功部": [("客户成功经理", "M1", 3), ("实施顾问", "P5", 4), ("技术支持工程师", "P5", 3), ("服务运营专员", "P4", 2)],
    "市场销售部": [("销售总监", "M3", 1), ("大客户经理", "P6", 5), ("市场经理", "M1", 2), ("品牌策划", "P5", 2), ("销售运营", "P4", 2)],
    "行政采购部": [("行政经理", "M1", 1), ("采购专员", "P4", 2), ("行政专员", "P3", 3)],
}

LAST_NAMES = ["陈", "李", "王", "张", "刘", "赵", "周", "吴", "孙", "马", "朱", "胡", "林", "郭", "何", "高"]
FIRST_NAMES = ["明轩", "思远", "嘉怡", "雨桐", "子涵", "梓萱", "俊杰", "诗涵", "一诺", "浩然", "欣怡", "文博", "若曦", "泽宇", "佳宁", "景行"]
LOCATIONS = ["上海总部", "北京分部", "深圳分部", "成都交付中心", "杭州研发中心"]
EMPLOYMENT_TYPES = ["full_time", "contractor", "intern"]


def _name(index: int) -> str:
    return f"{LAST_NAMES[index % len(LAST_NAMES)]}{FIRST_NAMES[(index * 3) % len(FIRST_NAMES)]}"


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
            pos.description = f"{pos.title}负责岗位职责与业务目标交付。"
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
            emp.emergency_phone = f"15{random.randint(100000000, 999999999)}"
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
                title=f"{dept.name}专员",
                department_id=dept.id,
                level="P4",
                description=f"{dept.name}基础岗位",
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
            phone=f"13{random.randint(100000000, 999999999)}",
            gender="female" if i % 3 == 0 else "male",
            department_id=dept.id,
            position_id=pos.id,
            manager_id=manager.id if manager else None,
            work_location=LOCATIONS[i % len(LOCATIONS)],
            employment_type=EMPLOYMENT_TYPES[0 if i % 10 else 1],
            hire_date=date(2021 + (i % 4), (i % 12) + 1, (i % 25) + 1),
            contract_end_date=date.today() + timedelta(days=45 + (i * 13) % 420),
            emergency_contact=_name(i + 8),
            emergency_phone=f"15{random.randint(100000000, 999999999)}",
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


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Employee).count() > 0 or db.query(Department).count() > 0:
        _backfill_existing(db)
        _expand_existing(db)
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
                description=f"{title}负责{dept.name}相关岗位职责与业务目标交付。",
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
        if dept.name == "人力资源部" and i % 8 in [1, 5]:
            role = "hr"
        status = "inactive" if i in [12, 27, 49, 61] else "active"
        emp = Employee(
            employee_no=f"EMP{1001 + i}",
            name=_name(i),
            email=f"emp{1001 + i}@{email_domains[i % len(email_domains)]}",
            phone=f"13{random.randint(100000000, 999999999)}",
            gender="female" if i % 3 == 0 else "male",
            avatar=f"https://api.dicebear.com/7.x/notionists/svg?seed=emp{1001 + i}",
            department_id=dept.id,
            position_id=pos.id,
            work_location=LOCATIONS[i % len(LOCATIONS)],
            employment_type=EMPLOYMENT_TYPES[0 if i % 11 else 1 if i % 22 else 2],
            hire_date=date(2020 + (i % 5), (i % 12) + 1, (i % 25) + 1),
            contract_end_date=date.today() + timedelta(days=20 + (i * 11) % 520),
            emergency_contact=f"{_name(i + 4)}",
            emergency_phone=f"15{random.randint(100000000, 999999999)}",
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
        ("请假申请 - 年假2天", "leave", employees[3], "pending_manager", {"leave_type": "annual", "start_date": str(today + timedelta(days=5)), "end_date": str(today + timedelta(days=6)), "reason": "家庭安排"}),
        ("薪资调整申请", "salary_adjust", employees[10], "pending_hr", {"amount": 1800, "reason": "季度绩效优秀"}),
        ("请假申请 - 病假1天", "leave", employees[20], "approved", {"leave_type": "sick", "start_date": str(today - timedelta(days=3)), "end_date": str(today - timedelta(days=3)), "reason": "身体不适"}),
        ("岗位津贴申请", "other", employees[36], "rejected", {"reason": "临时项目津贴申请"}),
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
        db.add(ApprovalRecord(flow_id=flow.id, approver_id=applicant.id, action="submit", comment="提交申请", created_at=flow.created_at))
        if state in ["pending_hr", "approved"]:
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=manager.id, action="approve", comment="同意提交 HR 复核", created_at=flow.created_at + timedelta(hours=3)))
        if state == "approved":
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=fallback_hr.id, action="approve", comment="已完成复核", created_at=flow.created_at + timedelta(hours=7)))
        if state == "rejected":
            db.add(ApprovalRecord(flow_id=flow.id, approver_id=manager.id, action="reject", comment="暂不符合当前政策", created_at=flow.created_at + timedelta(hours=2)))

    db.commit()
    db.close()
    print("Initial HRMS data inserted successfully.")


if __name__ == "__main__":
    seed()
