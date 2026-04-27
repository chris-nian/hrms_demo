from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, Position, Employee
from schemas import CandidateCreate, CandidateUpdate, CandidateOut

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _to_out(candidate: Candidate, db: Session) -> CandidateOut:
    position_title = ""
    owner_name = ""
    if candidate.position_id:
        pos = db.query(Position).filter(Position.id == candidate.position_id).first()
        position_title = pos.title if pos else ""
    if candidate.owner_id:
        owner = db.query(Employee).filter(Employee.id == candidate.owner_id).first()
        owner_name = owner.name if owner else ""
    return CandidateOut(
        id=candidate.id,
        name=candidate.name,
        email=candidate.email,
        phone=candidate.phone,
        position_id=candidate.position_id,
        owner_id=candidate.owner_id,
        stage=candidate.stage,
        source=candidate.source,
        notes=candidate.notes,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        position_title=position_title,
        owner_name=owner_name,
    )


def _validate_candidate(data: CandidateCreate | CandidateUpdate, db: Session, candidate_id: int | None = None):
    if not data.name.strip():
        raise HTTPException(422, "Candidate name is required")
    if data.position_id is not None:
        if not db.query(Position).filter(Position.id == data.position_id).first():
            raise HTTPException(400, "Position not found")
    if data.owner_id is not None:
        if not db.query(Employee).filter(Employee.id == data.owner_id).first():
            raise HTTPException(400, "Owner not found")


@router.get("", response_model=dict)
def list_candidates(
    search: str | None = None,
    stage: str | None = None,
    position_id: int | None = None,
    owner_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            Candidate.name.ilike(pattern),
            Candidate.email.ilike(pattern),
            Candidate.phone.ilike(pattern),
        ))
    if stage:
        query = query.filter(Candidate.stage == stage)
    if position_id:
        query = query.filter(Candidate.position_id == position_id)
    if owner_id:
        query = query.filter(Candidate.owner_id == owner_id)
    total = query.count()
    items = query.order_by(Candidate.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [_to_out(c, db) for c in items]}


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    return _to_out(candidate, db)


@router.post("", response_model=CandidateOut)
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db)):
    _validate_candidate(data, db)
    candidate = Candidate(**data.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate, db)


@router.put("/{candidate_id}", response_model=CandidateOut)
def update_candidate(candidate_id: int, data: CandidateUpdate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    _validate_candidate(data, db, candidate_id=candidate_id)
    for key, value in data.model_dump().items():
        setattr(candidate, key, value)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate, db)


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    db.delete(candidate)
    db.commit()
    return {"ok": True}
