from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, Position
from schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut

router = APIRouter(prefix="/api/employees", tags=["employees"])


def _to_out(emp: Employee, db: Session) -> EmployeeOut:
    dept_name = ""
    pos_title = ""
    if emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_name = dept.name if dept else ""
    if emp.position_id:
        pos = db.query(Position).filter(Position.id == emp.position_id).first()
        pos_title = pos.title if pos else ""
    return EmployeeOut(
        id=emp.id, name=emp.name, email=emp.email, phone=emp.phone,
        gender=emp.gender, avatar=emp.avatar, department_id=emp.department_id,
        position_id=emp.position_id, hire_date=emp.hire_date, status=emp.status,
        role=emp.role, created_at=emp.created_at,
        department_name=dept_name, position_title=pos_title,
    )


@router.get("", response_model=dict)
def list_employees(
    search: str | None = None,
    department_id: int | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)
    if search:
        query = query.filter(Employee.name.contains(search))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if status:
        query = query.filter(Employee.status == status)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [_to_out(e, db) for e in items]}


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return _to_out(emp, db)


@router.post("", response_model=EmployeeOut)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _to_out(emp, db)


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    for key, value in data.model_dump().items():
        setattr(emp, key, value)
    db.commit()
    db.refresh(emp)
    return _to_out(emp, db)


@router.delete("/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    db.delete(emp)
    db.commit()
    return {"ok": True}
