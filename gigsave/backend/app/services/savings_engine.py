from datetime import date, timedelta

from sqlalchemy.orm import Session

from .. import models
from .income_analyzer import (
    calculate_average_expenses,
    calculate_average_income,
    calculate_income_volatility,
    volatility_label,
)


def calculate_monthly_cashflow(db: Session, user_id: int):
    first = date.today().replace(day=1)
    income = sum(i.amount for i in db.query(models.Income).filter(models.Income.user_id == user_id, models.Income.income_date >= first))
    expenses = sum(e.amount for e in db.query(models.Expense).filter(models.Expense.user_id == user_id, models.Expense.expense_date >= first))
    savings = sum(s.amount for s in db.query(models.Saving).filter(models.Saving.user_id == user_id, models.Saving.saving_date >= first))
    return {"income": round(income, 2), "expenses": round(expenses, 2), "savings": round(savings, 2), "balance": round(income - expenses - savings, 2)}


def calculate_emergency_fund_progress(db: Session, user_id: int):
    goal = db.query(models.Goal).filter(models.Goal.user_id == user_id, models.Goal.name.ilike("%emergency%")).first()
    if not goal:
        return {"current": 0, "target": 15000, "percent": 0}
    percent = min(100, (goal.current_amount / goal.target_amount) * 100) if goal.target_amount else 0
    return {"current": round(goal.current_amount, 2), "target": round(goal.target_amount, 2), "percent": round(percent, 1)}


def calculate_savings_capacity(db: Session, user_id: int):
    avg_income = calculate_average_income(db, user_id)
    avg_expenses = calculate_average_expenses(db, user_id)
    surplus = max(0, avg_income - avg_expenses)
    return {
        "average_daily_income": avg_income,
        "average_daily_expenses": avg_expenses,
        "daily_surplus": round(surplus, 2),
    }


def generate_savings_recommendation(db: Session, user: models.User):
    capacity = calculate_savings_capacity(db, user.id)
    volatility = calculate_income_volatility(db, user.id)
    emergency = calculate_emergency_fund_progress(db, user.id)
    surplus = capacity["daily_surplus"]

    if surplus > 500:
        amount = surplus * 0.30
    elif surplus > 200:
        amount = surplus * 0.20
    elif surplus > 80:
        amount = min(50, surplus * 0.15)
    else:
        amount = 0

    if emergency["percent"] < 50 and amount > 0:
        amount *= 1.15
    if volatility > 0.30:
        amount *= 0.75
    if volatility < 0.15 and surplus > 300:
        amount *= 1.05

    daily_target = max(user.monthly_savings_target / 30, 0) if user.monthly_savings_target else 0
    amount = min(amount, surplus * 0.40, daily_target * 1.25 if daily_target else amount)
    amount = max(0, round(amount / 10) * 10)

    factors = [
        f"Average daily income: Rs {capacity['average_daily_income']:,.0f}",
        f"Average daily expenses: Rs {capacity['average_daily_expenses']:,.0f}",
        f"Income volatility is {volatility_label(volatility).lower()} ({volatility * 100:.1f}%)",
        f"Emergency fund is {emergency['percent']}% funded",
    ]
    confidence = "High" if surplus > 250 and volatility < 0.30 else "Medium" if surplus > 100 else "Low"
    reason = "Income has enough surplus after typical daily expenses." if amount else "Surplus is tight today, so GigSave recommends keeping cash flexible."
    return {
        "recommended_amount": amount,
        "reason": reason,
        "confidence": confidence,
        "factors": factors,
        "calculation": {
            **capacity,
            "income_volatility": round(volatility * 100, 1),
            "emergency_fund_progress": emergency,
        },
    }


def savings_history(db: Session, user_id: int, days: int = 30):
    since = date.today() - timedelta(days=days - 1)
    rows = db.query(models.Saving).filter(models.Saving.user_id == user_id, models.Saving.saving_date >= since).all()
    totals = {since + timedelta(days=i): 0 for i in range(days)}
    for row in rows:
        totals[row.saving_date] += row.amount
    return [{"date": d.isoformat(), "amount": round(v, 2)} for d, v in sorted(totals.items())]
