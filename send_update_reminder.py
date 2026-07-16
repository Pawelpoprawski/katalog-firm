# -*- coding: utf-8 -*-
"""
Cykliczny mail "czas odswiezyc ogloszenie" — laczy przypomnienie o aktualizacji
z potwierdzeniem aktywnosci (zastepuje stary mail confirmation z send_migration_emails.py).

Kazda firma dostaje maila maksymalnie co 3 miesiace, liczac od NAJPOZNIEJSZEGO z:
  - utworzenia firmy (created_at)
  - ostatniej edycji (updated_at)
  - ostatniego potwierdzenia / kliku "Nie potrzebuje zmian" (last_confirmed_at)
  - ostatniej wysylki tego maila (log — dedupe, gdy firma nie zareagowala)

Tryby:
  python send_update_reminder.py test   -> 1 mail do adresu testowego
  python send_update_reminder.py real   -> maile do wszystkich kandydatow (pyta y/N)
  python send_update_reminder.py cron   -> jak real, bez pytania (dla crona)

Filtr kandydatow:
  status == "published"
  ma email + edit_token
  max(created_at, updated_at, last_confirmed_at) starsze niz STALE_DAYS (90)
  ostatnia wysylka z logu starsza niz COOLDOWN_DAYS (90)

Mail zawiera:
  - przycisk "Edytuj swoje ogloszenie"   -> /edycja/{token}
  - przycisk "Nie potrzebuje zmian"      -> /potwierdz/{token} (ustawia last_confirmed_at)
  - przycisk "Zawies / usun moja usluge" -> /archiwizuj/{token} (status -> archived,
    znika ze strony i z wysylek, widoczny w adminie)

Wymagane env:
  RESEND_API_KEY

Log: logs/update_reminder_log.jsonl (append-only audit)
"""
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
COMPANIES_FILE = ROOT / "backend" / "data" / "companies.json"
LOG_FILE = ROOT / "logs" / "update_reminder_log.jsonl"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
if not RESEND_API_KEY:
    print("BLAD: RESEND_API_KEY nie ustawione.", file=sys.stderr)
    sys.exit(1)

FROM_EMAIL = "PolacySzwajcaria <katalog.firm@polacyszwajcaria.com>"
REPLY_TO = "kontakt@polacyszwajcaria.com"
SUBJECT = "Katalog Firm Polonijnych — może czas odświeżyć Twoje ogłoszenie?"
BASE = "https://polacyszwajcaria.com/katalog-firm"

TEST_EMAIL = "poprawskipawel@gmail.com"
# Tryb testowy renderuje FIKCYJNA firme z martwym tokenem —
# nigdy nie uzywamy danych/tokenow prawdziwych firm w mailach testowych.
TEST_COMPANY_NAME = "Przykladowa Firma (TEST)"
TEST_TOKEN = "TEST-TOKEN-NIEAKTYWNY"

RATE_SLEEP = 0.6      # ~1.6 req/s (Resend free tier = 2/s)
STALE_DAYS = 90       # ostatnia aktywnosc (utworzenie/edycja/potwierdzenie) starsza niz 3 mc
COOLDOWN_DAYS = 90    # nie wysylaj ponownie czesciej niz co 3 mc (dedupe z logu)


def load_companies():
    d = json.load(open(COMPANIES_FILE, encoding="utf-8"))
    return d if isinstance(d, list) else d.get("companies", [])


