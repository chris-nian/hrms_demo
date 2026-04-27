from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import (
    Candidate, InterviewRound, InterviewAssignment, Evaluation,
    EvaluationCriterion, EvaluationScore, Offer, Employee, Position, ApprovalFlow,
)


# ─── Stage Transition Validator ───

VALID_STAGE_CHAIN = [
    "new", "screening", "phone_interview", "onsite_interview",
    "evaluation", "offer_pending", "offer_sent", "offer_accepted", "hired",
]

TERMINAL_STAGES = {"rejected", "withdrawn"}


def can_change_stage(from_stage: str, to_stage: str) -> bool:
    if from_stage == to_stage:
        return True
    if to_stage in TERMINAL_STAGES:
        return from_stage != "hired"
    if from_stage in TERMINAL_STAGES:
        return False
    try:
        from_idx = VALID_STAGE_CHAIN.index(from_stage)
        to_idx = VALID_STAGE_CHAIN.index(to_stage)
    except ValueError:
        return False
    return to_idx >= from_idx


def validate_stage_transition(
    candidate: Candidate,
    to_stage: str,
    reason: Optional[str],
    db: Session,
) -> None:
    from_stage = candidate.stage or "new"
    if from_stage == to_stage:
        return
    if not can_change_stage(from_stage, to_stage):
        raise HTTPException(400, f"Invalid stage transition from '{from_stage}' to '{to_stage}'")
    if to_stage in TERMINAL_STAGES and not reason:
        raise HTTPException(422, "Reason is required when rejecting or withdrawing a candidate")
    if to_stage == "hired":
        rounds = db.query(InterviewRound).filter(
            InterviewRound.candidate_id == candidate.id,
        ).all()
        if not rounds:
            raise HTTPException(400, "Cannot hire a candidate without interview rounds")
        incomplete = [r for r in rounds if r.status != "completed"]
        if incomplete:
            raise HTTPException(400, "All interview rounds must be completed before hiring")
        has_eval = db.query(Evaluation).join(InterviewRound).filter(
            InterviewRound.candidate_id == candidate.id,
        ).first()
        if not has_eval:
            raise HTTPException(400, "At least one evaluation is required before hiring")


# ─── Interview Conflict Checker ───

def check_interview_conflict(
    db: Session,
    candidate_id: int,
    scheduled_date: date,
    start_time: datetime,
    end_time: datetime,
    exclude_round_id: Optional[int] = None,
) -> None:
    query = db.query(InterviewRound).filter(
        InterviewRound.candidate_id == candidate_id,
        InterviewRound.scheduled_date == scheduled_date,
        InterviewRound.status != "cancelled",
    )
    if exclude_round_id:
        query = query.filter(InterviewRound.id != exclude_round_id)
    existing = query.all()
    for r in existing:
        if start_time < r.end_time and end_time > r.start_time:
            raise HTTPException(400, "Interview round overlaps with an existing round for this candidate")


# ─── Score Aggregator ───

def compute_evaluation_weighted_average(evaluation: Evaluation, db: Session) -> float:
    scores = db.query(EvaluationScore).filter(EvaluationScore.evaluation_id == evaluation.id).all()
    if not scores:
        return 0.0
    total_weighted = 0.0
    total_weight = 0.0
    for s in scores:
        criterion = db.query(EvaluationCriterion).filter(EvaluationCriterion.id == s.criterion_id).first()
        weight = criterion.weight if criterion else 1.0
        total_weighted += s.score * weight
        total_weight += weight
    return round(total_weighted / total_weight, 2) if total_weight > 0 else 0.0


def compute_round_average(round_id: int, db: Session) -> float:
    evaluations = db.query(Evaluation).filter(Evaluation.interview_round_id == round_id).all()
    if not evaluations:
        return 0.0
    averages = [compute_evaluation_weighted_average(e, db) for e in evaluations]
    return round(sum(averages) / len(averages), 2)


