from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Position, Department
from schemas import PositionCreate, PositionUpdate, PositionOut

router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=list[PositionOut])
def list_positions(department_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Position)
    if department_id:
        query = query.filter(Position.department_id == department_id)
    positions = query.all()
    result = []
    for pos in positions:
        dept = db.query(Department).filter(Department.id == pos.department_id).first()
        out = PositionOut(
            id=pos.id, title=pos.title, department_id=pos.department_id,
            level=pos.level, created_at=pos.created_at,
            department_name=dept.name if dept else "",
        )
        result.append(out)
    return result


@router.post("", response_model=PositionOut)
def create_position(data: PositionCreate, db: Session = Depends(get_db)):
    pos = Position(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    dept = db.query(Department).filter(Department.id == pos.department_id).first()
    return PositionOut(
        id=pos.id, title=pos.title, department_id=pos.department_id,
        level=pos.level, created_at=pos.created_at,
        department_name=dept.name if dept else "",
    )


@router.put("/{pos_id}", response_model=PositionOut)
def update_position(pos_id: int, data: PositionUpdate, db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    pos.title = data.title
    pos.department_id = data.department_id
    pos.level = data.level
    db.commit()
    dept = db.query(Department).filter(Department.id == pos.department_id).first()
    return PositionOut(
        id=pos.id, title=pos.title, department_id=pos.department_id,
        level=pos.level, created_at=pos.created_at,
        department_name=dept.name if dept else "",
    )


@router.delete("/{pos_id}")
def delete_position(pos_id: int, db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    db.delete(pos)
    db.commit()
    return {"ok": True}
