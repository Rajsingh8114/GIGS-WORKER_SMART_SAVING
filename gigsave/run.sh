#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

PYTHON_BIN="${PYTHON:-python}"
if [ -x "backend/.venv/bin/python" ]; then
  PYTHON_BIN="backend/.venv/bin/python"
fi

if [ -z "${PORT+x}" ]; then
  PORT=8000
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
    PORT=8001
  fi
fi

"$PYTHON_BIN" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port "$PORT"
