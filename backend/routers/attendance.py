from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Attendance, Employee
from schemas import AttendanceCreate, AttendanceUpdate, AttendanceOut

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

VALID_STATUSES = {"normal", "late", "absent", "leave"}


def _to_out(att: Attendance, db: Session) -> AttendanceOut:
    emp = db.query(Employee).filter(Employee.id == att.employee_id).first()
    return AttendanceOut(
        id=att.id, employee_id=att.employee_id, date=att.date,
        check_in=att.check_in, check_out=att.check_out, status=att.status,
        employee_name=emp.name if emp else "",
    )


def _validate_attendance(data: AttendanceCreate | AttendanceUpdate, db: Session, att_id: int | None = None):
    if data.status not in VALID_STATUSES:
        raise HTTPException(400, "Invalid attendance status")
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(404, "Employee not found")
    duplicate = db.query(Attendance).filter(
        Attendance.employee_id == data.employee_id,
        Attendance.date == data.date,
    )
    if att_id:
        duplicate = duplicate.filter(Attendance.id != att_id)
    if duplicate.first():
        raise HTTPException(400, "Attendance record already exists for this employee and date")
    if data.check_in and data.check_out and data.check_out < data.check_in:
        raise HTTPException(400, "Check-out time cannot be earlier than check-in time")


@router.get("", response_model=dict)
def list_attendance(
    employee_id: int | None = None,
    month: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if month:
        query = query.filter(func.strftime("%Y-%m", Attendance.date) == month)
    if status:
        query = query.filter(Attendance.status == status)
    total = query.count()
    items = query.order_by(Attendance.date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": [_to_out(att, db) for att in items]}


@router.get("/stats")
def attendance_stats(month: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Attendance)
    if month:
        query = query.filter(func.strftime("%Y-%m", Attendance.date) == month)
    records = query.all()
    total = len(records)
    normal = sum(1 for r in records if r.status == "normal")
    late = sum(1 for r in records if r.status == "late")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    rate = round(normal / total * 100, 1) if total > 0 else 0
    abnormal = late + absent
    return {
        "total_days": total,
        "normal_days": normal,
        "late_days": late,
        "absent_days": absent,
        "leave_days": leave,
        "abnormal_days": abnormal,
        "rate": rate,
        "total": total,
        "normal": normal,
        "late": late,
        "absent": absent,
        "leave": leave,
    }


@router.post("", response_model=AttendanceOut)
def create_attendance(data: AttendanceCreate, db: Session = Depends(get_db)):
    _validate_attendance(data, db)
    att = Attendance(**data.model_dump())
    db.add(att)
    db.commit()
    db.refresh(att)
    return _to_out(att, db)


@router.put("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(attendance_id: int, data: AttendanceUpdate, db: Session = Depends(get_db)):
    att = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not att:
        raise HTTPException(404, "Attendance record not found")
    _validate_attendance(data, db, att_id=attendance_id)
    for key, value in data.model_dump().items():
        setattr(att, key, value)
    db.commit()
    db.refresh(att)
    return _to_out(att, db)
