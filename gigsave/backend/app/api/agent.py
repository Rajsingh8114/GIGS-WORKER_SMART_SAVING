from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services.financial_agent import chat_response

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/chat")
def chat(payload: schemas.AgentMessage, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return chat_response(db, user, payload.message)
