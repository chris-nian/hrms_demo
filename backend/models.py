from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, Time, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")
    positions: Mapped[list["Position"]] = relationship(back_populates="department")


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"))
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    department: Mapped["Department"] = relationship(back_populates="positions")
    employees: Mapped[list["Employee"]] = relationship(back_populates="position")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gender: Mapped[str] = mapped_column(String(10), default="male")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    department_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)
    position_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("positions.id"), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    role: Mapped[str] = mapped_column(String(20), default="employee")  # employee/manager/hr
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    department: Mapped["Department | None"] = relationship(back_populates="employees")
    position: Mapped["Position | None"] = relationship(back_populates="employees")
    attendances: Mapped[list["Attendance"]] = relationship(back_populates="employee")
    salary_config: Mapped["SalaryConfig | None"] = relationship(back_populates="employee", uselist=False)


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="normal")

    employee: Mapped["Employee"] = relationship(back_populates="attendances")


class SalaryConfig(Base):
    __tablename__ = "salary_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), unique=True)
    base_salary: Mapped[float] = mapped_column(Float, default=0)
    housing_fund_rate: Mapped[float] = mapped_column(Float, default=0.12)
    social_insurance_rate: Mapped[float] = mapped_column(Float, default=0.105)
    bonus: Mapped[float] = mapped_column(Float, default=0)
    deduction: Mapped[float] = mapped_column(Float, default=0)

    employee: Mapped["Employee"] = relationship(back_populates="salary_config")


class ApprovalFlow(Base):
    __tablename__ = "approval_flows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # leave/salary_adjust/other
    applicant_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"))
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    state: Mapped[str] = mapped_column(String(30), default="draft")
    current_approver_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applicant: Mapped["Employee"] = relationship(foreign_keys=[applicant_id])
    current_approver: Mapped["Employee | None"] = relationship(foreign_keys=[current_approver_id])
    records: Mapped[list["ApprovalRecord"]] = relationship(back_populates="flow", cascade="all, delete-orphan")


class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    flow_id: Mapped[int] = mapped_column(Integer, ForeignKey("approval_flows.id"))
    approver_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"))
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # approve/reject/submit
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    flow: Mapped["ApprovalFlow"] = relationship(back_populates="records")
    approver: Mapped["Employee"] = relationship()
