from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, Position, ApprovalFlow, Attendance, SalaryConfig
from schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == "active").count()
    inactive_employees = db.query(Employee).filter(Employee.status != "active").count()
    department_count = db.query(Department).count()
    position_count = db.query(Position).count()
    pending_approvals = db.query(ApprovalFlow).filter(
        ApprovalFlow.state.in_(["pending_manager", "pending_hr"])
    ).count()

    # attendance rate for current month
    month = date.today().strftime("%Y-%m")
    total_att = db.query(Attendance).filter(func.strftime("%Y-%m", Attendance.date) == month).count()
    normal_att = db.query(Attendance).filter(func.strftime("%Y-%m", Attendance.date) == month, Attendance.status == "normal").count()
    abnormal_attendance_count = db.query(Attendance).filter(
        func.strftime("%Y-%m", Attendance.date) == month,
        Attendance.status.in_(["late", "absent"]),
    ).count()
    attendance_rate = round(normal_att / total_att * 100, 1) if total_att > 0 else 0
    today = date.today()
    contracts_expiring_30 = db.query(Employee).filter(
        Employee.status == "active",
        Employee.contract_end_date >= today,
        Employee.contract_end_date <= today + timedelta(days=30),
    ).count()
    contracts_expiring_60 = db.query(Employee).filter(
        Employee.status == "active",
        Employee.contract_end_date >= today,
        Employee.contract_end_date <= today + timedelta(days=60),
    ).count()
    salary_configs = db.query(SalaryConfig).join(Employee, SalaryConfig.employee_id == Employee.id).filter(
        Employee.status == "active"
    ).count()
    salary_config_coverage = min(100, round(salary_configs / active_employees * 100, 1)) if active_employees else 0
    department_distribution = []
    for dept in db.query(Department).all():
        count = db.query(Employee).filter(Employee.department_id == dept.id, Employee.status == "active").count()
        department_distribution.append({"department_id": dept.id, "name": dept.name, "count": count})

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
        inactive_employees=inactive_employees,
        attendance_rate=attendance_rate,
        abnormal_attendance_count=abnormal_attendance_count,
        pending_approvals=pending_approvals,
        department_count=department_count,
        position_count=position_count,
        contracts_expiring_30=contracts_expiring_30,
        contracts_expiring_60=contracts_expiring_60,
        salary_config_coverage=salary_config_coverage,
        department_distribution=department_distribution,
        recent_approvals=recent_approvals,
    )
