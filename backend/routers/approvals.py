from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ApprovalFlow, ApprovalRecord, Employee
from schemas import ApprovalFlowCreate, ApprovalAction, ApprovalFlowOut, ApprovalRecordOut
from services.approval_engine import can_transition, next_state

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _to_out(flow: ApprovalFlow, db: Session) -> ApprovalFlowOut:
    applicant = db.query(Employee).filter(Employee.id == flow.applicant_id).first()
    approver = None
    if flow.current_approver_id:
        approver = db.query(Employee).filter(Employee.id == flow.current_approver_id).first()

    records = []
    for rec in flow.records:
        approver_emp = db.query(Employee).filter(Employee.id == rec.approver_id).first()
        records.append(ApprovalRecordOut(
            id=rec.id, flow_id=rec.flow_id, approver_id=rec.approver_id,
            approver_name=approver_emp.name if approver_emp else "",
            action=rec.action, comment=rec.comment, created_at=rec.created_at,
        ))

    return ApprovalFlowOut(
        id=flow.id, title=flow.title, type=flow.type,
        applicant_id=flow.applicant_id,
        applicant_name=applicant.name if applicant else "",
        content=flow.content, state=flow.state,
        current_approver_id=flow.current_approver_id,
        current_approver_name=approver.name if approver else "",
        created_at=flow.created_at, updated_at=flow.updated_at,
        records=records,
    )


@router.get("", response_model=dict)
def list_approvals(
    role: str | None = None,
    status: str | None = None,
    applicant_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ApprovalFlow)
    if status:
        query = query.filter(ApprovalFlow.state == status)
    if applicant_id:
        query = query.filter(ApprovalFlow.applicant_id == applicant_id)
    flows = query.order_by(ApprovalFlow.created_at.desc()).all()
    return {"items": [_to_out(f, db) for f in flows]}


@router.get("/{flow_id}", response_model=ApprovalFlowOut)
def get_approval(flow_id: int, db: Session = Depends(get_db)):
    flow = db.query(ApprovalFlow).filter(ApprovalFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(404, "Approval flow not found")
    return _to_out(flow, db)


@router.post("", response_model=ApprovalFlowOut)
def create_approval(data: ApprovalFlowCreate, db: Session = Depends(get_db)):
    # Find a manager as first approver
    manager = db.query(Employee).filter(Employee.role == "manager").first()
    flow = ApprovalFlow(
        title=data.title, type=data.type, content=data.content,
        applicant_id=data.content.get("applicant_id", 1) if data.content else 1,
        state="draft",
        current_approver_id=manager.id if manager else None,
    )
    db.add(flow)
    db.commit()
    db.refresh(flow)
    # Auto submit
    if manager:
        flow.state = "pending_manager"
        record = ApprovalRecord(
            flow_id=flow.id, approver_id=flow.applicant_id,
            action="submit", comment="Submitted",
        )
        db.add(record)
        db.commit()
        db.refresh(flow)
    return _to_out(flow, db)


@router.post("/{flow_id}/approve")
def approve(flow_id: int, data: ApprovalAction, db: Session = Depends(get_db)):
    flow = db.query(ApprovalFlow).filter(ApprovalFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(404, "Approval flow not found")
    if not can_transition(flow.state, "approve"):
        raise HTTPException(400, f"Cannot approve from state: {flow.state}")

    new_state = next_state(flow.state, "approve")
    flow.state = new_state
    flow.updated_at = datetime.utcnow()

    record = ApprovalRecord(
        flow_id=flow.id, approver_id=data.approver_id,
        action="approve", comment=data.comment,
    )
    db.add(record)

    if new_state == "pending_hr":
        hr = db.query(Employee).filter(Employee.role == "hr").first()
        flow.current_approver_id = hr.id if hr else None
    elif new_state == "approved":
        flow.current_approver_id = None

    db.commit()
    db.refresh(flow)
    return _to_out(flow, db)


@router.post("/{flow_id}/reject")
def reject(flow_id: int, data: ApprovalAction, db: Session = Depends(get_db)):
    flow = db.query(ApprovalFlow).filter(ApprovalFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(404, "Approval flow not found")
    if not can_transition(flow.state, "reject"):
        raise HTTPException(400, f"Cannot reject from state: {flow.state}")

    flow.state = "rejected"
    flow.current_approver_id = None
    flow.updated_at = datetime.utcnow()

    record = ApprovalRecord(
        flow_id=flow.id, approver_id=data.approver_id,
        action="reject", comment=data.comment,
    )
    db.add(record)
    db.commit()
    db.refresh(flow)
    return _to_out(flow, db)
