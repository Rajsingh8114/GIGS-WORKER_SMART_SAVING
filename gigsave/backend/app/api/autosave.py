from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from ..services.ai_client import ai_status, ask_text
from ..services.autosave_engine import decide, get_settings, get_user_key, run_autosave, run_dict, settings_dict

router = APIRouter(prefix="/api/autosave", tags=["autosave"])


def _today_run(db: Session, user: models.User):
    return db.query(models.AutoSaveRun).filter(models.AutoSaveRun.user_id == user.id, models.AutoSaveRun.run_date == date.today()).first()


@router.get("/settings")
def read_settings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    run = _today_run(db, user)
    return {"settings": settings_dict(get_settings(db, user)), "ai": ai_status(get_user_key(db, user)), "today": run_dict(run) if run else None}


@router.put("/settings")
def update_settings(payload: schemas.AutoSaveSettingsIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if payload.goal_id:
        goal = db.query(models.Goal).filter(models.Goal.id == payload.goal_id, models.Goal.user_id == user.id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
    settings = get_settings(db, user)
    for key, value in payload.dict().items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return {"settings": settings_dict(settings), "ai": ai_status(get_user_key(db, user))}


@router.get("/preview")
def preview(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """What auto-save would do right now. Writes nothing."""
    return decide(db, user, get_settings(db, user))


@router.post("/run")
def run(force: bool = False, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return run_autosave(db, user, force=force)


@router.get("/history")
def history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = (
        db.query(models.AutoSaveRun)
        .filter(models.AutoSaveRun.user_id == user.id)
        .order_by(models.AutoSaveRun.run_date.desc())
        .limit(30)
        .all()
    )
    saved = [r for r in rows if r.status == "saved"]
    return {"runs": [run_dict(r) for r in rows], "total_saved": round(sum(r.amount for r in saved), 2), "days_saved": len(saved)}


@router.put("/ai-key")
def save_ai_key(payload: schemas.AIKeyIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Store the user's own Anthropic key after checking that it works. The key is never returned."""
    key = payload.api_key.strip()
    if ask_text("Reply with the single word: ok", "ping", max_tokens=5, api_key=key) is None:
        raise HTTPException(status_code=400, detail="That key didn't work. Check it and your internet connection, then try again.")
    row = db.query(models.AICredential).filter(models.AICredential.user_id == user.id).first()
    if row:
        row.api_key = key
    else:
        db.add(models.AICredential(user_id=user.id, api_key=key))
    db.commit()
    return {"ai": ai_status(key)}


@router.delete("/ai-key")
def remove_ai_key(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    db.query(models.AICredential).filter(models.AICredential.user_id == user.id).delete()
    db.commit()
    return {"ai": ai_status(None)}
