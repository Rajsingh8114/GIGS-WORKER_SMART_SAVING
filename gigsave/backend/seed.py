from datetime import date, timedelta
import random

from app.database import Base, SessionLocal, engine, init_db
from app.models import Expense, Goal, Income, Investment, Recommendation, Saving, User
from app.security import get_password_hash


def seed():
    random.seed(42)
    init_db()
    db = SessionLocal()
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        user = User(
            name="Aarav Sharma",
            email="demo@gigsave.app",
            password_hash=get_password_hash("Demo@123"),
            gig_platform="Uber + Freelance",
            risk_profile="Moderate",
            monthly_income_estimate=52000,
            monthly_savings_target=10000,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        platforms = ["Uber", "Swiggy", "Zomato", "Rapido", "Freelance", "Other"]
        categories = ["Ride Share", "Delivery", "Freelance", "Bonus"]
        expense_categories = ["Fuel", "Food", "Rent", "Phone", "Vehicle Maintenance", "Insurance", "Equipment", "Other"]
        today = date.today()

        for offset in range(59, -1, -1):
            day = today - timedelta(days=offset)
            weekday_boost = 1.18 if day.weekday() in [4, 5, 6] else 1.0
            volatility = random.uniform(0.65, 1.45)
            income_amount = round(random.randint(650, 1900) * weekday_boost * volatility, 0)
            platform = random.choices(platforms, weights=[27, 18, 18, 10, 22, 5])[0]
            db.add(
                Income(
                    user_id=user.id,
                    platform=platform,
                    amount=income_amount,
                    category=random.choice(categories),
                    income_date=day,
                    description=f"{platform} payout",
                )
            )
            if random.random() > 0.72:
                db.add(
                    Income(
                        user_id=user.id,
                        platform="Freelance",
                        amount=round(random.randint(500, 2200), 0),
                        category="Freelance",
                        income_date=day,
                        description="Evening client task",
                    )
                )

            daily_expense = random.randint(160, 520)
            db.add(Expense(user_id=user.id, category="Fuel", amount=daily_expense, expense_date=day, description="Work travel"))
            if day.day in [1, 2]:
                db.add(Expense(user_id=user.id, category="Rent", amount=11000, expense_date=day, description="Monthly rent"))
            if day.day in [9, 23]:
                db.add(Expense(user_id=user.id, category="Phone", amount=799, expense_date=day, description="Phone and data"))
            if random.random() > 0.68:
                category = random.choice(expense_categories)
                db.add(Expense(user_id=user.id, category=category, amount=random.randint(180, 1650), expense_date=day, description=f"{category} spend"))
            if offset % 4 == 0:
                db.add(Saving(user_id=user.id, amount=random.choice([120, 150, 200, 250, 300]), saving_date=day, source="Auto micro-save"))

        goals = [
            Goal(user_id=user.id, name="Emergency Fund", target_amount=15000, current_amount=6500, deadline=today + timedelta(days=80)),
            Goal(user_id=user.id, name="New Laptop", target_amount=60000, current_amount=18000, deadline=today + timedelta(days=180)),
            Goal(user_id=user.id, name="Bike Maintenance", target_amount=10000, current_amount=3200, deadline=today + timedelta(days=45)),
            Goal(user_id=user.id, name="Vacation", target_amount=25000, current_amount=4500, deadline=today + timedelta(days=220)),
        ]
        db.add_all(goals)
        db.add_all(
            [
                Investment(user_id=user.id, category="Emergency / Cash Reserve", amount=12000, risk_level="Low"),
                Investment(user_id=user.id, category="Low Risk Instruments", amount=8500, risk_level="Low"),
                Investment(user_id=user.id, category="Moderate Growth", amount=6500, risk_level="Medium"),
            ]
        )
        db.add(
            Recommendation(
                user_id=user.id,
                type="savings",
                message="Income is above recent average. A small auto-save keeps progress moving without stressing cashflow.",
                amount=150,
                reason="Average surplus and emergency fund progress",
            )
        )
        db.commit()
        print("Seeded GigSave demo data")
        print("Email: demo@gigsave.app")
        print("Password: Demo@123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
