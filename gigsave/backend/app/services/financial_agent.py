from sqlalchemy.orm import Session

from .. import models
from .ai_client import ask_text
from .autosave_engine import get_user_key
from .income_analyzer import income_analytics
from .savings_engine import calculate_emergency_fund_progress, calculate_monthly_cashflow, generate_savings_recommendation
from .tax_engine import tax_summary


def generate_financial_insights(db: Session, user: models.User):
    cashflow = calculate_monthly_cashflow(db, user.id)
    analytics = income_analytics(db, user.id)
    recommendation = generate_savings_recommendation(db, user)
    insights = []
    if cashflow["balance"] > 0:
        insights.append("Your monthly cashflow is positive after recorded expenses and savings.")
    else:
        insights.append("Your recorded monthly outflow is higher than income, so cash flexibility matters this week.")
    insights.append(f"Income stability is {analytics['income_stability'].lower()} with {analytics['income_volatility']}% volatility.")
    insights.append(f"Today's safe micro-saving estimate is Rs {recommendation['recommended_amount']:,.0f}.")
    return insights


def chat_response(db: Session, user: models.User, message: str):
    text = message.lower()
    savings = generate_savings_recommendation(db, user)
    analytics = income_analytics(db, user.id)
    emergency = calculate_emergency_fund_progress(db, user.id)
    cashflow = calculate_monthly_cashflow(db, user.id)

    if "save" in text or "week" in text:
        weekly = savings["recommended_amount"] * 7
        response = f"Based on your recent income and expense pattern, a careful weekly savings target is about Rs {weekly:,.0f}. That comes from today's safe amount of Rs {savings['recommended_amount']:,.0f}, adjusted for volatility and emergency-fund progress."
        data = savings
    elif "volatile" in text or "stability" in text:
        response = f"Your income is classified as {analytics['income_stability'].lower()} because the standard deviation of your daily income is {analytics['income_volatility']}% of the average. GigSave uses this to avoid recommending savings that would strain low-income days."
        data = analytics
    elif "emergency" in text:
        response = f"Your emergency fund is Rs {emergency['current']:,.0f} of Rs {emergency['target']:,.0f}, or {emergency['percent']}% funded. The next milestone is reaching 50%, then one month of average expenses."
        data = emergency
    elif "spending" in text or "expense" in text:
        response = f"This month you recorded Rs {cashflow['expenses']:,.0f} in expenses against Rs {cashflow['income']:,.0f} income. Focus first on repeat categories that affect work cashflow, like fuel, phone, and maintenance."
        data = cashflow
    elif "tax" in text:
        data = tax_summary(db, user.id)
        response = f"Your estimated net gig income is Rs {data['estimated_net_income']:,.0f} after Rs {data['estimated_business_expenses']:,.0f} of categorized business expenses. This is educational, not professional tax advice."
    else:
        insights = generate_financial_insights(db, user)
        response = " ".join(insights)
        data = {"insights": insights, "cashflow": cashflow}

    ai_used = False
    polished = ask_text(
        system=(
            "You are GigSave's friendly financial assistant for gig workers in India. Answer the user's question in 2-4 short sentences "
            "using ONLY the figures in the provided facts. Use 'Rs' for amounts. Do not give regulated investment or tax advice; "
            "keep it educational. Do not invent numbers."
        ),
        prompt=f"Question: {message}\n\nFacts: {data}\n\nDraft answer: {response}",
        max_tokens=350,
        api_key=get_user_key(db, user),
    )
    if polished:
        response, ai_used = polished, True

    return {"response": response, "data": data, "ai": ai_used}
