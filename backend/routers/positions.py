from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Position, Department, Employee
from schemas import PositionCreate, PositionUpdate, PositionOut

router = APIRouter(prefix="/api/positions", tags=["positions"])


def _validate_position(data: PositionCreate | PositionUpdate, db: Session):
    if not data.title.strip():
        raise HTTPException(422, "Position title is required")
    if not db.query(Department).filter(Department.id == data.department_id).first():
        raise HTTPException(400, "Department not found")


@router.get("", response_model=dict)
def list_positions(department_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Position)
    if department_id:
        query = query.filter(Position.department_id == department_id)
    positions = query.all()
    result = []
    for pos in positions:
        dept = db.query(Department).filter(Department.id == pos.department_id).first()
        count = db.query(Employee).filter(Employee.position_id == pos.id, Employee.status == "active").count()
        out = PositionOut(
            id=pos.id, title=pos.title, department_id=pos.department_id,
            level=pos.level, description=pos.description,
            headcount_plan=pos.headcount_plan or 0, created_at=pos.created_at,
            department_name=dept.name if dept else "", employee_count=count,
        )
        result.append(out)
    return {"total": len(result), "items": result}


@router.post("", response_model=PositionOut)
def create_position(data: PositionCreate, db: Session = Depends(get_db)):
    _validate_position(data, db)
    pos = Position(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    dept = db.query(Department).filter(Department.id == pos.department_id).first()
    return PositionOut(
        id=pos.id, title=pos.title, department_id=pos.department_id,
        level=pos.level, description=pos.description,
        headcount_plan=pos.headcount_plan or 0, created_at=pos.created_at,
        department_name=dept.name if dept else "", employee_count=0,
    )


@router.put("/{pos_id}", response_model=PositionOut)
def update_position(pos_id: int, data: PositionUpdate, db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    _validate_position(data, db)
    for key, value in data.model_dump().items():
        setattr(pos, key, value)
    db.commit()
    dept = db.query(Department).filter(Department.id == pos.department_id).first()
    count = db.query(Employee).filter(Employee.position_id == pos.id, Employee.status == "active").count()
    return PositionOut(
        id=pos.id, title=pos.title, department_id=pos.department_id,
        level=pos.level, description=pos.description,
        headcount_plan=pos.headcount_plan or 0, created_at=pos.created_at,
        department_name=dept.name if dept else "", employee_count=count,
    )


@router.delete("/{pos_id}")
def delete_position(pos_id: int, db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    if db.query(Employee).filter(Employee.position_id == pos_id).first():
        raise HTTPException(400, "Position has employees and cannot be deleted")
    db.delete(pos)
    db.commit()
    return {"ok": True}
