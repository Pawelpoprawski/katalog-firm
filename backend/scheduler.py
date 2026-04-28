"""Background scheduler — automatyczna publikacja draftów po zadanym czasie.

Uruchamiany w on_startup z main.py jako asyncio task.
Co AUTO_PUBLISH_CHECK_INTERVAL_MINUTES sprawdza wszystkie firmy ze statusem 'draft'
i jeśli created_at jest starsze niż AUTO_PUBLISH_DELAY_HOURS — zmienia status na 'published'.
"""

import asyncio
import logging
import os
import time
from typing import Optional

logger = logging.getLogger(__name__)

_task: Optional[asyncio.Task] = None


def _get_delay_hours() -> float:
    return float(os.getenv("AUTO_PUBLISH_DELAY_HOURS", "3"))


def _get_check_interval_minutes() -> float:
    return float(os.getenv("AUTO_PUBLISH_CHECK_INTERVAL_MINUTES", "30"))


def _is_enabled() -> bool:
    return os.getenv("AUTO_PUBLISH_ENABLED", "true").lower() in ("1", "true", "yes")


def auto_publish_drafts() -> dict:
    """Przegląda firmy, publikuje drafty starsze niż AUTO_PUBLISH_DELAY_HOURS.

    Returns dict z liczbą opublikowanych firm i ich ID.
    """
    from .storage import list_companies, update_company

    delay_seconds = _get_delay_hours() * 3600
    cutoff = time.time() - delay_seconds

    companies = list_companies()
    published_ids = []

    for c in companies:
        if c.get("status") != "draft":
            continue
        created_at = c.get("created_at")
        if not isinstance(created_at, (int, float)):
            continue
        if created_at <= cutoff:
            try:
                update_company(int(c["id"]), {"status": "published"})
                published_ids.append(int(c["id"]))
                logger.info(f"[auto_publish] Opublikowano draft id={c['id']} name={c.get('name')!r}")
            except Exception as e:
                logger.error(f"[auto_publish] Błąd publikacji id={c.get('id')}: {e}")

    if published_ids:
        try:
            from .clear_cache import clear_nginx_cache
            clear_nginx_cache()
        except Exception as e:
            logger.warning(f"[auto_publish] clear_nginx_cache failed: {e}")

    return {
        "published_count": len(published_ids),
        "published_ids": published_ids,
        "delay_hours": _get_delay_hours(),
    }


async def _scheduler_loop() -> None:
    interval_seconds = _get_check_interval_minutes() * 60
    logger.info(
        f"[scheduler] auto_publish_drafts uruchomiony "
        f"(delay={_get_delay_hours()}h, interval={_get_check_interval_minutes()}min)"
    )
    while True:
        try:
            result = auto_publish_drafts()
            if result["published_count"] > 0:
                logger.info(f"[scheduler] tick: {result}")
        except Exception as e:
            logger.error(f"[scheduler] tick error: {e}", exc_info=True)
        await asyncio.sleep(interval_seconds)


def start_scheduler() -> None:
    """Uruchamia background loop. Wywoływane z FastAPI on_startup."""
    global _task
    if not _is_enabled():
        logger.info("[scheduler] AUTO_PUBLISH_ENABLED=false — scheduler NIE uruchomiony")
        return
    if _task is not None and not _task.done():
        logger.warning("[scheduler] Task już działa — pomijam")
        return
    _task = asyncio.create_task(_scheduler_loop())
    logger.info("[scheduler] Background task wystartowany")
