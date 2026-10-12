from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    gig_platform: str
    monthly_income_estimate: float = Field(..., ge=0)
    risk_profile: str = "Moderate"


class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    gig_platform: str
    risk_profile: str
    monthly_income_estimate: float
    monthly_savings_target: float
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class IncomeCreate(BaseModel):
    platform: str
    amount: float = Field(..., gt=0)
    income_date: date
    category: str = "Gig Work"
    description: Optional[str] = None


class IncomeOut(IncomeCreate, ORMModel):
    id: int
    created_at: datetime


class ExpenseCreate(BaseModel):
    category: str
    amount: float = Field(..., gt=0)
    expense_date: date
    description: Optional[str] = None


class ExpenseOut(ExpenseCreate, ORMModel):
    id: int
    created_at: datetime


class SavingCreate(BaseModel):
    amount: float = Field(..., gt=0)
    saving_date: date
    source: str = "Manual"
    goal_id: Optional[int] = None


class SavingOut(SavingCreate, ORMModel):
    id: int
    created_at: datetime


class GoalCreate(BaseModel):
    name: str
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(0, ge=0)
    deadline: Optional[date] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[date] = None


class GoalOut(GoalCreate, ORMModel):
    id: int
    created_at: datetime


class InvestmentProfileIn(BaseModel):
    horizon: str
    income_stability: str
    emergency_fund: str
    risk_tolerance: str
    experience: str
    financial_goal: str


class AgentMessage(BaseModel):
    message: str = Field(..., min_length=2, max_length=500)


class AIKeyIn(BaseModel):
    api_key: str = Field(..., min_length=20, max_length=300)


class AutoSaveSettingsIn(BaseModel):
    enabled: bool = False
    mode: Literal["smart", "fixed"] = "smart"
    use_ai: bool = True
    fixed_amount: float = Field(50, ge=0, le=100000)
    max_daily: float = Field(500, ge=0, le=100000)
    min_buffer: float = Field(1000, ge=0, le=10000000)
    goal_id: Optional[int] = None
