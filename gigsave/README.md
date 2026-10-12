# GigSave

Smart money management for the gig economy.

GigSave is a polished hackathon MVP for gig workers with irregular income. It includes JWT authentication, income and expense tracking, micro-savings recommendations, educational investment allocation categories, tax summaries, and a deterministic financial agent powered by backend calculations.

## Run

```bash
cd gigsave/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py
cd ..
chmod +x run.sh
./run.sh
```

Open `http://127.0.0.1:8000`.

Demo login:

- Email: `demo@gigsave.app`
- Password: `Demo@123`

## What's new

- **New look**: emerald/gold "Vault Green" theme, dark sidebar with icons, light/dark mode toggle (remembers your choice), refreshed landing and login pages.
- **Auto-Save (AI-assisted)**: turn it on at `Auto-Save` in the sidebar. Once a day (the first time you open the app) GigSave moves a safe amount into savings or a goal you choose.
  - *Smart* mode starts from GigSave's own calculation, then an adaptive/AI layer adjusts it using today's income vs. your 30-day average.
  - *Fixed* mode saves the same amount each day.
  - Guardrails always apply: the AI can't exceed 125% of the calculated amount, your daily limit, or your "keep available" cash. One decision per day, with a plain-language reason.
  - Settings save themselves as you change them (no Save button). Income/expense forms also keep an auto-saved draft in your browser.
- **Optional AI**: on the Auto-Save page, paste your Anthropic API key under "Connect Claude" (it is checked, then stored for your account and never shown again). Claude then reviews each Auto-Save decision and phrases Financial Agent answers. Alternatively set `ANTHROPIC_API_KEY` in `backend/.env` for the whole server. Without a key everything still works using the built-in logic.

New API endpoints: `GET/PUT /api/autosave/settings`, `GET /api/autosave/preview`, `POST /api/autosave/run`, `GET /api/autosave/history`, `PUT/DELETE /api/autosave/ai-key`.
New tables (`autosave_settings`, `autosave_runs`, `ai_credentials`) are created automatically on startup; your existing database is kept.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript, Chart.js CDN
- Backend: FastAPI, SQLAlchemy, Pydantic, JWT, Passlib bcrypt
- Database: SQLite
