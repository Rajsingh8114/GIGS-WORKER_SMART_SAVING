from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..security import get_current_user
from ..services.financial_agent import generate_financial_insights
from ..services.income_analyzer import income_analytics
from ..services.savings_engine import calculate_monthly_cashflow, generate_savings_recommendation

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    cashflow = calculate_monthly_cashflow(db, user.id)
    total_savings = sum(s.amount for s in db.query(models.Saving).filter(models.Saving.user_id == user.id))
    recommendation = generate_savings_recommendation(db, user)
    goals = db.query(models.Goal).filter(models.Goal.user_id == user.id).limit(3).all()
    return {
        "user": {"name": user.name, "email": user.email, "gig_platform": user.gig_platform},
        "cards": {
            "available_balance": cashflow["balance"],
            "monthly_income": cashflow["income"],
            "monthly_expenses": cashflow["expenses"],
            "total_savings": round(total_savings, 2),
            "savings_target_progress": round(min(100, (cashflow["savings"] / user.monthly_savings_target) * 100), 1) if user.monthly_savings_target else 0,
        },
        "recommendation": recommendation,
        "goals": [
            {"id": goal.id, "name": goal.name, "current_amount": goal.current_amount, "target_amount": goal.target_amount, "progress": round(min(100, goal.current_amount / goal.target_amount * 100), 1)}
            for goal in goals
        ],
        "insights": generate_financial_insights(db, user),
    }


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    today = date.today()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == user.id, models.Expense.expense_date >= today - timedelta(days=29)).all()
    expense_totals = {}
    for expense in expenses:
        expense_totals[expense.category] = expense_totals.get(expense.category, 0) + expense.amount
    return {
        "income": income_analytics(db, user.id),
        "expenses_by_category": [{"label": k, "amount": round(v, 2)} for k, v in sorted(expense_totals.items())],
    }
