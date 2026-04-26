from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Department, Employee, Position
from schemas import DepartmentCreate, DepartmentUpdate, DepartmentOut

router = APIRouter(prefix="/api/departments", tags=["departments"])


def _validate_department(data: DepartmentCreate | DepartmentUpdate, db: Session):
    if not data.name.strip():
        raise HTTPException(422, "Department name is required")
    if data.manager_id:
        manager = db.query(Employee).filter(Employee.id == data.manager_id).first()
        if not manager:
            raise HTTPException(400, "Department manager not found")
        if manager.role not in {"manager", "hr"}:
            raise HTTPException(400, "Department manager must be a manager or HR")


@router.get("", response_model=dict)
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    result = []
    for dept in departments:
        count = db.query(Employee).filter(Employee.department_id == dept.id, Employee.status == "active").count()
        manager = db.query(Employee).filter(Employee.id == dept.manager_id).first() if dept.manager_id else None
        out = DepartmentOut(
            id=dept.id,
            name=dept.name,
            description=dept.description,
            manager_id=dept.manager_id,
            headcount_plan=dept.headcount_plan or 0,
            created_at=dept.created_at,
            employee_count=count,
            manager_name=manager.name if manager else "",
        )
        result.append(out)
    return {"total": len(result), "items": result}


@router.post("", response_model=DepartmentOut)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    _validate_department(data, db)
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    manager = db.query(Employee).filter(Employee.id == dept.manager_id).first() if dept.manager_id else None
    return DepartmentOut(
        id=dept.id, name=dept.name, description=dept.description,
        manager_id=dept.manager_id, manager_name=manager.name if manager else "",
        headcount_plan=dept.headcount_plan or 0, created_at=dept.created_at, employee_count=0,
    )


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    _validate_department(data, db)
    for key, value in data.model_dump().items():
        setattr(dept, key, value)
    db.commit()
    count = db.query(Employee).filter(Employee.department_id == dept.id, Employee.status == "active").count()
    manager = db.query(Employee).filter(Employee.id == dept.manager_id).first() if dept.manager_id else None
    return DepartmentOut(
        id=dept.id, name=dept.name, description=dept.description,
        manager_id=dept.manager_id, manager_name=manager.name if manager else "",
        headcount_plan=dept.headcount_plan or 0, created_at=dept.created_at, employee_count=count,
    )


@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    if db.query(Employee).filter(Employee.department_id == dept_id).first():
        raise HTTPException(400, "Department has employees and cannot be deleted")
    if db.query(Position).filter(Position.department_id == dept_id).first():
        raise HTTPException(400, "Department has positions and cannot be deleted")
    db.delete(dept)
    db.commit()
    return {"ok": True}
