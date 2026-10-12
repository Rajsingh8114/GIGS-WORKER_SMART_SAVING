from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from .. import models


DEDUCTIBLE_CATEGORIES = {"Fuel", "Phone", "Vehicle Maintenance", "Insurance", "Equipment"}


def tax_summary(db: Session, user_id: int):
    year_start = date(date.today().year, 1, 1)
    incomes = db.query(models.Income).filter(models.Income.user_id == user_id, models.Income.income_date >= year_start).all()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == user_id, models.Expense.expense_date >= year_start).all()
    annual_income = sum(i.amount for i in incomes)
    category_totals = defaultdict(float)
    deductible = 0
    for expense in expenses:
        category_totals[expense.category] += expense.amount
        if expense.category in DEDUCTIBLE_CATEGORIES:
            deductible += expense.amount
    return {
        "estimated_annual_income": round(annual_income, 2),
        "estimated_business_expenses": round(deductible, 2),
        "estimated_net_income": round(max(0, annual_income - deductible), 2),
        "expense_breakdown": [{"category": key, "amount": round(value, 2)} for key, value in sorted(category_totals.items())],
        "summary": "Track platform payouts and work-related expenses consistently. Fuel, phone, insurance, maintenance, and equipment may be useful categories to review with a tax professional.",
        "disclaimer": "This is an educational estimate and not professional tax advice.",
    }
