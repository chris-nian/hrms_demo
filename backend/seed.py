"""Seed demo data into the database."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime, timedelta
import random
from database import engine, SessionLocal, Base
from models import Department, Position, Employee, Attendance, SalaryConfig, ApprovalFlow, ApprovalRecord

NAMES_M = ["张伟", "李强", "王磊", "陈刚", "杨帆", "赵鹏", "刘洋", "孙浩", "周明", "吴军"]
NAMES_F = ["李娜", "王芳", "张敏", "刘静", "陈丽", "杨秀英", "赵敏", "黄丽华", "周婷", "吴娟"]
DEPARTMENTS = [
    ("技术研发部", "负责产品技术研发与系统维护"),
    ("产品设计部", "负责产品规划、UI/UX 设计"),
    ("市场营销部", "负责品牌推广与市场拓展"),
    ("人力资源部", "负责人才招聘、培训与员工关系"),
    ("财务管理部", "负责财务核算、预算与资金管理"),
]
POSITIONS_DATA = [
    [("高级工程师", "P7"), ("工程师", "P6"), ("前端工程师", "P5"), ("后端工程师", "P6"), ("测试工程师", "P5")],
    [("产品经理", "P7"), ("UI设计师", "P5"), ("交互设计师", "P6")],
    [("市场经理", "P7"), ("市场专员", "P5"), ("品牌策划", "P6")],
    [("HR经理", "P7"), ("招聘专员", "P5"), ("培训专员", "P5")],
    [("财务经理", "P7"), ("会计", "P5"), ("出纳", "P4")],
]
AVATARS = [
    f"https://api.dicebear.com/7.x/notionists/svg?seed={i}" for i in range(20)
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(Department).count() > 0:
        db.close()
        return

    # Departments
    depts = []
    for name, desc in DEPARTMENTS:
        dept = Department(name=name, description=desc)
        db.add(dept)
        db.flush()
        depts.append(dept)

    # Positions
    positions = []
    for i, pos_list in enumerate(POSITIONS_DATA):
        for title, level in pos_list:
            pos = Position(title=title, department_id=depts[i].id, level=level)
            db.add(pos)
            db.flush()
            positions.append(pos)

    # Employees
    employees = []
    names = NAMES_M[:8] + NAMES_F[:8]
    genders = ["male"] * 8 + ["female"] * 8
    roles = ["employee"] * 12 + ["manager"] * 2 + ["hr"] * 2

    for i, (name, gender) in enumerate(zip(names, genders)):
        dept_idx = i % 5
        pos_idx = i % len(positions)
        emp = Employee(
            name=name, email=f"emp{i+1:03d}@company.com",
            phone=f"138{random.randint(10000000, 99999999)}",
            gender=gender, avatar=AVATARS[i],
            department_id=depts[dept_idx].id,
            position_id=positions[pos_idx].id,
            hire_date=date(2023, random.randint(1, 12), random.randint(1, 28)),
            status="active", role=roles[i],
        )
        db.add(emp)
        db.flush()
        employees.append(emp)

    # Set first manager in dept 0, second in dept 1, first hr in dept 3, second hr in dept 3
    employees[12].role = "manager"
    employees[12].department_id = depts[0].id
    employees[13].role = "manager"
    employees[13].department_id = depts[1].id
    employees[14].role = "hr"
    employees[14].department_id = depts[3].id
    employees[15].role = "hr"
    employees[15].department_id = depts[3].id

    # Attendance (current month)
    today = date.today()
    month_start = today.replace(day=1)
    for emp in employees:
        for day_offset in range(min(today.day - 1, 20)):
            d = month_start + timedelta(days=day_offset)
            if d.weekday() >= 5:  # skip weekends
                continue
            status = random.choices(
                ["normal", "late", "absent", "leave"],
                weights=[80, 10, 5, 5], k=1
            )[0]
            check_in = datetime(d.year, d.month, d.day, 8, random.randint(50, 59)) if status in ["normal", "late"] else None
            if status == "late":
                check_in = datetime(d.year, d.month, d.day, 9, random.randint(10, 30))
            check_out = datetime(d.year, d.month, d.day, 18, random.randint(0, 30)) if status in ["normal", "late"] else None
            att = Attendance(
                employee_id=emp.id, date=d,
                check_in=check_in, check_out=check_out, status=status,
            )
            db.add(att)

    # Salary configs
    base_salaries = [8000, 10000, 12000, 15000, 18000, 20000, 25000, 30000,
                     9000, 11000, 13000, 16000, 22000, 28000, 14000, 17000]
    for i, emp in enumerate(employees):
        config = SalaryConfig(
            employee_id=emp.id,
            base_salary=base_salaries[i % len(base_salaries)],
            housing_fund_rate=0.12,
            social_insurance_rate=0.105,
            bonus=random.choice([0, 500, 1000, 2000]),
            deduction=random.choice([0, 0, 0, 100]),
        )
        db.add(config)

    # Approval flows
    approval_data = [
        ("请假申请 - 年假3天", "leave", 0, "approved",
         {"leave_type": "annual", "start_date": "2026-03-20", "end_date": "2026-03-22", "reason": "家庭事务"}),
        ("薪资调整申请", "salary_adjust", 1, "pending_hr",
         {"adjust_amount": 3000, "reason": "绩效优秀，建议调薪"}),
        ("请假申请 - 事假1天", "leave", 2, "pending_manager",
         {"leave_type": "personal", "start_date": "2026-04-05", "end_date": "2026-04-05", "reason": "个人事务"}),
        ("设备采购申请", "other", 3, "approved",
         {"item": "MacBook Pro", "amount": 15999, "reason": "开发需要"}),
        ("请假申请 - 病假2天", "leave", 4, "rejected",
         {"leave_type": "sick", "start_date": "2026-03-15", "end_date": "2026-03-16", "reason": "身体不适"}),
    ]

    manager = employees[12]
    hr = employees[14]

    for title, atype, emp_idx, state, content in approval_data:
        applicant = employees[emp_idx]
        flow = ApprovalFlow(
            title=title, type=atype, applicant_id=applicant.id,
            content=content, state=state,
            current_approver_id=hr.id if state == "pending_hr" else (manager.id if state == "pending_manager" else None),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 10)),
        )
        db.add(flow)
        db.flush()

        # Add submit record
        db.add(ApprovalRecord(
            flow_id=flow.id, approver_id=applicant.id,
            action="submit", comment="提交申请",
            created_at=flow.created_at,
        ))

        if state in ["pending_manager"]:
            pass  # only submit
        elif state in ["pending_hr", "approved"]:
            db.add(ApprovalRecord(
                flow_id=flow.id, approver_id=manager.id,
                action="approve", comment="同意" if atype != "salary_adjust" else "绩效确实优秀，建议批准",
                created_at=flow.created_at + timedelta(hours=2),
            ))
        elif state == "rejected":
            if atype == "leave":
                db.add(ApprovalRecord(
                    flow_id=flow.id, approver_id=manager.id,
                    action="reject", comment="项目期间请合理安排假期",
                    created_at=flow.created_at + timedelta(hours=1),
                ))

    db.commit()
    db.close()
    print("Seed data inserted successfully.")


if __name__ == "__main__":
    seed()
