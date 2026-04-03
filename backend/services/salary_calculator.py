"""Salary calculation engine based on China mainland tax rules."""


TAX_BRACKETS = [
    (3000, 0.03, 0),
    (12000, 0.10, 210),
    (25000, 0.20, 1410),
    (35000, 0.25, 2660),
    (55000, 0.30, 4410),
    (80000, 0.35, 7160),
    (float('inf'), 0.45, 15160),
]

TAX_THRESHOLD = 5000  # 个税起征点


def calculate_tax(taxable_income: float) -> float:
    if taxable_income <= 0:
        return 0.0
    for upper, rate, deduction in TAX_BRACKETS:
        if taxable_income <= upper:
            return round(taxable_income * rate - deduction, 2)
    return 0.0


def calculate_salary(
    base_salary: float,
    bonus: float = 0,
    deduction: float = 0,
    housing_fund_rate: float = 0.12,
    social_insurance_rate: float = 0.105,
) -> dict:
    gross_salary = base_salary + bonus - deduction
    social_insurance = round(gross_salary * social_insurance_rate, 2)
    housing_fund = round(gross_salary * housing_fund_rate, 2)
    taxable_income = round(gross_salary - social_insurance - housing_fund - TAX_THRESHOLD, 2)
    income_tax = calculate_tax(taxable_income)
    net_salary = round(gross_salary - social_insurance - housing_fund - income_tax, 2)

    details = [
        {"label": "gross_salary", "value": gross_salary},
        {"label": "social_insurance", "value": -social_insurance},
        {"label": "housing_fund", "value": -housing_fund},
        {"label": "taxable_income", "value": taxable_income},
        {"label": "income_tax", "value": -income_tax},
        {"label": "net_salary", "value": net_salary},
    ]

    return {
        "gross_salary": gross_salary,
        "social_insurance": social_insurance,
        "housing_fund": housing_fund,
        "taxable_income": taxable_income,
        "income_tax": income_tax,
        "net_salary": net_salary,
        "details": details,
    }
