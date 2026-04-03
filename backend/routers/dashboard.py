from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, ApprovalFlow, Attendance
from schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == "active").count()
    department_count = db.query(Department).count()
    pending_approvals = db.query(ApprovalFlow).filter(
        ApprovalFlow.state.in_(["pending_manager", "pending_hr"])
    ).count()

    # attendance rate for current month
    total_att = db.query(Attendance).count()
    normal_att = db.query(Attendance).filter(Attendance.status == "normal").count()
    attendance_rate = round(normal_att / total_att * 100, 1) if total_att > 0 else 0

    recent_flows = db.query(ApprovalFlow).order_by(
        ApprovalFlow.created_at.desc()
    ).limit(5).all()

    # Build simple approval list (without full _to_out to avoid circular imports)
    from schemas import ApprovalFlowOut, ApprovalRecordOut
    recent_approvals = []
    for flow in recent_flows:
        applicant = db.query(Employee).filter(Employee.id == flow.applicant_id).first()
        approver = None
        if flow.current_approver_id:
            approver = db.query(Employee).filter(Employee.id == flow.current_approver_id).first()
        records = [
            ApprovalRecordOut(
                id=r.id, flow_id=r.flow_id, approver_id=r.approver_id,
                approver_name="", action=r.action, comment=r.comment, created_at=r.created_at,
            ) for r in flow.records
        ]
        recent_approvals.append(ApprovalFlowOut(
            id=flow.id, title=flow.title, type=flow.type,
            applicant_id=flow.applicant_id,
            applicant_name=applicant.name if applicant else "",
            content=flow.content, state=flow.state,
            current_approver_id=flow.current_approver_id,
            current_approver_name=approver.name if approver else "",
            created_at=flow.created_at, updated_at=flow.updated_at,
            records=records,
        ))

    return DashboardStats(
        total_employees=total_employees,
        active_employees=active_employees,
        attendance_rate=attendance_rate,
        pending_approvals=pending_approvals,
        department_count=department_count,
        recent_approvals=recent_approvals,
    )
