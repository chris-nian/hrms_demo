from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Department, Employee
from schemas import DepartmentCreate, DepartmentUpdate, DepartmentOut

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    result = []
    for dept in departments:
        count = db.query(Employee).filter(Employee.department_id == dept.id).count()
        out = DepartmentOut(
            id=dept.id,
            name=dept.name,
            description=dept.description,
            created_at=dept.created_at,
            employee_count=count,
        )
        result.append(out)
    return result


@router.post("", response_model=DepartmentOut)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentOut(id=dept.id, name=dept.name, description=dept.description, created_at=dept.created_at, employee_count=0)


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    dept.name = data.name
    dept.description = data.description
    db.commit()
    count = db.query(Employee).filter(Employee.department_id == dept.id).count()
    return DepartmentOut(id=dept.id, name=dept.name, description=dept.description, created_at=dept.created_at, employee_count=count)


@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()
    return {"ok": True}
