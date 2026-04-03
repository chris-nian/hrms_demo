from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Attendance, Employee
from schemas import AttendanceOut

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("", response_model=dict)
def list_attendance(
    employee_id: int | None = None,
    month: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if month:
        query = query.filter(Attendance.date.strftime("%Y-%m") == month)
    total = query.count()
    items = query.order_by(Attendance.date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for att in items:
        emp = db.query(Employee).filter(Employee.id == att.employee_id).first()
        result.append(AttendanceOut(
            id=att.id, employee_id=att.employee_id, date=att.date,
            check_in=att.check_in, check_out=att.check_out, status=att.status,
            employee_name=emp.name if emp else "",
        ))
    return {"total": total, "items": result}


@router.get("/stats")
def attendance_stats(month: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Attendance)
    if month:
        query = query.filter(Attendance.date.strftime("%Y-%m") == month)
    records = query.all()
    total = len(records)
    normal = sum(1 for r in records if r.status == "normal")
    late = sum(1 for r in records if r.status == "late")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    rate = round(normal / total * 100, 1) if total > 0 else 0
    return {"total": total, "normal": normal, "late": late, "absent": absent, "leave": leave, "rate": rate}
