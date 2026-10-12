from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.post("", response_model=schemas.ExpenseOut)
def create_expense(payload: schemas.ExpenseCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    expense = models.Expense(user_id=user.id, **payload.dict())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("", response_model=list[schemas.ExpenseOut])
def list_expenses(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Expense).filter(models.Expense.user_id == user.id).order_by(models.Expense.expense_date.desc()).all()


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    expenses = db.query(models.Expense).filter(models.Expense.user_id == user.id).all()
    by_category = defaultdict(float)
    total = 0
    for expense in expenses:
        total += expense.amount
        by_category[expense.category] += expense.amount
    return {"total": round(total, 2), "by_category": [{"label": k, "amount": round(v, 2)} for k, v in sorted(by_category.items())]}


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    row = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
