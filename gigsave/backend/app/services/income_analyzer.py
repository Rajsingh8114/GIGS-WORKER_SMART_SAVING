from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, pstdev

from sqlalchemy.orm import Session

from .. import models


def daily_totals(rows, date_attr: str, amount_attr: str, days: int = 30):
    today = date.today()
    totals = {today - timedelta(days=i): 0 for i in range(days)}
    for row in rows:
        row_date = getattr(row, date_attr)
        if row_date in totals:
            totals[row_date] += float(getattr(row, amount_attr))
    return [{"date": day.isoformat(), "amount": round(amount, 2)} for day, amount in sorted(totals.items())]


def calculate_average_income(db: Session, user_id: int, days: int = 30) -> float:
    totals = [item["amount"] for item in daily_totals(_recent_incomes(db, user_id, days), "income_date", "amount", days)]
    return round(mean(totals), 2) if totals else 0


def calculate_average_expenses(db: Session, user_id: int, days: int = 30) -> float:
    totals = [item["amount"] for item in daily_totals(_recent_expenses(db, user_id, days), "expense_date", "amount", days)]
    return round(mean(totals), 2) if totals else 0


def calculate_income_volatility(db: Session, user_id: int, days: int = 30) -> float:
    values = [item["amount"] for item in daily_totals(_recent_incomes(db, user_id, days), "income_date", "amount", days)]
    avg = mean(values) if values else 0
    if avg <= 0:
        return 0
    return round(pstdev(values) / avg, 4)


def volatility_label(volatility: float) -> str:
    if volatility < 0.15:
        return "Stable"
    if volatility <= 0.30:
        return "Moderate"
    return "High"


def income_by_platform(db: Session, user_id: int, days: int = 30):
    totals = defaultdict(float)
    for income in _recent_incomes(db, user_id, days):
        totals[income.platform] += income.amount
    return [{"label": platform, "amount": round(amount, 2)} for platform, amount in sorted(totals.items())]


def income_analytics(db: Session, user_id: int):
    incomes = _recent_incomes(db, user_id, 30)
    trend = daily_totals(incomes, "income_date", "amount", 30)
    values = [item["amount"] for item in trend]
    avg = round(mean(values), 2) if values else 0
    volatility = calculate_income_volatility(db, user_id)
    return {
        "trend": trend,
        "platforms": income_by_platform(db, user_id),
        "average_daily_income": avg,
        "highest_earning_day": round(max(values), 2) if values else 0,
        "lowest_earning_day": round(min(values), 2) if values else 0,
        "income_stability": volatility_label(volatility),
        "income_volatility": round(volatility * 100, 1),
    }


def _recent_incomes(db: Session, user_id: int, days: int):
    since = date.today() - timedelta(days=days - 1)
    return db.query(models.Income).filter(models.Income.user_id == user_id, models.Income.income_date >= since).all()


def _recent_expenses(db: Session, user_id: int, days: int):
    since = date.today() - timedelta(days=days - 1)
    return db.query(models.Expense).filter(models.Expense.user_id == user_id, models.Expense.expense_date >= since).all()
