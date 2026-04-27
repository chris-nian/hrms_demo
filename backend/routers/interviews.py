from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import InterviewRound, InterviewAssignment, Employee, Candidate
from schemas import InterviewRoundCreate, InterviewRoundUpdate, InterviewRoundOut
from services.hiring_service import check_interview_conflict

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def _to_out(round: InterviewRound, db: Session) -> InterviewRoundOut:
    interviewers = []
    for a in round.assignments:
        emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
        interviewers.append({"id": a.employee_id, "name": emp.name if emp else ""})
    return InterviewRoundOut(
        id=round.id,
        candidate_id=round.candidate_id,
        title=round.title,
        scheduled_date=round.scheduled_date,
        start_time=round.start_time,
        end_time=round.end_time,
        mode=round.mode,
        location=round.location,
        status=round.status,
        created_at=round.created_at,
        updated_at=round.updated_at,
        interviewers=interviewers,
    )


@router.get("/candidate/{candidate_id}", response_model=dict)
def list_interview_rounds(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    rounds = db.query(InterviewRound).filter(InterviewRound.candidate_id == candidate_id).order_by(InterviewRound.scheduled_date.asc()).all()
    return {"total": len(rounds), "items": [_to_out(r, db) for r in rounds]}


@router.post("/candidate/{candidate_id}", response_model=InterviewRoundOut)
def create_interview_round(candidate_id: int, data: InterviewRoundCreate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    check_interview_conflict(db, candidate_id, data.scheduled_date, data.start_time, data.end_time)
    round = InterviewRound(
        candidate_id=candidate_id,
        title=data.title,
        scheduled_date=data.scheduled_date,
        start_time=data.start_time,
        end_time=data.end_time,
        mode=data.mode,
        location=data.location,
    )
    db.add(round)
    db.flush()
    for emp_id in data.interviewer_ids:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if emp:
            db.add(InterviewAssignment(interview_round_id=round.id, employee_id=emp_id))
    db.commit()
    db.refresh(round)
    return _to_out(round, db)


@router.put("/{round_id}", response_model=InterviewRoundOut)
def update_interview_round(round_id: int, data: InterviewRoundUpdate, db: Session = Depends(get_db)):
    round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not round:
        raise HTTPException(404, "Interview round not found")
    if data.title is not None:
        round.title = data.title
    if data.scheduled_date is not None:
        round.scheduled_date = data.scheduled_date
    if data.start_time is not None:
        round.start_time = data.start_time
    if data.end_time is not None:
        round.end_time = data.end_time
    if data.mode is not None:
        round.mode = data.mode
    if data.location is not None:
        round.location = data.location
    if data.interviewer_ids is not None:
        db.query(InterviewAssignment).filter(InterviewAssignment.interview_round_id == round_id).delete()
        for emp_id in data.interviewer_ids:
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            if emp:
                db.add(InterviewAssignment(interview_round_id=round.id, employee_id=emp_id))
    # Re-check conflict after updates
    check_interview_conflict(db, round.candidate_id, round.scheduled_date, round.start_time, round.end_time, exclude_round_id=round.id)
    db.commit()
    db.refresh(round)
    return _to_out(round, db)


@router.delete("/{round_id}")
def delete_interview_round(round_id: int, db: Session = Depends(get_db)):
    round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not round:
        raise HTTPException(404, "Interview round not found")
    db.delete(round)
    db.commit()
    return {"ok": True}


@router.put("/{round_id}/status", response_model=InterviewRoundOut)
def update_round_status(round_id: int, status: str, db: Session = Depends(get_db)):
    round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not round:
        raise HTTPException(404, "Interview round not found")
    valid_statuses = {"scheduled", "in_progress", "completed", "cancelled"}
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")
    round.status = status
    db.commit()
    db.refresh(round)
    return _to_out(round, db)


@router.get("/my/{employee_id}", response_model=dict)
def list_my_interviews(employee_id: int, db: Session = Depends(get_db)):
    assignments = db.query(InterviewAssignment).filter(InterviewAssignment.employee_id == employee_id).all()
    round_ids = [a.interview_round_id for a in assignments]
    rounds = db.query(InterviewRound).filter(InterviewRound.id.in_(round_ids)).order_by(InterviewRound.scheduled_date.asc()).all()
    return {"total": len(rounds), "items": [_to_out(r, db) for r in rounds]}
