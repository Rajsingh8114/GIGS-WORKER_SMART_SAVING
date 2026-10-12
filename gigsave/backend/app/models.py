from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    gig_platform = Column(String(80), nullable=False, default="Other")
    risk_profile = Column(String(40), nullable=False, default="Moderate")
    monthly_income_estimate = Column(Float, nullable=False, default=0)
    monthly_savings_target = Column(Float, nullable=False, default=10000)
    created_at = Column(DateTime, default=datetime.utcnow)

    incomes = relationship("Income", cascade="all, delete", back_populates="user")
    expenses = relationship("Expense", cascade="all, delete", back_populates="user")
    savings = relationship("Saving", cascade="all, delete", back_populates="user")
    goals = relationship("Goal", cascade="all, delete", back_populates="user")
    investments = relationship("Investment", cascade="all, delete", back_populates="user")
    recommendations = relationship(
        "Recommendation", cascade="all, delete", back_populates="user"
    )
    autosave_setting = relationship(
        "AutoSaveSetting", cascade="all, delete", back_populates="user", uselist=False
    )
    autosave_runs = relationship("AutoSaveRun", cascade="all, delete", back_populates="user")
    ai_credential = relationship("AICredential", cascade="all, delete", uselist=False)


class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String(80), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(80), nullable=False, default="Gig Work")
    income_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="incomes")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(80), nullable=False)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="expenses")


class Saving(Base):
    __tablename__ = "savings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    saving_date = Column(Date, nullable=False)
    source = Column(String(100), nullable=False, default="Manual")
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="savings")
    goal = relationship("Goal", back_populates="savings")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(120), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="goals")
    savings = relationship("Saving", back_populates="goal")


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(120), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    risk_level = Column(String(40), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="investments")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(80), nullable=False)
    message = Column(Text, nullable=False)
    amount = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendations")


class AutoSaveSetting(Base):
    """Per-user preferences for the daily AI auto-save."""

    __tablename__ = "autosave_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    enabled = Column(Boolean, nullable=False, default=False)
    mode = Column(String(20), nullable=False, default="smart")  # smart | fixed
    use_ai = Column(Boolean, nullable=False, default=True)
    fixed_amount = Column(Float, nullable=False, default=50)
    max_daily = Column(Float, nullable=False, default=500)
    min_buffer = Column(Float, nullable=False, default=1000)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="autosave_setting")


class AICredential(Base):
    """A user's own Anthropic API key (entered in the app). Never returned by the API."""

    __tablename__ = "ai_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    api_key = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AutoSaveRun(Base):
    """One decision per user per day (saved or skipped), so the job is idempotent."""

    __tablename__ = "autosave_runs"
    __table_args__ = (UniqueConstraint("user_id", "run_date", name="uq_autosave_user_day"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    run_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # saved | skipped
    engine = Column(String(20), nullable=False)  # ai | adaptive | fixed
    amount = Column(Float, nullable=False, default=0)
    rule_amount = Column(Float, nullable=False, default=0)
    reason = Column(Text, nullable=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    saving_id = Column(Integer, ForeignKey("savings.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="autosave_runs")
