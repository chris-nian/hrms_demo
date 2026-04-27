from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import Candidate, Position, Employee, InterviewRound, Evaluation, Offer
from schemas import (
    CandidateCreate, CandidateUpdate, CandidateOut,
    CandidateStageUpdate, InterviewRoundOut, OfferOut,
)
from services.hiring_service import (
    validate_stage_transition, compute_candidate_overall_score,
    convert_candidate_to_employee, compute_round_average,
)

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _to_out(candidate: Candidate, db: Session) -> CandidateOut:
    position_title = ""
    owner_name = ""
    employee_name = ""
    if candidate.position_id:
        pos = db.query(Position).filter(Position.id == candidate.position_id).first()
        position_title = pos.title if pos else ""
    if candidate.owner_id:
        owner = db.query(Employee).filter(Employee.id == candidate.owner_id).first()
        owner_name = owner.name if owner else ""
    if candidate.employee_id:
        emp = db.query(Employee).filter(Employee.id == candidate.employee_id).first()
        employee_name = emp.name if emp else ""
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
        employee_id=candidate.employee_id,
        current_stage_entered_at=candidate.current_stage_entered_at,
        rejection_reason=candidate.rejection_reason,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        position_title=position_title,
        owner_name=owner_name,
        employee_name=employee_name,
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
    stages: str | None = None,
    position_id: int | None = None,
    owner_id: int | None = None,
    source: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
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
    if stages:
        stage_list = [s.strip() for s in stages.split(",") if s.strip()]
        query = query.filter(Candidate.stage.in_(stage_list))
    if position_id:
        query = query.filter(Candidate.position_id == position_id)
    if owner_id:
        query = query.filter(Candidate.owner_id == owner_id)
    if source:
        query = query.filter(Candidate.source == source)
    total = query.count()
    sort_col = getattr(Candidate, sort_by, Candidate.created_at)
    if sort_order == "desc":
        sort_col = sort_col.desc()
    else:
        sort_col = sort_col.asc()
    items = query.order_by(sort_col).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [_to_out(c, db) for c in items]}


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    return _to_out(candidate, db)


@router.get("/{candidate_id}/detail", response_model=dict)
def get_candidate_detail(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    # Interview rounds with assignments
    rounds = db.query(InterviewRound).filter(InterviewRound.candidate_id == candidate_id).order_by(InterviewRound.scheduled_date.asc()).all()
    round_data = []
    for r in rounds:
        interviewers = []
        for a in r.assignments:
            emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
            interviewers.append({"id": a.employee_id, "name": emp.name if emp else ""})
        round_data.append({
            "id": r.id,
            "title": r.title,
            "scheduled_date": str(r.scheduled_date),
            "start_time": r.start_time.isoformat(),
            "end_time": r.end_time.isoformat(),
            "mode": r.mode,
            "location": r.location,
            "status": r.status,
            "interviewers": interviewers,
            "average_score": compute_round_average(r.id, db),
        })

    # Evaluations summary
    evaluations = db.query(Evaluation).join(InterviewRound).filter(
        InterviewRound.candidate_id == candidate_id,
    ).all()
    eval_data = []
    for e in evaluations:
        interviewer = db.query(Employee).filter(Employee.id == e.interviewer_id).first()
        eval_data.append({
            "id": e.id,
            "interview_round_id": e.interview_round_id,
            "interviewer_id": e.interviewer_id,
            "interviewer_name": interviewer.name if interviewer else "",
            "feedback": e.feedback,
            "submitted_at": e.submitted_at.isoformat(),
        })

    # Offers
    offers = db.query(Offer).filter(Offer.candidate_id == candidate_id).order_by(Offer.created_at.desc()).all()
    offer_data = []
    for o in offers:
        pos = db.query(Position).filter(Position.id == o.position_id).first()
        offer_data.append({
            "id": o.id,
            "position_id": o.position_id,
            "position_title": pos.title if pos else "",
            "base_salary": o.base_salary,
            "bonus": o.bonus,
            "proposed_start_date": str(o.proposed_start_date) if o.proposed_start_date else None,
            "employment_type": o.employment_type,
            "work_location": o.work_location,
            "status": o.status,
            "sent_at": o.sent_at.isoformat() if o.sent_at else None,
            "responded_at": o.responded_at.isoformat() if o.responded_at else None,
            "notes": o.notes,
            "created_at": o.created_at.isoformat(),
        })

    overall_score = compute_candidate_overall_score(candidate_id, db)

    return {
        "candidate": _to_out(candidate, db),
        "interview_rounds": round_data,
        "evaluations": eval_data,
        "offers": offer_data,
        "overall_score": overall_score,
    }


@router.post("", response_model=CandidateOut)
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db)):
    _validate_candidate(data, db)
    candidate = Candidate(**data.model_dump())
    candidate.current_stage_entered_at = datetime.utcnow()
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


@router.put("/{candidate_id}/stage", response_model=CandidateOut)
def update_candidate_stage(candidate_id: int, data: CandidateStageUpdate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    validate_stage_transition(candidate, data.stage, data.reason, db)
    if candidate.stage != data.stage:
        candidate.stage = data.stage
        candidate.current_stage_entered_at = datetime.utcnow()
        if data.stage in ("rejected", "withdrawn"):
            candidate.rejection_reason = data.reason
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate, db)


@router.post("/{candidate_id}/convert", response_model=dict)
def convert_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    emp = convert_candidate_to_employee(candidate, db)
    return {"ok": True, "employee_id": emp.id}


@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    db.delete(candidate)
    db.commit()
    return {"ok": True}
