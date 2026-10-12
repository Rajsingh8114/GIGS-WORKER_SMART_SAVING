from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import agent, auth, autosave, dashboard, expenses, goals, income, investments, savings, tax
from .database import init_db


app = FastAPI(title="GigSave API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(income.router)
app.include_router(expenses.router)
app.include_router(savings.router)
app.include_router(goals.router)
app.include_router(investments.router)
app.include_router(tax.router)
app.include_router(agent.router)
app.include_router(autosave.router)


@app.on_event("startup")
def on_startup():
    init_db()


frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
