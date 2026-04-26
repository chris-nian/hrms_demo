from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import ApprovalFlow, ApprovalRecord, Attendance, Employee, SalaryConfig
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


def _first_hr(db: Session) -> Employee | None:
    return db.query(Employee).filter(Employee.role == "hr", Employee.status == "active").first()


def _manager_for(applicant: Employee, db: Session) -> Employee | None:
    if applicant.manager_id:
        manager = db.query(Employee).filter(
            Employee.id == applicant.manager_id,
            Employee.id != applicant.id,
            Employee.status == "active",
        ).first()
        if manager:
            return manager
    if applicant.department_id:
        peer_manager = db.query(Employee).filter(
            Employee.department_id == applicant.department_id,
            Employee.role == "manager",
            Employee.id != applicant.id,
            Employee.status == "active",
        ).first()
        if peer_manager:
            return peer_manager
    fallback = db.query(Employee).filter(
        Employee.role == "manager",
        Employee.id != applicant.id,
        Employee.status == "active",
    ).first()
    if fallback:
        return fallback
    return _first_hr(db)


def _parse_positive_number(value, field: str, allow_zero: bool = False) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise HTTPException(400, f"{field} must be a valid number")
    if number < 0 or (number == 0 and not allow_zero):
        raise HTTPException(400, f"{field} must be positive")
    return number


def _validate_content(flow_type: str, content: dict | None) -> dict:
    content = content or {}
    if flow_type not in {"leave", "salary_adjust", "other"}:
        raise HTTPException(400, "Invalid approval type")
    if flow_type == "leave":
        start = content.get("start_date")
        end = content.get("end_date") or start
        if not start:
            raise HTTPException(400, "Leave start date is required")
        try:
            start_date = date.fromisoformat(str(start))
            end_date = date.fromisoformat(str(end))
        except ValueError:
            raise HTTPException(400, "Leave dates must use YYYY-MM-DD")
        if end_date < start_date:
            raise HTTPException(400, "Leave end date cannot be earlier than start date")
        content["start_date"] = str(start_date)
        content["end_date"] = str(end_date)
        content["leave_type"] = content.get("leave_type") or "annual"
    elif flow_type == "salary_adjust":
        has_amount = content.get("amount") not in (None, "")
        has_new_base = content.get("new_base_salary") not in (None, "")
        if not has_amount and not has_new_base:
            raise HTTPException(400, "Salary adjustment amount or new base salary is required")
        if has_amount:
            content["amount"] = _parse_positive_number(content.get("amount"), "amount")
        if has_new_base:
            content["new_base_salary"] = _parse_positive_number(content.get("new_base_salary"), "new_base_salary")
    elif not content.get("reason"):
        raise HTTPException(400, "Reason is required")
    return content


def _apply_side_effects(flow: ApprovalFlow, db: Session):
    content = flow.content or {}
    if flow.type == "leave":
        start = content.get("start_date")
        end = content.get("end_date") or start
        if not start:
            return
        start_date = date.fromisoformat(str(start))
        end_date = date.fromisoformat(str(end))
        current = start_date
        while current <= end_date:
            if current.weekday() < 5:
                record = db.query(Attendance).filter(
                    Attendance.employee_id == flow.applicant_id,
                    Attendance.date == current,
                ).first()
                if record:
                    record.status = "leave"
                    record.check_in = None
                    record.check_out = None
                else:
                    db.add(Attendance(employee_id=flow.applicant_id, date=current, status="leave"))
            current += timedelta(days=1)
    elif flow.type == "salary_adjust":
        config = db.query(SalaryConfig).filter(SalaryConfig.employee_id == flow.applicant_id).first()
        if not config:
            config = SalaryConfig(employee_id=flow.applicant_id)
            db.add(config)
            db.flush()
        if content.get("new_base_salary") not in (None, ""):
            config.base_salary = float(content["new_base_salary"])
        elif content.get("amount") not in (None, ""):
            config.base_salary = max(0, config.base_salary + float(content["amount"]))


@router.get("", response_model=dict)
def list_approvals(
    role: str | None = None,
    status: str | None = None,
    applicant_id: int | None = None,
    approver_id: int | None = None,
    type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ApprovalFlow)
    if status:
        query = query.filter(ApprovalFlow.state == status)
    if applicant_id:
        query = query.filter(ApprovalFlow.applicant_id == applicant_id)
    if approver_id:
        query = query.filter(ApprovalFlow.current_approver_id == approver_id)
    elif role == "manager":
        query = query.filter(ApprovalFlow.state == "pending_manager")
    elif role == "hr":
        query = query.filter(ApprovalFlow.state == "pending_hr")
    if type:
        query = query.filter(ApprovalFlow.type == type)
    total = query.count()
    flows = query.order_by(ApprovalFlow.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [_to_out(f, db) for f in flows]}


@router.get("/{flow_id}", response_model=ApprovalFlowOut)
def get_approval(flow_id: int, db: Session = Depends(get_db)):
    flow = db.query(ApprovalFlow).filter(ApprovalFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(404, "Approval flow not found")
    return _to_out(flow, db)


@router.post("", response_model=ApprovalFlowOut)
def create_approval(data: ApprovalFlowCreate, db: Session = Depends(get_db)):
    applicant = db.query(Employee).filter(Employee.id == data.applicant_id).first()
    if not applicant:
        raise HTTPException(404, "Applicant not found")
    content = _validate_content(data.type, data.content)
    manager = _manager_for(applicant, db)
    if not manager:
        raise HTTPException(400, "No manager available for approval")
    flow = ApprovalFlow(
        title=data.title, type=data.type, content=content,
        applicant_id=data.applicant_id,
        state="pending_manager",
        current_approver_id=manager.id,
    )
    db.add(flow)
    db.flush()
    db.add(ApprovalRecord(
        flow_id=flow.id, approver_id=flow.applicant_id,
        action="submit", comment="Submitted",
    ))
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
    approver = db.query(Employee).filter(Employee.id == data.approver_id).first()
    if not approver:
        raise HTTPException(404, "Approver not found")
    if flow.current_approver_id != data.approver_id:
        raise HTTPException(403, "Only the current approver can approve this flow")
    if flow.state == "pending_manager" and approver.role != "manager":
        raise HTTPException(403, "Manager approval is required")
    if flow.state == "pending_hr" and approver.role != "hr":
        raise HTTPException(403, "HR approval is required")

    new_state = next_state(flow.state, "approve")
    flow.state = new_state
    flow.updated_at = datetime.utcnow()

    record = ApprovalRecord(
        flow_id=flow.id, approver_id=data.approver_id,
        action="approve", comment=data.comment,
    )
    db.add(record)

    if new_state == "pending_hr":
        hr = _first_hr(db)
        if not hr:
            raise HTTPException(400, "No HR approver available")
        flow.current_approver_id = hr.id
    elif new_state == "approved":
        flow.current_approver_id = None
        _apply_side_effects(flow, db)

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
    approver = db.query(Employee).filter(Employee.id == data.approver_id).first()
    if not approver:
        raise HTTPException(404, "Approver not found")
    if flow.current_approver_id != data.approver_id:
        raise HTTPException(403, "Only the current approver can reject this flow")

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
