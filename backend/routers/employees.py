from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, Position, SalaryConfig, Attendance
from schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut

router = APIRouter(prefix="/api/employees", tags=["employees"])


def _to_out(emp: Employee, db: Session) -> EmployeeOut:
    dept_name = ""
    pos_title = ""
    manager_name = ""
    if emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_name = dept.name if dept else ""
    if emp.position_id:
        pos = db.query(Position).filter(Position.id == emp.position_id).first()
        pos_title = pos.title if pos else ""
    if emp.manager_id:
        manager = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        manager_name = manager.name if manager else ""
    salary = db.query(SalaryConfig).filter(SalaryConfig.employee_id == emp.id).first()
    attendance = db.query(Attendance).filter(Attendance.employee_id == emp.id).order_by(Attendance.date.desc()).first()
    return EmployeeOut(
        id=emp.id, employee_no=emp.employee_no, name=emp.name, email=emp.email, phone=emp.phone,
        gender=emp.gender, avatar=emp.avatar, department_id=emp.department_id,
        position_id=emp.position_id, manager_id=emp.manager_id,
        work_location=emp.work_location, employment_type=emp.employment_type,
        contract_end_date=emp.contract_end_date, emergency_contact=emp.emergency_contact,
        emergency_phone=emp.emergency_phone, hire_date=emp.hire_date, status=emp.status,
        role=emp.role, created_at=emp.created_at,
        department_name=dept_name, position_title=pos_title, manager_name=manager_name,
        base_salary=salary.base_salary if salary else None,
        recent_attendance_status=attendance.status if attendance else "",
    )


def _next_employee_no(db: Session) -> str:
    last = db.query(Employee).order_by(Employee.id.desc()).first()
    return f"EMP{((last.id if last else 0) + 1):04d}"


def _validate_employee(data: dict, db: Session, emp_id: int | None = None):
    if not data.get("name", "").strip():
        raise HTTPException(422, "Employee name is required")
    employee_no = data.get("employee_no")
    if employee_no:
        query = db.query(Employee).filter(Employee.employee_no == employee_no)
        if emp_id:
            query = query.filter(Employee.id != emp_id)
        if query.first():
            raise HTTPException(400, "Employee number already exists")
    department_id = data.get("department_id")
    position_id = data.get("position_id")
    if department_id and not db.query(Department).filter(Department.id == department_id).first():
        raise HTTPException(400, "Department not found")
    if position_id:
        position = db.query(Position).filter(Position.id == position_id).first()
        if not position:
            raise HTTPException(400, "Position not found")
        if department_id and position.department_id != department_id:
            raise HTTPException(400, "Position does not belong to selected department")
    manager_id = data.get("manager_id")
    if manager_id:
        if emp_id and manager_id == emp_id:
            raise HTTPException(400, "Employee cannot manage themselves")
        if not db.query(Employee).filter(Employee.id == manager_id).first():
            raise HTTPException(400, "Manager not found")


@router.get("", response_model=dict)
def list_employees(
    search: str | None = None,
    department_id: int | None = None,
    position_id: int | None = None,
    status: str | None = None,
    employment_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            Employee.name.ilike(pattern),
            Employee.employee_no.ilike(pattern),
            Employee.email.ilike(pattern),
            Employee.phone.ilike(pattern),
        ))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if position_id:
        query = query.filter(Employee.position_id == position_id)
    if status:
        query = query.filter(Employee.status == status)
    if employment_type:
        query = query.filter(Employee.employment_type == employment_type)
    total = query.count()
    active_total = query.filter(Employee.status == "active").count()
    items = query.order_by(Employee.employee_no.asc().nullslast(), Employee.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "active_total": active_total, "items": [_to_out(e, db) for e in items]}


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return _to_out(emp, db)


@router.post("", response_model=EmployeeOut)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if not payload.get("employee_no"):
        payload["employee_no"] = _next_employee_no(db)
    _validate_employee(payload, db)
    emp = Employee(**payload)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _to_out(emp, db)


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    payload = data.model_dump()
    payload["name"] = payload["name"].strip()
    if not payload.get("employee_no"):
        payload["employee_no"] = emp.employee_no or _next_employee_no(db)
    _validate_employee(payload, db, emp_id=emp_id)
    for key, value in payload.items():
        setattr(emp, key, value)
    db.commit()
    db.refresh(emp)
    return _to_out(emp, db)


@router.delete("/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    emp.status = "inactive"
    db.commit()
    return {"ok": True, "status": emp.status}
