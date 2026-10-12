"""Daily auto-save: decides how much to move into savings and records it.

Safety model
------------
* The deterministic recommendation from ``savings_engine`` is always the anchor.
* The adaptive layer / the AI may only move the amount between 0 and 125% of that
  anchor. Whatever they return is clamped again by hard guardrails
  (max per day, keep-safe cash buffer), so the AI can never overspend.
* One decision per user per day (unique constraint) -> safe to call on every page load.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from .. import models
from .ai_client import ai_status, ask_json
from .savings_engine import calculate_savings_capacity, generate_savings_recommendation

AI_CEILING = 1.25  # AI / adaptive layer may not exceed 125% of the rule-based amount


# ---------------------------------------------------------------- pure helpers
def round10(value: float) -> float:
    return max(0, round(value / 10) * 10)


def adaptive_factor(today_income: float, avg_income: float):
    """Scale the rule amount by how today's earnings compare with the 30-day average."""
    if today_income <= 0 or avg_income <= 0:
        return 1.0, "No payout logged yet today, so the standard amount is used."
    ratio = today_income / avg_income
    if ratio < 0.5:
        return 0.6, f"Today's income (Rs {today_income:,.0f}) is well below your average, so the amount is reduced."
    if ratio < 0.8:
        return 0.85, f"Today's income (Rs {today_income:,.0f}) is a bit below average, so the amount is trimmed."
    if ratio > 1.3:
        return 1.15, f"Today's income (Rs {today_income:,.0f}) is above average, so a little extra is set aside."
    return 1.0, f"Today's income (Rs {today_income:,.0f}) is close to your average."


def apply_guardrails(amount: float, rule_amount: float, max_daily: float, balance: float, min_buffer: float):
    """Clamp `amount` and return (final_amount, [notes])."""
    notes = []
    amount = max(0.0, amount)
    ceiling = rule_amount * AI_CEILING
    if amount > ceiling:
        amount = ceiling
    if amount > max_daily:
        amount = max_daily
        notes.append(f"capped at your daily limit of Rs {max_daily:,.0f}")
    headroom = balance - min_buffer
    if amount > headroom:
        amount = max(0.0, headroom)
        notes.append(f"limited to keep Rs {min_buffer:,.0f} of cash available")
    return round10(amount), notes


def rolling_balance(db: Session, user_id: int, days: int = 30) -> float:
    """Income - expenses - savings over the last `days` days (cash still available)."""
    since = date.today() - timedelta(days=days - 1)
    income = sum(i.amount for i in db.query(models.Income).filter(models.Income.user_id == user_id, models.Income.income_date >= since))
    spent = sum(e.amount for e in db.query(models.Expense).filter(models.Expense.user_id == user_id, models.Expense.expense_date >= since))
    saved = sum(s.amount for s in db.query(models.Saving).filter(models.Saving.user_id == user_id, models.Saving.saving_date >= since))
    return round(income - spent - saved, 2)


def get_user_key(db: Session, user: models.User):
    row = db.query(models.AICredential).filter(models.AICredential.user_id == user.id).first()
    return row.api_key if row else None


