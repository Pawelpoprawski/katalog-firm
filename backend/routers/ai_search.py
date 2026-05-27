"""AI-powered semantic search over companies via OpenAI."""
import json
import logging
import os
import threading
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from ..storage import (
    list_companies,
    list_categories,
    track_ai_search,
    get_ai_search_global_count_today,
)
from ..security_middleware import limiter, get_client_ip
from ..settings import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory daily counter per IP (resets co dzien o polnocy serwera).
# Bezpieczne dla pojedynczego procesu (PM2 single-instance) — przy clusterze
# trzeba by przeniesc do Redis / pliku.
_DAILY_LIMIT = 100              # per IP
_GLOBAL_DAILY_LIMIT = 1000      # total across all IPs
_BURST_LIMIT = 20               # per IP, sliding window
_BURST_WINDOW_SECONDS = 300     # 5 minut

_daily_counts: dict[str, tuple[date, int]] = {}
_burst_buckets: dict[str, list[float]] = {}  # ip -> list[unix_ts] in last window
_lock = threading.Lock()


def _check_burst_limit(ip: str) -> bool:
    """True if allowed (< 20 calls w ostatnich 5 min), False if rate-limited."""
    if not ip:
        return True
    import time as _t
    now = _t.time()
    with _lock:
        bucket = [t for t in _burst_buckets.get(ip, []) if now - t < _BURST_WINDOW_SECONDS]
        if len(bucket) >= _BURST_LIMIT:
            _burst_buckets[ip] = bucket
            return False
        bucket.append(now)
        _burst_buckets[ip] = bucket
    return True


def _check_daily_limit(ip: str) -> bool:
    """True if allowed, False if daily per-IP cap exceeded."""
    if not ip:
        return True
    today = date.today()
    with _lock:
        last_day, count = _daily_counts.get(ip, (today, 0))
        if last_day != today:
            count = 0
        if count >= _DAILY_LIMIT:
            return False
        _daily_counts[ip] = (today, count + 1)
    return True


class AiSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)


class AiSearchResponse(BaseModel):
    ids: list[int]
    model: str
    query: str


def _build_company_summary() -> list[dict[str, Any]]:
    """Compact list of companies for the prompt — id, name, category_name, city, canton, short_description (truncated)."""
    companies = list_companies()
    categories = {c["id"]: c["name"] for c in list_categories()}
    summary = []
    for c in companies:
        if c.get("status") != "published" or not c.get("is_active", True):
            continue
        short = (c.get("short_description") or "") or (c.get("description") or "")
        # Strip HTML tags crudely + cap length
        import re
        short = re.sub(r"<[^>]+>", " ", short)
        short = " ".join(short.split())[:180]
        summary.append({
            "id": c["id"],
            "name": c.get("name", ""),
            "category": categories.get(c.get("category_id"), c.get("category", "")),
            "city": c.get("city", ""),
            "canton": c.get("canton", ""),
            "desc": short,
        })
    return summary


@router.post("/ai-search", response_model=AiSearchResponse)
def ai_search(request: Request, body: AiSearchRequest) -> AiSearchResponse:
    """
    AI semantic search. Zawsze zwraca 200 — nawet gdy limit AI przekroczony,
    zwracamy pusta liste ID. Frontend wtedy dorzuca substring matche, wiec user
    nie wisi na bledzie, tylko widzi 'gorsze' wyniki bez AI.
    """
    ip = get_client_ip(request)
    query = body.query.strip()
    settings = get_settings()
    model = settings.openai_model or os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

    # Sprawdz wszystkie limity. Gdy przekroczony — pomin call AI i zwroc puste.
    def _skip(reason: str) -> AiSearchResponse:
        logger.info("AI-search skipped (%s) ip=%s query=%r", reason, ip, query[:50])
        try:
            track_ai_search(query, ip, 0, blocked=True)
        except Exception:
            pass
        return AiSearchResponse(ids=[], model=model, query=query)

    if not _check_burst_limit(ip):
        return _skip(f"burst limit {_BURST_LIMIT}/{_BURST_WINDOW_SECONDS}s")
    if not _check_daily_limit(ip):
        return _skip(f"per-IP daily cap {_DAILY_LIMIT}")
    global_count = get_ai_search_global_count_today()
    if global_count >= _GLOBAL_DAILY_LIMIT:
        return _skip(f"global daily cap {_GLOBAL_DAILY_LIMIT}")

    api_key = settings.open_ai_katalog_firm or os.getenv("OPEN_AI_KATALOG_FIRM") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Brak klucza — graceful: log + pusty wynik (frontend zrobi substring)
        return _skip("missing api key")

    companies_summary = _build_company_summary()

    if not companies_summary:
        return AiSearchResponse(ids=[], model=model, query=query)

    system_prompt = (
        "Jestes asystentem wyszukiwania w katalogu polskich firm w Szwajcarii. "
        "Uzytkownik wpisuje czego szuka po polsku (np. 'szukam pierogow', 'fryzjer w Zurichu', 'pomoc prawna'). "
        "Na podstawie listy firm (id, name, category, city, canton, desc) zwroc TYLKO JSON z kluczem 'ids' "
        "zawierajacym tablice ID firm pasujacych do zapytania, posortowanych od najbardziej do najmniej trafnych. "
        "Maksymalnie 12 ID. Jesli nic nie pasuje — pusta tablica. "
        "Format odpowiedzi: {\"ids\": [3, 17, 42]} — nic wiecej, czysty JSON."
    )
    user_prompt = (
        f"Zapytanie uzytkownika: \"{query}\"\n\n"
        f"Lista firm (JSON):\n{json.dumps(companies_summary, ensure_ascii=False)}"
    )

    try:
        from openai import OpenAI
    except ImportError as e:
        logger.error("OpenAI SDK not installed: %s", e)
        return _skip("openai sdk missing")

    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
    except Exception as e:
        logger.error("OpenAI call failed: %s", e)
        # Graceful — frontend dostaje pusta liste, robi tylko substring
        return AiSearchResponse(ids=[], model=model, query=query)

    try:
        data = json.loads(raw)
        ids = data.get("ids", []) if isinstance(data, dict) else []
        if not isinstance(ids, list):
            ids = []
        # Keep only ints and known company ids
        known_ids = {c["id"] for c in companies_summary}
        ids = [int(x) for x in ids if isinstance(x, (int, float)) and int(x) in known_ids][:12]
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning("Failed to parse AI response %r: %s", raw, e)
        ids = []

    # Log query to analytics (best-effort, nie blokuj response gdy zapis padnie)
    try:
        track_ai_search(query, ip, len(ids), blocked=False)
    except Exception as e:
        logger.warning("Failed to log AI search: %s", e)

    return AiSearchResponse(ids=ids, model=model, query=query)