def compute_candidate_overall_score(candidate_id: int, db: Session) -> float:
    rounds = db.query(InterviewRound).filter(
        InterviewRound.candidate_id == candidate_id,
        InterviewRound.status == "completed",
    ).all()
    if not rounds:
        return 0.0
    round_avgs = [compute_round_average(r.id, db) for r in rounds]
    valid_avgs = [a for a in round_avgs if a > 0]
    return round(sum(valid_avgs) / len(valid_avgs), 2) if valid_avgs else 0.0


# ─── Offer State Coordinator ───

def validate_offer_creation(candidate: Candidate) -> None:
    allowed_stages = {"evaluation", "offer_pending", "offer_sent", "offer_accepted", "hired"}
    if candidate.stage not in allowed_stages:
        raise HTTPException(400, "Offer can only be created when candidate is in evaluation stage or later")


def validate_offer_status_transition(offer: Offer, new_status: str) -> None:
    valid_flows = {
        "draft": {"pending_approval", "withdrawn"},
        "pending_approval": {"approved", "rejected", "withdrawn"},
        "approved": {"sent", "withdrawn"},
        "sent": {"accepted", "rejected", "withdrawn"},
        "accepted": set(),
        "rejected": set(),
        "withdrawn": set(),
    }
    allowed = valid_flows.get(offer.status, set())
    if new_status not in allowed and new_status != offer.status:
        raise HTTPException(400, f"Cannot transition offer from '{offer.status}' to '{new_status}'")


# ─── Candidate-to-Employee Conversion ───

def convert_candidate_to_employee(candidate: Candidate, db: Session) -> Employee:
    if candidate.stage != "hired":
        raise HTTPException(400, "Only hired candidates can be converted to employees")
    accepted_offer = db.query(Offer).filter(
        Offer.candidate_id == candidate.id,
        Offer.status == "accepted",
    ).first()
    if not accepted_offer:
        raise HTTPException(400, "Candidate must have an accepted offer before conversion")
    if candidate.employee_id:
        raise HTTPException(400, "Candidate has already been converted to an employee")

    position = db.query(Position).filter(Position.id == candidate.position_id).first()
    department_id = position.department_id if position else None

    last = db.query(Employee).order_by(Employee.id.desc()).first()
    employee_no = f"EMP{((last.id if last else 0) + 1):04d}"

    emp = Employee(
        employee_no=employee_no,
        name=candidate.name,
        email=candidate.email,
        phone=candidate.phone,
        position_id=candidate.position_id,
        department_id=department_id,
        hire_date=accepted_offer.proposed_start_date,
        status="active",
        role="employee",
        employment_type=accepted_offer.employment_type or "full_time",
        work_location=accepted_offer.work_location,
    )
    db.add(emp)
    db.flush()
    candidate.employee_id = emp.id
    db.commit()
    db.refresh(emp)
    return emp


# ─── Hire Proposal Side Effects ───

def apply_hire_proposal_approval(flow: ApprovalFlow, db: Session) -> None:
    content = flow.content or {}
    candidate_id = content.get("candidate_id")
    if not candidate_id:
        return
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return
    candidate.stage = "hired"
    candidate.current_stage_entered_at = datetime.utcnow()
    # Update any pending offer to approved
    offer = db.query(Offer).filter(
        Offer.candidate_id == candidate_id,
        Offer.status == "pending_approval",
    ).first()
    if offer:
        offer.status = "approved"
        offer.updated_at = datetime.utcnow()


def apply_hire_proposal_rejection(flow: ApprovalFlow, db: Session) -> None:
    content = flow.content or {}
    candidate_id = content.get("candidate_id")
    if not candidate_id:
        return
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return
    candidate.stage = "evaluation"
    candidate.current_stage_entered_at = datetime.utcnow()
    # Store rejection comment from the last record
    if flow.records:
        last_record = flow.records[-1]
        candidate.rejection_reason = last_record.comment or "Hire proposal rejected"
