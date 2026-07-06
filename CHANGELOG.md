# Dziennik zmian — Katalog Firm

Format: data (RRRR-MM-DD), najnowsze na górze.

## 2026-07-06

### Dodane
- **Skrypt `send_update_reminder.py`** — cykliczny mail „czas odświeżyć ogłoszenie", który **zastępuje stary mail potwierdzający** (`send_migration_emails.py --confirmation`).
  - Każda firma dostaje maila max co **3 miesiące** od najpóźniejszego z: utworzenia (`created_at`), edycji (`updated_at`), potwierdzenia (`last_confirmed_at`), ostatniej wysyłki (log `logs/update_reminder_log.jsonl`).
  - Tryby: `test` (fikcyjna firma, martwy token) / `real` (pyta y/N) / `cron`.
  - Mail (szablon w stylu maili systemowych, granatowy baner, bez hiperlinków w stopce): „Edytuj swoje ogłoszenie" (`/edycja/{token}`), „Nie potrzebuję zmian" (`/potwierdz/{token}` → ustawia `last_confirmed_at`), „Zawieś / usuń moją usługę" (`/archiwizuj/{token}`).
- **Cron `send_update_reminder_cron.sh`** co 5 dni o 10:00 (rytm per-firma pilnuje filtr 90 dni) — **zastąpił** `send_confirmations_cron.sh` w crontabie.
- **Endpoint `POST /companies/archive-token`** — samoobsługowe zawieszenie usługi przez `edit_token`: status → `archived` + `archived_at` + `archived_reason`. Firma znika ze strony i ze wszystkich wysyłek (filtrują `published`), pozostaje widoczna w adminie. Idempotentny, rate-limit 10/min.
- **Strona `/archiwizuj/[token]`** — potwierdzenie przyciskiem przed zawieszeniem (celowo nie przy wejściu — ochrona przed prefetch skanerów antyspamowych).
- **Admin**: status `archived` dozwolony w `PATCH /admin/companies/{id}/status`; badge „📦 Zawieszone" w liście firm, klik przywraca publikację.

### Naprawione
- Tryb `test` w `send_photo_request.py` i `send_update_reminder.py` nie używa już danych/tokenów prawdziwych firm — renderuje fikcyjną firmę z martwym tokenem.

## 2026-07-01

### Dodane
- **Skrypt `send_photo_request.py`** — prośba do firm o dodanie zdjęcia głównego.
  - Tryby: `test` (1 mail na adres testowy, renderowany jako Elektryk), `real` (pyta y/N), `cron` (auto).
  - Dynamicznie wykrywa firmy `published` bez `img` (z e-mailem + `edit_token`).
  - Cooldown 25 dni + audit log `logs/photo_request_log.jsonl` — każda firma max 1 mail/miesiąc, znika z listy po dodaniu zdjęcia.
  - Mail w kolorystyce katalogu: link edycji + opcja odpowiedzi na `kontakt@polacyszwajcaria.com`.
- **Cron miesięczny** na serwerze: `0 10 1 * *` (1. dnia miesiąca o 10:00) przez wrapper `send_photo_request_cron.sh` (perms 700, klucz Resend, poza gitem).
- **`.gitignore`**: dodano `send_photo_request_cron.sh`, `logs/`, `photo_request_log.jsonl`.

### Naprawione
- **Formularz `/dodaj`**: zdjęcie główne jest teraz faktycznie **obowiązkowe**. Walidacja `mainPhoto` była przypisana do kroku 3 (Podsumowanie), który wywołuje `submitForm` zamiast `handleNext`, więc nigdy się nie uruchamiała — dało się przejść dalej i wysłać ogłoszenie bez zdjęcia. Wymóg przeniesiony do kroku 2 (Zdjęcia) + guard w `submitForm`.

### Operacyjne
- Jednorazowa wysyłka prośby o zdjęcie do **6 firm** bez zdjęcia głównego (z 138 w bazie): id 12, 28, 66, 103, 146, 156 — 6/6 OK.
