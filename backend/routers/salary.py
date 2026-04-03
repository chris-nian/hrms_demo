from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SalaryConfig, Employee
from schemas import SalaryConfigUpdate, SalaryConfigOut, SalaryCalculateRequest, SalaryCalculateResult
from services.salary_calculator import calculate_salary

router = APIRouter(prefix="/api/salary", tags=["salary"])


@router.get("/config/{employee_id}", response_model=SalaryConfigOut)
def get_salary_config(employee_id: int, db: Session = Depends(get_db)):
    config = db.query(SalaryConfig).filter(SalaryConfig.employee_id == employee_id).first()
    if not config:
        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        if not emp:
            raise HTTPException(404, "Employee not found")
        config = SalaryConfig(employee_id=employee_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/config/{employee_id}", response_model=SalaryConfigOut)
def update_salary_config(employee_id: int, data: SalaryConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(SalaryConfig).filter(SalaryConfig.employee_id == employee_id).first()
    if not config:
        config = SalaryConfig(employee_id=employee_id, **data.model_dump())
        db.add(config)
    else:
        for key, value in data.model_dump().items():
            setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


@router.post("/calculate", response_model=SalaryCalculateResult)
def calculate(req: SalaryCalculateRequest):
    result = calculate_salary(
        base_salary=req.base_salary,
        bonus=req.bonus,
        deduction=req.deduction,
        housing_fund_rate=req.housing_fund_rate,
        social_insurance_rate=req.social_insurance_rate,
    )
    return result
