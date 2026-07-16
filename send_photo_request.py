# -*- coding: utf-8 -*-
"""
Prosba o dodanie zdjecia glownego do firm, ktore go nie maja.

Tryby:
  python send_photo_request.py test   -> 1 mail do adresu testowego (renderowany jako Elektryk)
  python send_photo_request.py real   -> maile do wszystkich firm published bez img (pyta y/N)
  python send_photo_request.py cron   -> jak real, bez pytania (dla crona co miesiac)

Filtr kandydatow:
  status == "published"
  brak img (puste/null)
  ma email + edit_token
  ostatnia prosba o zdjecie starsza niz COOLDOWN_DAYS (dedupe)

Wymagane env:
  RESEND_API_KEY

Log: logs/photo_request_log.jsonl (append-only audit)
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
LOG_FILE = ROOT / "logs" / "photo_request_log.jsonl"

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
if not RESEND_API_KEY:
    print("BLAD: RESEND_API_KEY nie ustawione.", file=sys.stderr)
    sys.exit(1)

FROM_EMAIL = "PolacySzwajcaria <katalog.firm@polacyszwajcaria.com>"
REPLY_TO = "kontakt@polacyszwajcaria.com"
SUBJECT = "Katalog Firm Polonijnych — dodaj zdjecie glowne swojej firmy"
BASE = "https://polacyszwajcaria.com/katalog-firm"

TEST_EMAIL = "poprawskipawel@gmail.com"
# Tryb testowy renderuje FIKCYJNA firme z martwym tokenem —
# nigdy nie uzywamy danych/tokenow prawdziwych firm w mailach testowych.
TEST_COMPANY_NAME = "Przykladowa Firma (TEST)"
TEST_TOKEN = "TEST-TOKEN-NIEAKTYWNY"

RATE_SLEEP = 0.6      # ~1.6 req/s (Resend free tier = 2/s)
COOLDOWN_DAYS = 25    # nie wysylaj ponownie do firmy czesciej niz co 25 dni


def load_companies():
    d = json.load(open(COMPANIES_FILE, encoding="utf-8"))
    return d if isinstance(d, list) else d.get("companies", [])


def has_img(c):
    v = c.get("img")
    return bool(v) and isinstance(v, str) and v.strip() != ""


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
            try:
                dt = datetime.fromisoformat(e["ts"].replace("Z", "+00:00"))
            except Exception:
                continue
            cid = e.get("company_id")
            if cid is not None and (cid not in out or dt > out[cid]):
                out[cid] = dt
    return out


def pick_targets():
    now = datetime.now(timezone.utc)
    sent = last_sent_map()
    targets = []
    for c in load_companies():
        if c.get("status") != "published":
            continue
        if has_img(c):
            continue
        if not c.get("email") or "@" not in (c.get("email") or ""):
            continue
        if not c.get("edit_token"):
            continue
        last = sent.get(c.get("id"))
        if last and (now - last) < timedelta(days=COOLDOWN_DAYS):
            continue
        targets.append(c)
    return targets


def render(company_name, edit_token):
    name = (company_name or "").strip()
    edit_url = f"{BASE}/edycja/{edit_token}"
    return f"""<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:Arial,Helvetica,sans-serif;color:#0D2240;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E0E3E8;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#0D2240;padding:24px 32px;">
    <div style="height:4px;width:44px;background:#E1002A;border-radius:2px;margin-bottom:14px;"></div>
    <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">Katalog Firm Polonijnych</span>
    <div style="color:#9fb0c7;font-size:12px;margin-top:4px;">Katalog Polskich Firm w Szwajcarii</div>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="font-size:16px;margin:0 0 16px;">Dzien dobry,</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Dziekujemy, ze firma <strong>{name}</strong> jest w naszym katalogu polskich firm i uslug w Szwajcarii.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Zauwazylismy, ze Wasz profil <strong>nie ma jeszcze zdjecia glownego</strong>.
      To wlasnie ono wyswietla sie na liscie firm i najbardziej przyciaga uwage klientow —
      wpisy ze zdjeciem sa klikane duzo czesciej. Prosimy o jego dodanie.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center" style="border-radius:8px;background:#E1002A;">
        <a href="{edit_url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">
          Dodaj zdjecie glowne
        </a>
      </td></tr>
    </table>
    <p style="font-size:13px;line-height:1.6;color:#555;margin:0 0 8px;">
      Gdyby przycisk nie dzialal, skopiuj ten link do przegladarki:
    </p>
    <p style="font-size:13px;line-height:1.5;margin:0 0 20px;word-break:break-all;">
      <a href="{edit_url}" style="color:#E1002A;">{edit_url}</a>
    </p>
    <div style="background:#F5F6F8;border-radius:8px;padding:16px 20px;margin:0 0 8px;">
      <p style="font-size:14px;line-height:1.6;margin:0;color:#333;">
        <strong>Nie chce Ci sie tego robic samodzielnie?</strong><br>
        Zadnego problemu — odpisz po prostu na tego maila (lub napisz na
        <a href="mailto:kontakt@polacyszwajcaria.com" style="color:#E1002A;">kontakt@polacyszwajcaria.com</a>)
        i dolacz zdjecie w zalaczniku. My sami dodamy je do Waszego profilu.
      </p>
    </div>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #E0E3E8;background:#fafbfc;">
    <p style="font-size:12px;color:#888;line-height:1.5;margin:0;">
      Pozdrawiamy,<br>Zespol Katalogu Firm — PolacySzwajcaria<br>
      <a href="{BASE}" style="color:#888;">polacyszwajcaria.com/katalog-firm</a> &middot;
      <a href="mailto:kontakt@polacyszwajcaria.com" style="color:#888;">kontakt@polacyszwajcaria.com</a>
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
                 "User-Agent": "katalog-firm-photo-request/1.0"},
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
    print(f"Firm published bez zdjecia glownego (po cooldown {COOLDOWN_DAYS}d): {len(targets)}")
    for c in targets:
        print(f"  id={c['id']:<4} {c['name'][:38]:<40} -> {c['email']}")
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
    print("Uzycie: send_photo_request.py [test|real|cron]", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
