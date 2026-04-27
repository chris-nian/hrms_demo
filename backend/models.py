from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, Time, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    headcount_plan: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department", foreign_keys="Employee.department_id")
    positions: Mapped[list["Position"]] = relationship(back_populates="department")
    manager: Mapped["Employee | None"] = relationship(foreign_keys=[manager_id])


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"))
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    headcount_plan: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    department: Mapped["Department"] = relationship(back_populates="positions")
    employees: Mapped[list["Employee"]] = relationship(back_populates="position")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_no: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gender: Mapped[str] = mapped_column(String(10), default="male")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    department_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)
    position_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("positions.id"), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    work_location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(30), default="full_time")
    contract_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    role: Mapped[str] = mapped_column(String(20), default="employee")  # employee/manager/hr
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    department: Mapped["Department | None"] = relationship(back_populates="employees", foreign_keys=[department_id])
    position: Mapped["Position | None"] = relationship(back_populates="employees")
    manager: Mapped["Employee | None"] = relationship(remote_side=[id], foreign_keys=[manager_id])
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


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    position_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("positions.id"), nullable=True)
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    stage: Mapped[str] = mapped_column(String(30), default="new")
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    employee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    current_stage_entered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    position: Mapped["Position | None"] = relationship()
    owner: Mapped["Employee | None"] = relationship(foreign_keys=[owner_id])
    employee: Mapped["Employee | None"] = relationship(foreign_keys=[employee_id])
    interview_rounds: Mapped[list["InterviewRound"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    offers: Mapped[list["Offer"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")


class InterviewRound(Base):
    __tablename__ = "interview_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(Integer, ForeignKey("candidates.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="onsite")  # online, onsite, phone
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled, in_progress, completed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="interview_rounds")
    assignments: Mapped[list["InterviewAssignment"]] = relationship(back_populates="interview_round", cascade="all, delete-orphan")
    evaluations: Mapped[list["Evaluation"]] = relationship(back_populates="interview_round", cascade="all, delete-orphan")


class InterviewAssignment(Base):
    __tablename__ = "interview_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_round_id: Mapped[int] = mapped_column(Integer, ForeignKey("interview_rounds.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)

    interview_round: Mapped["InterviewRound"] = relationship(back_populates="assignments")
    employee: Mapped["Employee"] = relationship()


class EvaluationCriterion(Base):
    __tablename__ = "evaluation_criteria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    interview_round_id: Mapped[int] = mapped_column(Integer, ForeignKey("interview_rounds.id"), nullable=False)
    interviewer_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interview_round: Mapped["InterviewRound"] = relationship(back_populates="evaluations")
    interviewer: Mapped["Employee"] = relationship()
    scores: Mapped[list["EvaluationScore"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    evaluation_id: Mapped[int] = mapped_column(Integer, ForeignKey("evaluations.id"), nullable=False)
    criterion_id: Mapped[int] = mapped_column(Integer, ForeignKey("evaluation_criteria.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)

    evaluation: Mapped["Evaluation"] = relationship(back_populates="scores")
    criterion: Mapped["EvaluationCriterion"] = relationship()


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(Integer, ForeignKey("candidates.id"), nullable=False)
    position_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("positions.id"), nullable=True)
    base_salary: Mapped[float] = mapped_column(Float, default=0)
    bonus: Mapped[float] = mapped_column(Float, default=0)
    proposed_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_type: Mapped[str] = mapped_column(String(30), default="full_time")  # full_time, contractor, intern
    work_location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, pending_approval, approved, sent, accepted, rejected, withdrawn
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="offers")
    position: Mapped["Position | None"] = relationship()
