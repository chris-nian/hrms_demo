from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


# ─── Department ───
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    employee_count: int = 0

    class Config:
        from_attributes = True


# ─── Position ───
class PositionBase(BaseModel):
    title: str
    department_id: int
    level: Optional[str] = None

class PositionCreate(PositionBase):
    pass

class PositionUpdate(PositionBase):
    pass

class PositionOut(PositionBase):
    id: int
    created_at: datetime
    department_name: str = ""

    class Config:
        from_attributes = True


# ─── Employee ───
class EmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: str = "male"
    avatar: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    hire_date: Optional[date] = None
    status: str = "active"
    role: str = "employee"

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(EmployeeBase):
    pass

class EmployeeOut(EmployeeBase):
    id: int
    created_at: datetime
    department_name: str = ""
    position_title: str = ""

    class Config:
        from_attributes = True


# ─── Attendance ───
class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str = "normal"

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceOut(AttendanceBase):
    id: int
    employee_name: str = ""

    class Config:
        from_attributes = True


# ─── Salary ───
class SalaryConfigBase(BaseModel):
    base_salary: float = 0
    housing_fund_rate: float = 0.12
    social_insurance_rate: float = 0.105
    bonus: float = 0
    deduction: float = 0

class SalaryConfigUpdate(SalaryConfigBase):
    pass

class SalaryConfigOut(SalaryConfigBase):
    id: int
    employee_id: int

    class Config:
        from_attributes = True

class SalaryCalculateRequest(BaseModel):
    base_salary: float
    bonus: float = 0
    deduction: float = 0
    housing_fund_rate: float = 0.12
    social_insurance_rate: float = 0.105

class SalaryCalculateResult(BaseModel):
    gross_salary: float
    social_insurance: float
    housing_fund: float
    taxable_income: float
    income_tax: float
    net_salary: float
    details: list[dict]


# ─── Approval ───
class ApprovalFlowCreate(BaseModel):
    title: str
    type: str  # leave/salary_adjust/other
    content: Optional[dict] = None

class ApprovalAction(BaseModel):
    approver_id: int
    comment: Optional[str] = None

class ApprovalRecordOut(BaseModel):
    id: int
    flow_id: int
    approver_id: int
    approver_name: str = ""
    action: str
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalFlowOut(BaseModel):
    id: int
    title: str
    type: str
    applicant_id: int
    applicant_name: str = ""
    content: Optional[dict] = None
    state: str
    current_approver_id: Optional[int] = None
    current_approver_name: str = ""
    created_at: datetime
    updated_at: datetime
    records: list[ApprovalRecordOut] = []

    class Config:
        from_attributes = True


# ─── Dashboard ───
class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    attendance_rate: float
    pending_approvals: int
    department_count: int
    recent_approvals: list[ApprovalFlowOut]
