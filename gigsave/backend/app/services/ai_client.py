"""Tiny, dependency-free client for the Anthropic Messages API.

AI is optional. If ANTHROPIC_API_KEY is not set (or the call fails for any reason)
every function returns None and callers fall back to deterministic logic, so the
app keeps working offline.

Configuration (environment variables, or a `.env` file in the backend folder):
    ANTHROPIC_API_KEY   your key from console.anthropic.com (or paste it on the Auto-Save page in the app)
    GIGSAVE_AI_MODEL    model id (default: claude-haiku-5-5)
"""
import json
import os
import re
import urllib.request
from pathlib import Path

API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-5-5"
TIMEOUT_SECONDS = 15


def _load_dotenv() -> None:
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def ai_status(user_key=None) -> dict:
    """`user_key` is the key the user pasted into the app; the server's env key is the fallback."""
    env_key = os.getenv("ANTHROPIC_API_KEY")
    key = user_key or env_key
    return {
        "configured": bool(key),
        "model": os.getenv("GIGSAVE_AI_MODEL", DEFAULT_MODEL),
        "source": "user" if user_key else "server" if env_key else None,
        "key_hint": key[-4:] if key else None,
    }


def ask_text(system: str, prompt: str, max_tokens: int = 400, api_key=None):
    """Return the model's text reply, or None when AI is unavailable/failed."""
    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return None
    body = json.dumps(
        {
            "model": os.getenv("GIGSAVE_AI_MODEL", DEFAULT_MODEL),
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
        return "".join(block.get("text", "") for block in payload.get("content", []) if block.get("type") == "text").strip() or None
    except Exception:
        return None


def ask_json(system: str, prompt: str, max_tokens: int = 300, api_key=None):
    """Return a parsed JSON object from the model, or None."""
    text = ask_text(system, prompt, max_tokens, api_key)
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None