# ------------------------------------------------------------------- settings
def get_settings(db: Session, user: models.User) -> models.AutoSaveSetting:
    settings = db.query(models.AutoSaveSetting).filter(models.AutoSaveSetting.user_id == user.id).first()
    if not settings:
        settings = models.AutoSaveSetting(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def settings_dict(settings: models.AutoSaveSetting) -> dict:
    return {
        "enabled": settings.enabled,
        "mode": settings.mode,
        "use_ai": settings.use_ai,
        "fixed_amount": settings.fixed_amount,
        "max_daily": settings.max_daily,
        "min_buffer": settings.min_buffer,
        "goal_id": settings.goal_id,
    }


def run_dict(run: models.AutoSaveRun) -> dict:
    return {
        "id": run.id,
        "run_date": run.run_date.isoformat(),
        "status": run.status,
        "engine": run.engine,
        "amount": run.amount,
        "rule_amount": run.rule_amount,
        "reason": run.reason,
        "goal_id": run.goal_id,
    }


# ------------------------------------------------------------------- decision
def decide(db: Session, user: models.User, settings: models.AutoSaveSetting) -> dict:
    """Work out today's amount without writing anything."""
    today = date.today()
    rec = generate_savings_recommendation(db, user)
    rule_amount = float(rec["recommended_amount"])
    balance = rolling_balance(db, user.id)
    capacity = calculate_savings_capacity(db, user.id)
    today_income = sum(
        i.amount for i in db.query(models.Income).filter(models.Income.user_id == user.id, models.Income.income_date == today)
    )

    if settings.mode == "fixed":
        engine = "fixed"
        amount, notes = apply_guardrails(
            settings.fixed_amount, max(rule_amount, settings.fixed_amount), settings.max_daily, balance, settings.min_buffer
        )
        reason = f"Fixed daily amount of Rs {settings.fixed_amount:,.0f}."
    else:
        factor, factor_reason = adaptive_factor(today_income, capacity["average_daily_income"])
        amount = rule_amount * factor
        engine = "adaptive"
        reason = factor_reason

        user_key = get_user_key(db, user)
        if settings.use_ai and ai_status(user_key)["configured"] and rule_amount > 0:
            ai = ask_json(
                system=(
                    "You are the savings guardrail assistant inside GigSave, an app for gig workers with irregular income. "
                    "Decide how many rupees to move into savings today. Be conservative: never exceed max_amount. "
                    'Reply with ONLY JSON: {"amount": <number>, "reason": "<one friendly sentence, max 200 chars>"}.'
                ),
                prompt=(
                    "Context (INR): "
                    f"rule_based_amount={rule_amount:.0f}, max_amount={rule_amount * AI_CEILING:.0f}, "
                    f"today_income={today_income:.0f}, average_daily_income={capacity['average_daily_income']:.0f}, "
                    f"average_daily_expenses={capacity['average_daily_expenses']:.0f}, "
                    f"income_volatility_percent={rec['calculation']['income_volatility']}, "
                    f"last_30_days_balance_after_expenses_and_savings={balance:.0f}, "
                    f"emergency_fund_percent={rec['calculation']['emergency_fund_progress']['percent']}, "
                    f"weekday={today.strftime('%A')}."
                ),
                api_key=user_key,
            )
            try:
                ai_amount = float(ai["amount"]) if ai else None
            except (KeyError, TypeError, ValueError):
                ai_amount = None
            if ai_amount is not None and ai_amount == ai_amount:  # not NaN
                amount = ai_amount
                engine = "ai"
                reason = str(ai.get("reason") or reason)[:240]

        amount, notes = apply_guardrails(amount, rule_amount, settings.max_daily, balance, settings.min_buffer)

    if notes:
        reason = f"{reason} ({'; '.join(notes)})"
    if amount <= 0 and not notes:
        reason = f"{reason} Surplus is tight, so nothing is saved today."
    return {
        "amount": amount,
        "rule_amount": rule_amount,
        "engine": engine,
        "reason": reason,
        "confidence": rec["confidence"],
        "today_income": round(today_income, 2),
        "factors": rec["factors"],
    }


def run_autosave(db: Session, user: models.User, force: bool = False) -> dict:
    """Idempotent daily run. Returns {"status": ..., "run": {...}|None}.

    status: disabled | already_ran | saved | skipped
    force=True redoes a *skipped* run for today; a saved run is never duplicated.
    """
    settings = get_settings(db, user)
    if not settings.enabled:
        return {"status": "disabled", "run": None}

    today = date.today()
    existing = db.query(models.AutoSaveRun).filter(models.AutoSaveRun.user_id == user.id, models.AutoSaveRun.run_date == today).first()
    if existing:
        if not (force and existing.status == "skipped"):
            return {"status": "already_ran", "run": run_dict(existing)}
        db.delete(existing)
        db.commit()

    decision = decide(db, user, settings)
    goal = None
    if settings.goal_id:
        goal = db.query(models.Goal).filter(models.Goal.id == settings.goal_id, models.Goal.user_id == user.id).first()

    saving = None
    if decision["amount"] > 0:
        source = "AI Auto-Save" if decision["engine"] == "ai" else "Auto-Save"
        saving = models.Saving(user_id=user.id, amount=decision["amount"], saving_date=today, source=source, goal_id=goal.id if goal else None)
        db.add(saving)
        if goal:
            goal.current_amount += decision["amount"]
        db.flush()

    run = models.AutoSaveRun(
        user_id=user.id,
        run_date=today,
        status="saved" if saving else "skipped",
        engine=decision["engine"],
        amount=decision["amount"],
        rule_amount=decision["rule_amount"],
        reason=decision["reason"],
        goal_id=goal.id if goal else None,
        saving_id=saving.id if saving else None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"status": run.status, "run": run_dict(run)}
