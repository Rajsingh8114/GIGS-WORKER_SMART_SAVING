# GigSave Backend

FastAPI backend for the GigSave hackathon MVP.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py
cd ..
./run.sh
```

Demo user:

- Email: `demo@gigsave.app`
- Password: `Demo@123`

## AI (optional)

Easiest: paste your key on the Auto-Save page in the app. Or copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` for the whole server. Either enables AI-reviewed Auto-Save and AI-phrased agent answers.
No extra Python packages are needed.

## Tip

The bundled demo database has data up to when it was created. Run `python seed.py` (from `backend/`) to regenerate 60 fresh days of demo data ending today. This resets the database.