def _parse_iso(v):
    """Data z ISO-stringa lub liczbowego timestampa (created_at/updated_at sa floatami)."""
    if isinstance(v, (int, float)) and v > 0:
        try:
            return datetime.fromtimestamp(v, tz=timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None
    if not v or not isinstance(v, str):
        return None
    try:
        dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def last_change(c):
    """Najswiezsza aktywnosc: utworzenie, edycja lub potwierdzenie ("Nie potrzebuje zmian")."""
    dates = [d for d in (
        _parse_iso(c.get("created_at")),
        _parse_iso(c.get("updated_at")),
        _parse_iso(c.get("last_confirmed_at")),
    ) if d]
    return max(dates) if dates else None


def append_log(entry):
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def last_sent_map():
    """id -> datetime ostatniej udanej wysylki (z logu)."""
    out = {}
    if not LOG_FILE.exists():
        return out
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if e.get("status") != "sent":
                continue
            dt = _parse_iso(e.get("ts"))
            cid = e.get("company_id")
            if dt and cid is not None and (cid not in out or dt > out[cid]):
                out[cid] = dt
    return out


def pick_targets():
    now = datetime.now(timezone.utc)
    sent = last_sent_map()
    targets = []
    for c in load_companies():
        if c.get("status") != "published":
            continue
        if not c.get("email") or "@" not in (c.get("email") or ""):
            continue
        if not c.get("edit_token"):
            continue
        change = last_change(c)
        if change is None or (now - change) < timedelta(days=STALE_DAYS):
            continue
        last = sent.get(c.get("id"))
        if last and (now - last) < timedelta(days=COOLDOWN_DAYS):
            continue
        targets.append(c)
    return targets


def render(company_name, edit_token):
    name = (company_name or "").strip()
    edit_url = f"{BASE}/edycja/{edit_token}"
    confirm_url = f"{BASE}/potwierdz/{edit_token}"
    archive_url = f"{BASE}/archiwizuj/{edit_token}"
    return f"""<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ececec;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ececec;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

  <tr><td style="background:linear-gradient(135deg,#0D2240 0%,#1a3a66 100%);background-color:#0D2240;padding:32px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">Katalog Firm Polonijnych</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">w Szwajcarii</p>
  </td></tr>

  <tr><td style="padding:32px;">
    <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Może czas odświeżyć Wasze ogłoszenie?</h2>

    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Cześć, <strong>{name}</strong>!
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Twoje ogłoszenie nie było aktualizowane od ponad 3 miesięcy. Możecie
      <strong>dodać nowe zdjęcia</strong>, <strong>odświeżyć opis</strong>,
      zaktualizować dane kontaktowe czy cennik — aktualne ogłoszenia wyglądają
      wiarygodniej i są częściej klikane przez klientów.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
      <a href="{edit_url}" style="display:inline-block;background:#E30613;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:0 6px 12px;">
        Edytuj swoje ogłoszenie
      </a>
      <a href="{confirm_url}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:0 6px 12px;">
        Nie potrzebuję zmian &#10003;
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">
        Kliknięcie „Nie potrzebuję zmian" potwierdza, że ogłoszenie jest aktualne —
        nie będziemy przypominać przez kolejne 3 miesiące.
      </p>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 8px;">
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 14px;">
        <strong style="color:#1e293b;">Usługa jest już nieaktualna?</strong><br>
        Jeśli nie prowadzicie już tej działalności i nie chcecie dostawać od nas maili,
        możecie zawiesić ogłoszenie jednym kliknięciem — zniknie z katalogu i z naszych wysyłek.
      </p>
      <a href="{archive_url}" style="display:inline-block;background:#ffffff;border:1px solid #cbd5e1;color:#64748b;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
        Zawieś / usuń moją usługę
      </a>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:24px 0 0;">
      Jeżeli coś nie działa albo chcecie o coś zapytać — odpiszcie na tego maila, odpowiemy.<br>
      Pozdrawiamy, <strong style="color:#1e293b;">PolacySzwajcaria — Natalia &amp; Paweł</strong>
    </p>
  </td></tr>

  <tr><td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
      Katalog Firm Polonijnych w Szwajcarii<br>
      polacyszwajcaria.com/katalog-firm &middot; kontakt@polacyszwajcaria.com
    </p>
  </td></tr>

</table>
</td></tr></table></body></html>"""


def send(to, html):
    payload = json.dumps({
        "from": FROM_EMAIL, "to": [to], "reply_to": REPLY_TO,
        "subject": SUBJECT, "html": html,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=payload,
        headers={"Authorization": f"Bearer {RESEND_API_KEY}",
                 "Content-Type": "application/json", "Accept": "application/json",
                 "User-Agent": "katalog-firm-update-reminder/1.0"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return (True, body["id"]) if body.get("id") else (False, f"no_id:{body}")
    except urllib.error.HTTPError as e:
        return False, f"http_{e.code}:{e.read().decode('utf-8', 'replace')}"
    except Exception as e:
        return False, f"error:{e}"


def run_batch(auto):
    targets = pick_targets()
    print(f"Firm published z ostatnia zmiana > {STALE_DAYS}d (po cooldown {COOLDOWN_DAYS}d): {len(targets)}")
    for c in targets:
        ch = last_change(c)
        print(f"  id={c['id']:<4} {c['name'][:34]:<36} zmiana={ch.date() if ch else '?'} -> {c['email']}")
    if not targets:
        print("Brak firm do wyslania.")
        return 0
    if not auto:
        ans = input(f"\nPotwierdz wysylke do {len(targets)} firm [y/N]: ").strip().lower()
        if ans != "y":
            print("Anulowano.")
            return 1
    print()
    ok_n = fail_n = 0
    for i, c in enumerate(targets, 1):
        html = render(c["name"], c["edit_token"])
        ok, info = send(c["email"], html)
        if ok:
            ok_n += 1
            append_log({"status": "sent", "company_id": c["id"], "name": c["name"], "email": c["email"], "resend_id": info})
            print(f"  [{i}/{len(targets)}] OK  id={c['id']:<4} {c['email']:<34} -> {info}")
        else:
            fail_n += 1
            append_log({"status": "failed", "company_id": c["id"], "name": c["name"], "email": c["email"], "error": info})
            print(f"  [{i}/{len(targets)}] ERR id={c['id']:<4} {c['email']:<34} -> {info}")
        time.sleep(RATE_SLEEP)
    print(f"\nWyslane OK: {ok_n}  Bledy: {fail_n}")
    return 0 if fail_n == 0 else 2


def run_test():
    print(f"TEST -> {TEST_EMAIL} (renderowany jako '{TEST_COMPANY_NAME}', martwy token)")
    ok, info = send(TEST_EMAIL, render(TEST_COMPANY_NAME, TEST_TOKEN))
    print(("OK  " if ok else "ERR ") + str(info))
    return 0 if ok else 2


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    if mode == "test":
        return run_test()
    if mode == "real":
        return run_batch(auto=False)
    if mode == "cron":
        return run_batch(auto=True)
    print("Uzycie: send_update_reminder.py [test|real|cron]", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
