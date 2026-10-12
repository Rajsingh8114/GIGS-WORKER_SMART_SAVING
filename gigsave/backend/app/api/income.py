from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services.income_analyzer import income_analytics

router = APIRouter(prefix="/api/income", tags=["income"])


@router.post("", response_model=schemas.IncomeOut)
def create_income(payload: schemas.IncomeCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    income = models.Income(user_id=user.id, **payload.dict())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.get("", response_model=list[schemas.IncomeOut])
def list_income(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Income).filter(models.Income.user_id == user.id).order_by(models.Income.income_date.desc()).all()


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return income_analytics(db, user.id)


@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    row = db.query(models.Income).filter(models.Income.id == income_id, models.Income.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Income not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
