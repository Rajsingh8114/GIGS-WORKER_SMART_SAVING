from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..security import get_current_user
from ..services.tax_engine import tax_summary

router = APIRouter(prefix="/api/tax", tags=["tax"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return tax_summary(db, user.id)


@router.get("/estimate")
def estimate(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    data = tax_summary(db, user.id)
    data["note"] = "Tax rules are intentionally isolated in the tax engine so they can be updated later."
    return data
