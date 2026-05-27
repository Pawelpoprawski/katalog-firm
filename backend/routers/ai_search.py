"""AI-powered semantic search over companies via OpenAI."""
import json
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..storage import list_companies, list_categories
from ..security_middleware import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


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
@limiter.limit("20/minute")
def ai_search(request: Request, body: AiSearchRequest) -> AiSearchResponse:
    api_key = os.getenv("OPEN_AI_KATALOG_FIRM") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI search nieskonfigurowany na serwerze.")

    model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
    query = body.query.strip()
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
        raise HTTPException(status_code=500, detail="OpenAI SDK not installed on server.")

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
        raise HTTPException(status_code=502, detail=f"AI niedostepne: {e}")

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

    return AiSearchResponse(ids=ids, model=model, query=query)
