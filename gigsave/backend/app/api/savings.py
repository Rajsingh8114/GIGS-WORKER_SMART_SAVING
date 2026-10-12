from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services.savings_engine import calculate_emergency_fund_progress, generate_savings_recommendation, savings_history

router = APIRouter(prefix="/api/savings", tags=["savings"])


@router.post("", response_model=schemas.SavingOut)
def create_saving(payload: schemas.SavingCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    goal = None
    if payload.goal_id:
        goal = db.query(models.Goal).filter(models.Goal.id == payload.goal_id, models.Goal.user_id == user.id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal.current_amount += payload.amount
    saving = models.Saving(user_id=user.id, **payload.dict())
    db.add(saving)
    db.commit()
    db.refresh(saving)
    return saving


@router.get("", response_model=list[schemas.SavingOut])
def list_savings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Saving).filter(models.Saving.user_id == user.id).order_by(models.Saving.saving_date.desc()).all()


@router.get("/recommendation")
def recommendation(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return generate_savings_recommendation(db, user)


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    total = sum(s.amount for s in db.query(models.Saving).filter(models.Saving.user_id == user.id))
    return {"total": round(total, 2), "history": savings_history(db, user.id), "emergency_fund": calculate_emergency_fund_progress(db, user.id)}
