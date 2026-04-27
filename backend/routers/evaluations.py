from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    EvaluationCriterion, Evaluation, EvaluationScore,
    InterviewRound, Employee, InterviewAssignment,
)
from schemas import (
    EvaluationCriterionCreate, EvaluationCriterionUpdate, EvaluationCriterionOut,
    EvaluationCreate, EvaluationOut, EvaluationScoreOut,
)
from services.hiring_service import compute_evaluation_weighted_average

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


# ─── Evaluation Criteria ───

@router.get("/criteria", response_model=dict)
def list_criteria(db: Session = Depends(get_db)):
    items = db.query(EvaluationCriterion).filter(EvaluationCriterion.is_active == True).order_by(EvaluationCriterion.sort_order.asc()).all()
    return {"total": len(items), "items": [EvaluationCriterionOut.model_validate(c) for c in items]}


@router.post("/criteria", response_model=EvaluationCriterionOut)
def create_criterion(data: EvaluationCriterionCreate, db: Session = Depends(get_db)):
    criterion = EvaluationCriterion(**data.model_dump())
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion


@router.put("/criteria/{criterion_id}", response_model=EvaluationCriterionOut)
def update_criterion(criterion_id: int, data: EvaluationCriterionUpdate, db: Session = Depends(get_db)):
    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(404, "Criterion not found")
    for key, value in data.model_dump().items():
        setattr(criterion, key, value)
    db.commit()
    db.refresh(criterion)
    return criterion


@router.delete("/criteria/{criterion_id}")
def delete_criterion(criterion_id: int, db: Session = Depends(get_db)):
    criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(404, "Criterion not found")
    criterion.is_active = False
    db.commit()
    return {"ok": True}


# ─── Evaluations ───

def _to_out(evaluation: Evaluation, db: Session) -> EvaluationOut:
    interviewer = db.query(Employee).filter(Employee.id == evaluation.interviewer_id).first()
    scores = db.query(EvaluationScore).filter(EvaluationScore.evaluation_id == evaluation.id).all()
    score_outs = []
    for s in scores:
        criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == s.criterion_id).first()
        score_outs.append(EvaluationScoreOut(
            id=s.id,
            evaluation_id=s.evaluation_id,
            criterion_id=s.criterion_id,
            score=s.score,
            criterion_name=criterion.name if criterion else "",
            weight=criterion.weight if criterion else 1.0,
        ))
    return EvaluationOut(
        id=evaluation.id,
        interview_round_id=evaluation.interview_round_id,
        interviewer_id=evaluation.interviewer_id,
        interviewer_name=interviewer.name if interviewer else "",
        feedback=evaluation.feedback,
        submitted_at=evaluation.submitted_at,
        scores=score_outs,
        weighted_average=compute_evaluation_weighted_average(evaluation, db),
    )


@router.get("/round/{round_id}", response_model=dict)
def list_evaluations(round_id: int, db: Session = Depends(get_db)):
    round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not round:
        raise HTTPException(404, "Interview round not found")
    evaluations = db.query(Evaluation).filter(Evaluation.interview_round_id == round_id).all()
    return {"total": len(evaluations), "items": [_to_out(e, db) for e in evaluations]}


@router.post("/round/{round_id}", response_model=EvaluationOut)
def create_evaluation(round_id: int, data: EvaluationCreate, db: Session = Depends(get_db)):
    round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not round:
        raise HTTPException(404, "Interview round not found")
    if round.status != "completed":
        raise HTTPException(400, "Evaluation can only be submitted for completed interview rounds")

    # Check if interviewer is assigned
    is_assigned = db.query(InterviewAssignment).filter(
        InterviewAssignment.interview_round_id == round_id,
        InterviewAssignment.employee_id == data.interviewer_id,
    ).first()
    if not is_assigned:
        raise HTTPException(403, "Only assigned interviewers can submit evaluations")

    # Check for duplicate evaluation
    existing = db.query(Evaluation).filter(
        Evaluation.interview_round_id == round_id,
        Evaluation.interviewer_id == data.interviewer_id,
    ).first()
    if existing:
        raise HTTPException(400, "Evaluation already submitted by this interviewer for this round")

    evaluation = Evaluation(
        interview_round_id=round_id,
        interviewer_id=data.interviewer_id,
        feedback=data.feedback,
    )
    db.add(evaluation)
    db.flush()

    for s in data.scores:
        criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == s.criterion_id, EvaluationCriterion.is_active == True).first()
        if not criterion:
            raise HTTPException(400, f"Criterion {s.criterion_id} not found or inactive")
        if s.score < 1 or s.score > 5:
            raise HTTPException(400, "Score must be between 1 and 5")
        db.add(EvaluationScore(
            evaluation_id=evaluation.id,
            criterion_id=s.criterion_id,
            score=s.score,
        ))

    db.commit()
    db.refresh(evaluation)
    return _to_out(evaluation, db)
