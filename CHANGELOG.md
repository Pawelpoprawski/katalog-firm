# Dziennik zmian — Katalog Firm

Format: data (RRRR-MM-DD), najnowsze na górze.

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
