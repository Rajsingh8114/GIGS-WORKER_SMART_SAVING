RISK_ALLOCATIONS = {
    "Conservative": {
        "Emergency / Cash Reserve": 45,
        "Low Risk Instruments": 35,
        "Moderate Growth": 15,
        "Higher Growth": 5,
    },
    "Moderate": {
        "Emergency / Cash Reserve": 30,
        "Low Risk Instruments": 30,
        "Moderate Growth": 25,
        "Higher Growth": 15,
    },
    "Growth": {
        "Emergency / Cash Reserve": 20,
        "Low Risk Instruments": 20,
        "Moderate Growth": 35,
        "Higher Growth": 25,
    },
}


def calculate_risk_profile(answers: dict) -> str:
    score = 0
    joined = " ".join(str(value).lower() for value in answers.values())
    if "long" in joined or "5" in joined:
        score += 2
    if "stable" in joined:
        score += 1
    if "complete" in joined or "6 months" in joined:
        score += 1
    if "high" in joined or "aggressive" in joined:
        score += 2
    if "experienced" in joined:
        score += 1
    if "protect" in joined or "short" in joined or "low" in joined:
        score -= 2
    if score <= 1:
        return "Conservative"
    if score <= 4:
        return "Moderate"
    return "Growth"


def educational_allocation(profile: str):
    allocation = RISK_ALLOCATIONS.get(profile, RISK_ALLOCATIONS["Moderate"])
    return [{"category": label, "percent": value} for label, value in allocation.items()]


def recommendations(profile: str):
    return {
        "risk_profile": profile,
        "allocation": educational_allocation(profile),
        "disclaimer": "These are educational allocation categories based on the information provided. Actual investment decisions should consider applicable regulations and professional advice.",
        "next_steps": [
            "Keep emergency money accessible before taking meaningful market risk.",
            "Prefer diversified categories over any single security.",
            "Review allocation after major income or family changes.",
        ],
    }
