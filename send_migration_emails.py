"""
Skrypt wysyłki maili:
  - tryb --test          : wysyła 1 maila do firmy testowej (dummy)
  - tryb --bulk          : LEGACY — jednorazowa migracja ze snapshotu _all_companies.json
  - tryb --confirmation  : cykliczna prośba o potwierdzenie aktywności (co 5 dni z deduplikacją 30-dniową)

Tryb --confirmation:
    python send_migration_emails.py --confirmation --dry-run
    python send_migration_emails.py --confirmation                 # pyta y/N
    python send_migration_emails.py --confirmation --auto-confirm  # bez pytania (dla crona)
    python send_migration_emails.py --confirmation --limit 5
    python send_migration_emails.py --confirmation --api-url http://127.0.0.1:8000  # cron na serwerze

Wymagane env:
    RESEND_API_KEY    — klucz do Resend
    ADMIN_PASSWORD    — hasło admina (żeby fetchować firmy + markować wysyłki)
    API_BASE_URL      — opcjonalnie, domyślnie https://katalog-firm.ch/api

Filtr confirmation:
    status == "published"
    ma email + edit_token
    (last_confirmed_at NULL LUB starsze niż 6 miesięcy)
    ORAZ
    (last_confirmation_request_at NULL LUB starsze niż 30 dni)

Log:
    migration_send_log.jsonl — append-only audit (tryb + status + resend_id + ts)
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent
COMPANIES_FILE = ROOT / "_all_companies.json"  # legacy snapshot (--bulk)
TEMPLATE_FILE = ROOT / "email_migration_template.html"
LOG_FILE = ROOT / "migration_send_log.jsonl"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
API_BASE_URL_DEFAULT = os.environ.get("API_BASE_URL", "https://katalog-firm.ch/api")

if not RESEND_API_KEY:
    print("BŁĄD: RESEND_API_KEY nie ustawione. Export RESEND_API_KEY=... przed uruchomieniem.", file=sys.stderr)
    sys.exit(1)

FROM_EMAIL = "PolacySzwajcaria <kontakt@katalog-firm.ch>"
REPLY_TO = "kontakt@polacyszwajcaria.com"
SUBJECT = "katalog-firm.ch — prosimy o potwierdzenie aktywności Waszej usługi"

TEST_EMAIL = "poprawskipawel@gmail.com"
TEST_COMPANY_ID = 102

RATE_LIMIT_SLEEP = 0.6  # ~1.6 req/s (Resend free tier = 2/s)

CONFIRMATION_STALE_DAYS = 180   # last_confirmed_at > 6 miesięcy = trzeba odświeżyć
REQUEST_COOLDOWN_DAYS = 30      # nie wysyłaj jeśli last_confirmation_request_at < 30 dni temu


# ---------------------------- I/O ----------------------------

def load_template() -> str:
    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        return f.read()


def append_log(entry: dict) -> None:
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def render_email(template: str, company_name: str, edit_token: str, company_email: str) -> str:
    html = template.replace("{{COMPANY_NAME}}", company_name)
    html = html.replace("{{COMPANY_EMAIL}}", company_email)
    html = html.replace("{{EDIT_TOKEN}}", edit_token)
    return html


# ---------------------------- HTTP ----------------------------

def send_via_resend(to: str, subject: str, html: str) -> tuple[bool, str]:
    payload = json.dumps({
        "from": FROM_EMAIL,
        "to": [to],
        "reply_to": REPLY_TO,
        "subject": subject,
        "html": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "katalog-firm-confirmation/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            if body.get("id"):
                return True, body["id"]
            return False, f"no_id:{body}"
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = str(e)
        return False, f"http_{e.code}:{body}"
    except Exception as e:
        return False, f"error:{e}"


def fetch_admin_companies(api_base: str) -> list[dict]:
    if not ADMIN_PASSWORD:
        raise RuntimeError("ADMIN_PASSWORD nie ustawione. Export ADMIN_PASSWORD=... przed uruchomieniem.")

    req = urllib.request.Request(
        f"{api_base}/admin/companies",
        headers={
            "Authorization": f"Bearer {ADMIN_PASSWORD}",
            "Accept": "application/json",
            "User-Agent": "katalog-firm-confirmation/1.0",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def mark_confirmation_sent(api_base: str, company_ids: list[int]) -> dict:
    if not company_ids:
        return {"updated": 0}
    payload = json.dumps({"company_ids": company_ids}).encode("utf-8")
    req = urllib.request.Request(
        f"{api_base}/admin/track-confirmation-sent",
        data=payload,
        headers={
            "Authorization": f"Bearer {ADMIN_PASSWORD}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "katalog-firm-confirmation/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------- FILTRY ----------------------------

def _parse_iso(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        # Obsługa ISO z "Z" na końcu
        s = val.replace("Z", "+00:00") if val.endswith("Z") else val
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def needs_confirmation(c: dict, now: datetime) -> bool:
    """True jeśli firma kwalifikuje się do wysyłki prośby o potwierdzenie."""
    if c.get("status") != "published":
        return False
    if not c.get("email") or "@" not in (c.get("email") or ""):
        return False
    if not c.get("edit_token"):
        return False

    last_confirmed = _parse_iso(c.get("last_confirmed_at"))
    if last_confirmed and (now - last_confirmed) < timedelta(days=CONFIRMATION_STALE_DAYS):
        return False  # niedawno potwierdzone → pomijamy

    last_request = _parse_iso(c.get("last_confirmation_request_at"))
    if last_request and (now - last_request) < timedelta(days=REQUEST_COOLDOWN_DAYS):
        return False  # prośba wyszła niedawno → pomijamy (dedupe 30d)

    return True


def pick_confirmation_targets(companies: list[dict], limit: int | None = None) -> list[dict]:
    now = datetime.now(timezone.utc)
    targets = [c for c in companies if needs_confirmation(c, now)]
    if limit:
        targets = targets[:limit]
    return targets


# ---------------------------- LEGACY --bulk / --test ----------------------------

def load_companies_legacy() -> list[dict]:
    with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_sent_company_ids_legacy() -> set[int]:
    if not LOG_FILE.exists():
        return set()
    sent = set()
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                if entry.get("status") == "sent":
                    sent.add(entry["company_id"])
            except json.JSONDecodeError:
                continue
    return sent


def pick_targets_legacy(companies: list[dict], mode: str, limit: int | None) -> list[dict]:
    with_email = [
        c for c in companies
        if c.get("email") and "@" in (c.get("email") or "") and c.get("edit_token")
    ]

    if mode == "test":
        targets = [c for c in with_email if c.get("id") == TEST_COMPANY_ID]
        if not targets:
            targets = [c for c in with_email if (c.get("email") or "").lower() == TEST_EMAIL.lower()][:1]
        return targets

    if mode == "bulk":
        targets = [
            c for c in with_email
            if c.get("status") == "published" and c.get("id") != TEST_COMPANY_ID
        ]
        if limit:
            targets = targets[:limit]
        return targets

    return []


# ---------------------------- GŁÓWNE FLOW ----------------------------

def run_confirmation(args) -> int:
    api_base = args.api_url.rstrip("/")
    template = load_template()

    print(f"API:          {api_base}")
    print(f"Fetching companies from /admin/companies...")
    companies = fetch_admin_companies(api_base)
    print(f"Łącznie w bazie: {len(companies)}")

    targets = pick_confirmation_targets(companies, limit=args.limit)
    print(f"Tryb:              confirmation")
    print(f"Filtr: last_confirmed_at > {CONFIRMATION_STALE_DAYS}d, last_request > {REQUEST_COOLDOWN_DAYS}d")
    print(f"Do wysyłki teraz:  {len(targets)}")

    if args.dry_run:
        print("\n--- DRY-RUN — nic nie wysyłam ---")
        for c in targets[:20]:
            last_c = c.get("last_confirmed_at") or "NULL"
            last_r = c.get("last_confirmation_request_at") or "NULL"
            print(f"  [id={c['id']:<4}] {c['name'][:40]:<42} -> {c['email']:<35}  confirmed={last_c[:10]:<10}  req={last_r[:10]}")
        if len(targets) > 20:
            print(f"  ... i {len(targets)-20} więcej")
        return 0

    if not targets:
        print("Brak firm do wysłania. Wszystkie potwierdzone lub w cooldown.")
        return 0

    if not args.auto_confirm:
        print()
        ans = input(f"Potwierdź wysyłkę do {len(targets)} firm [y/N]: ").strip().lower()
        if ans != "y":
            print("Anulowano.")
            return 1

    print()
    ok_ids: list[int] = []
    fail_count = 0
    for i, c in enumerate(targets, 1):
        html = render_email(template, c["name"], c["edit_token"], c["email"])
        ok, info = send_via_resend(c["email"], SUBJECT, html)
        if ok:
            ok_ids.append(c["id"])
            append_log({"mode": "confirmation", "status": "sent", "company_id": c["id"], "name": c["name"], "email": c["email"], "resend_id": info})
            print(f"  [{i:3}/{len(targets)}] OK  id={c['id']:<4} {c['email']:<40} -> {info}")
        else:
            fail_count += 1
            append_log({"mode": "confirmation", "status": "failed", "company_id": c["id"], "name": c["name"], "email": c["email"], "error": info})
            print(f"  [{i:3}/{len(targets)}] ERR id={c['id']:<4} {c['email']:<40} -> {info}")
        time.sleep(RATE_LIMIT_SLEEP)

    print()
    print(f"Wysłane OK:  {len(ok_ids)}")
    print(f"Błędy:       {fail_count}")

    # Zaktualizuj last_confirmation_request_at + wykres analytics po udanych wysyłkach
    if ok_ids:
        try:
            result = mark_confirmation_sent(api_base, ok_ids)
            print(f"Serwer zamarkował: {result.get('updated', 0)}/{len(ok_ids)} firm (last_confirmation_request_at + analytics)")
        except Exception as e:
            print(f"OSTRZEŻENIE: nie udało się zamarkować wysyłek na serwerze: {e}")
            print(f"           Firmy dostały maile ale brak aktualizacji last_confirmation_request_at — przy następnym cyklu ryzyko duplikatu.")
            append_log({"mode": "confirmation", "status": "mark_failed", "company_ids": ok_ids, "error": str(e)})

    return 0 if fail_count == 0 else 2


def run_legacy(args) -> int:
    """Stary tryb migracyjny (--test / --bulk) — używa _all_companies.json."""
    mode = "test" if args.test else "bulk"

    companies = load_companies_legacy()
    template = load_template()
    sent_ids = load_sent_company_ids_legacy()

    targets = pick_targets_legacy(companies, mode=mode, limit=args.limit)
    to_send = [c for c in targets if c["id"] not in sent_ids]
    already = len(targets) - len(to_send)

    print(f"Tryb:             {mode} (legacy snapshot)")
    print(f"Kandydaci:        {len(targets)}")
    print(f"Już wysłane:      {already}")
    print(f"Do wysyłki teraz: {len(to_send)}")

    if args.dry_run:
        print("--- DRY-RUN — nic nie wysyłam ---")
        for c in to_send[:10]:
            print(f"  [id={c['id']}] {c['name']!r:<45} -> {c['email']}")
        if len(to_send) > 10:
            print(f"  ... i {len(to_send)-10} więcej")
        return 0

    if not to_send:
        print("Brak nowych wpisów do wysłania.")
        return 0

    if mode == "bulk" and not args.auto_confirm:
        print()
        ans = input(f"Potwierdź wysyłkę do {len(to_send)} firm [y/N]: ").strip().lower()
        if ans != "y":
            print("Anulowano.")
            return 1

    print()
    ok_count = 0
    fail_count = 0
    for i, c in enumerate(to_send, 1):
        html = render_email(template, c["name"], c["edit_token"], c["email"])
        ok, info = send_via_resend(c["email"], SUBJECT, html)
        if ok:
            ok_count += 1
            append_log({"mode": mode, "status": "sent", "company_id": c["id"], "name": c["name"], "email": c["email"], "resend_id": info})
            print(f"  [{i:3}/{len(to_send)}] OK  id={c['id']:<4} {c['email']:<40} -> {info}")
        else:
            fail_count += 1
            append_log({"mode": mode, "status": "failed", "company_id": c["id"], "name": c["name"], "email": c["email"], "error": info})
            print(f"  [{i:3}/{len(to_send)}] ERR id={c['id']:<4} {c['email']:<40} -> {info}")
        time.sleep(RATE_LIMIT_SLEEP)

    print()
    print(f"Wysłane OK:  {ok_count}")
    print(f"Błędy:       {fail_count}")
    print(f"Log:         {LOG_FILE.name}")
    return 0 if fail_count == 0 else 2


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true", help="[legacy] test do 1 firmy")
    group.add_argument("--bulk", action="store_true", help="[legacy] migracyjna masówka z _all_companies.json")
    group.add_argument("--confirmation", action="store_true", help="Cykliczna wysyłka próśb o potwierdzenie (używa /admin/companies)")
    parser.add_argument("--dry-run", action="store_true", help="Nie wysyłaj, tylko pokaż listę")
    parser.add_argument("--limit", type=int, default=None, help="Ogranicz liczbę wysyłek")
    parser.add_argument("--auto-confirm", action="store_true", help="Pomiń pytanie y/N (dla crona)")
    parser.add_argument("--api-url", default=API_BASE_URL_DEFAULT, help=f"Bazowy URL API (default: {API_BASE_URL_DEFAULT})")
    args = parser.parse_args()

    if args.confirmation:
        return run_confirmation(args)
    return run_legacy(args)


if __name__ == "__main__":
    sys.exit(main())
