from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services.investment_engine import calculate_risk_profile, recommendations

router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.get("/profile")
def profile(user: models.User = Depends(get_current_user)):
    return {"risk_profile": user.risk_profile}


@router.post("/profile")
def update_profile(payload: schemas.InvestmentProfileIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile_name = calculate_risk_profile(payload.dict())
    user.risk_profile = profile_name
    db.commit()
    return recommendations(profile_name)


@router.get("/recommendations")
def investment_recommendations(user: models.User = Depends(get_current_user)):
    return recommendations(user.risk_profile)
