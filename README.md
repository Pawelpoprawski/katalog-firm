# Katalog Firm — Polskie Usługi w Szwajcarii

Katalog polskich firm i usług w Szwajcarii dostępny pod adresem **https://katalog-firm.ch**.

Aplikacja oparta na **Next.js 14** (frontend) z backendem **FastAPI** (Python), hostowana na VPS OVH w Warszawie.

**GitHub**: https://github.com/Pawelpoprawski/katalog-firm

> Szczegóły deployu, SSH i workflow operacyjnego → **[DEPLOY.md](DEPLOY.md)**
> Instrukcje dla Claude Code (AI development) → **[CLAUDE.md](CLAUDE.md)**

---

## Spis treści

1. [Architektura](#architektura)
2. [Stack technologiczny](#stack-technologiczny)
3. [Struktura projektu](#struktura-projektu)
4. [Zmienne środowiskowe](#zmienne-srodowiskowe)
5. [Development lokalny](#development-lokalny)
6. [Deploy na produkcję](#deploy-na-produkcje)
7. [Konfiguracja nginx](#konfiguracja-nginx)
8. [PM2 — zarządzanie procesami](#pm2--zarzadzanie-procesami)
9. [Google Maps API](#google-maps-api)
10. [Panel admina](#panel-admina)
11. [Cykliczne potwierdzenia aktywności firm](#cykliczne-potwierdzenia-aktywnosci-firm)
12. [API Endpoints](#api-endpoints)
13. [Bezpieczeństwo](#bezpieczenstwo)
14. [SEO](#seo)
15. [Troubleshooting](#troubleshooting)

---

## Architektura

Aplikacja działa jako standalone na domenie **katalog-firm.ch** (root `/`).

```
                        nginx (reverse proxy, SSL)
                       /                          \
                      /                            \
              Next.js 14                        FastAPI
             (port 3000)                      (port 8000)
               /  *                             /api/*
                 \                                /
                  \-------- fetch (SSR + client) /
```

### Komponenty na serwerze

| Komponent | Technologia | Port | Ścieżka URL |
|-----------|-------------|------|-------------|
| Frontend | Next.js 14 | 3000 | `/` (wszystko oprócz `/api/*`) |
| Backend API | FastAPI | 8000 | `/api/*` (nginx stripuje prefix) |

### Architektura danych

- Pliki JSON w `backend/data/` (thread-safe, atomiczne zapisy)
- Obrazy ekstraktowane z base64 do systemu plików (`backend/data/images/`)
- Brak bazy SQL — wszystko w JSON + filesystem
- Cache in-memory (TTL 60s) dla list firm i kategorii

---

## Stack technologiczny

### Frontend
- **Next.js 14.2.4** — framework React z SSR i App Router
- **React 18.3.1** — biblioteka UI
- **TypeScript 5.5.3** — typy statyczne
- **TailwindCSS 3.4.4** — framework CSS (dark mode)
- **Google Maps** — interaktywna mapa + autocomplete adresów
- **@googlemaps/markerclusterer** — grupowanie markerów na mapie

### Backend
- **FastAPI 0.115.12** — framework API (Python)
- **Pydantic 2.10** — walidacja danych + schematy
- **uvicorn** — serwer ASGI
- **googlemaps 4.10** — geocoding adresów (lat/lng)
- **Pillow** — konwersja obrazów do WebP
- **bleach** — sanityzacja HTML (ochrona XSS)
- **slowapi** — rate limiting (per IP)
- **bcrypt** — hashowanie haseł (bezpośrednio, bez passlib)

### Przechowywanie danych
- **JSON file-based** — thread-safe via `threading.RLock()`, atomiczne zapisy (temp file + `os.replace`)
- Pliki w `backend/data/`:
  - `companies.json`, `categories.json`, `reviews.json`, `users.json`
  - `stats.json` (views/clicks per dzień), `analytics.json` (impressions, nowe firmy, potwierdzenia)
  - `settings.json` (social media, sort order, newsletter count)
  - `reports.json`, `ip_blacklist.txt`
- Obrazy w `backend/data/images/` (serwowane przez nginx location `/images/`)
- **`.gitignore` wyklucza całe `backend/data/*.json`** — dane żyją tylko na serwerze

### Maile (cykliczne potwierdzenia)
- **Resend API** — wysyłka HTML maili z Let's Encrypt domeny `katalog-firm.ch`
- Szablon: `email_migration_template.html`
- Skrypt: `send_migration_emails.py` (tryby `--confirmation`, `--bulk`, `--test`)
- Cron: `0 10 */5 * * send_confirmations_cron.sh` (co 5 dni o 10:00)

### Serwer produkcyjny
- **OVH VPS (Warszawa)** — `54.38.54.237`, Ubuntu 25.04
- **nginx** — reverse proxy + cache (5 min) + SSL termination
- **PM2** — manager procesów (`katalog-backend`, `katalog-frontend`)
- **Let's Encrypt** — certyfikat SSL (auto-renew przez certbot timer)

---

## Struktura projektu

```
katalog-firm/
├── backend/
│   ├── data/                        # Pliki bazy (gitignored, tylko .gitkeep trackowany)
│   │   ├── companies.json           # Firmy (~230KB, z edit_token)
│   │   ├── categories.json          # Kategorie
│   │   ├── reviews.json             # Recenzje
│   │   ├── users.json               # Użytkownicy
│   │   ├── stats.json               # Views/clicks per firma per dzień
│   │   ├── analytics.json           # Impressions, nowe firmy, potwierdzenia
│   │   ├── settings.json            # Social media, sort order
│   │   ├── reports.json             # Zgłoszenia recenzji
│   │   ├── ip_blacklist.txt         # Zablokowane IP
│   │   └── images/                  # Ekstraktowane obrazy (WebP)
│   ├── routers/
│   │   ├── admin.py                 # Endpointy admina (bearer auth)
│   │   ├── auth.py                  # Rejestracja/logowanie JWT
│   │   ├── categories.py            # Kategorie CRUD
│   │   ├── companies.py             # Firmy CRUD (główny zasób)
│   │   ├── reviews.py               # Recenzje
│   │   └── reports.py               # Zgłoszenia
│   ├── main.py                      # Punkt wejścia FastAPI
│   ├── settings.py                  # Konfiguracja (env vars)
│   ├── schemas.py                   # Modele Pydantic (CompanyBase, ReviewCreate, itd.)
│   ├── security.py                  # Hashowanie haseł (bcrypt)
│   ├── security_middleware.py       # Rate limiting, sanityzacja HTML, walidacja URL
│   ├── ip_blacklist.py              # Middleware blokowania IP
│   ├── geocoding.py                 # Google Maps geocoding
│   ├── image_utils.py               # Konwersja obrazów (base64 → WebP → filesystem)
│   ├── email_service.py             # Wysyłka maila "witamy w katalogu" (Resend)
│   ├── storage.py                   # Warstwa bazy danych (JSON + cache + locks)
│   ├── clear_cache.py               # Clearing nginx cache po CRUD
│   ├── migrate_images.py            # One-shot: extract base64 → filesystem
│   ├── requirements.txt             # Zależności Python
│   ├── start.sh                     # PM2 entry point (odpala uvicorn)
│   └── .env                         # ADMIN_PASSWORD, SECRET_KEY, GOOGLE_MAPS_API_KEY (NIE COMMITOWAĆ!)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Strona główna (mapa + lista firm)
│   │   │   ├── layout.tsx               # Root layout (SEO, JSON-LD, CSP meta)
│   │   │   ├── AppShell.tsx             # Header, footer, cookie banner
│   │   │   ├── sitemap.ts               # Dynamiczny sitemap (rewalidacja 1h)
│   │   │   ├── not-found.tsx            # Custom 404
│   │   │   ├── dodaj/page.tsx           # Formularz dodawania firmy (4 kroki)
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx             # Panel admina (login)
│   │   │   │   ├── layout.tsx           # noindex/nofollow
│   │   │   │   └── components/          # AdminStats (wykresy), AdminCompanies, AdminReviews, AdminCategories, AdminSettings
│   │   │   ├── firma/[slug]/            # Strona firmy (SSR metadata + client interactivity)
│   │   │   │   ├── page.tsx             # Server component (metadata)
│   │   │   │   └── CompanyPageClient.tsx # Client component
│   │   │   ├── edycja/[token]/          # Edycja firmy przez unikalny token
│   │   │   ├── potwierdz/page.tsx       # Potwierdzenie aktywności firmy (wpisz email)
│   │   │   ├── kategoria/[slug]/        # Filtr po kategorii (SSR metadata)
│   │   │   ├── konto/                   # Panel użytkownika + ulubione
│   │   │   ├── login/ · rejestracja/    # Auth użytkowników
│   │   │   ├── jak-to-dziala/           # Strona "Jak to działa"
│   │   │   └── polityka-prywatnosci/    # Polityka prywatności
│   │   ├── hooks/
│   │   │   └── useFavorites.ts          # Hook ulubionych (localStorage)
│   │   ├── components/
│   │   │   ├── CompanyCard.tsx
│   │   │   ├── Filters.tsx
│   │   │   ├── GoogleMap.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── lib/utils.ts
│   │   └── types.ts                     # Wspólne TypeScript types
│   ├── public/
│   │   ├── favicon.ico, icon.png, apple-icon.png, logo.png
│   │   ├── default-company.png
│   │   ├── manifest.json                # PWA manifest
│   │   └── robots.txt                   # User-agent rules
│   ├── next.config.mjs                  # Config Next.js (basePath: puste = root)
│   ├── tailwind.config.cjs              # Config Tailwind (colors, dark mode)
│   ├── tsconfig.json                    # Config TypeScript (strict)
│   ├── package.json
│   └── .env.local                       # NEXT_PUBLIC_API_URL, GOOGLE_MAPS_KEY (NIE COMMITOWAĆ!)
│
├── email_migration_template.html        # HTML template maila potwierdzenia (placeholdery: {{COMPANY_NAME}}, {{COMPANY_EMAIL}}, {{EDIT_TOKEN}})
├── email_migration_preview.html         # Podgląd z dummy data (do wizualnego sprawdzenia)
├── send_migration_emails.py             # Skrypt wysyłki maili (tryby: --confirmation, --bulk, --test, --dry-run)
│
├── CLAUDE.md                            # Instrukcje dla Claude Code (dev workflow)
├── DEPLOY.md                            # Instrukcje deploy (SSH, commendy, troubleshooting)
├── README.md                            # Ten plik
└── .gitignore                           # Ignoruje .env, backend/data/*, logs, buildy, migration artifacts
```

---

## Zmienne środowiskowe

### Backend (`backend/.env`)

| Zmienna | Wymagana | Opis | Przykład |
|---------|----------|------|----------|
| `ADMIN_PASSWORD` | **TAK** | Hasło do panelu admina | `MojeSilneHaslo123!` |
| `SECRET_KEY` | **TAK** | Klucz do podpisywania tokenów JWT (min 32 znaki) | wygenerowany losowo |
| `GOOGLE_MAPS_API_KEY` | **TAK** | Klucz API Google Maps (geocoding adresów) | `AIzaSy...` |
| `CORS_ORIGINS` | **TAK (prod)** | Dozwolone domeny (NIE `*` na produkcji) | `https://katalog-firm.ch,https://www.katalog-firm.ch` |
| `DEBUG` | NIE | Tryb debug (domyślnie `False`) | `False` |

**Szablon `backend/.env`:**
```bash
ADMIN_PASSWORD=twoje_silne_haslo_admina
SECRET_KEY=wygeneruj_losowy_string_min_32_znakow
GOOGLE_MAPS_API_KEY=AIzaSy_twoj_klucz_google_maps
DEBUG=False
CORS_ORIGINS=https://katalog-firm.ch,https://www.katalog-firm.ch
```

**Generowanie `SECRET_KEY`:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend (`frontend/.env.local`)

| Zmienna | Wymagana | Opis | Przykład |
|---------|----------|------|----------|
| `NEXT_PUBLIC_API_URL` | **TAK** | URL backendu API | `https://katalog-firm.ch/api` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | **TAK** | Klucz API Google Maps (frontend mapa + autocomplete) | `AIzaSy...` |
| `NEXT_PUBLIC_BASE_PATH` | NIE | Prefix ścieżki (puste = root `/`) | `` |

**Szablon `frontend/.env.local`:**
```bash
# Produkcja
NEXT_PUBLIC_API_URL=https://katalog-firm.ch/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy_twoj_klucz_google_maps
NEXT_PUBLIC_BASE_PATH=

# Development lokalny
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Cron wysyłki maili (`send_confirmations_cron.sh` — tylko na serwerze)

Wrapper bash z env vars (NIE commitowany do git, perms 700):
```bash
export RESEND_API_KEY="re_..."
export ADMIN_PASSWORD="..."
export API_BASE_URL="http://127.0.0.1:8000"
```

---

## Development lokalny

### Wymagania
- **Python 3.10+** (testowane na 3.14)
- **Node.js 18+**
- **npm**

### 1. Klonowanie
```bash
git clone https://github.com/Pawelpoprawski/katalog-firm.git
cd katalog-firm
```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows
pip install -r requirements.txt

# Utwórz .env (patrz sekcja "Zmienne środowiskowe")
cp .env.example .env
# Edytuj .env — ustaw ADMIN_PASSWORD, SECRET_KEY, GOOGLE_MAPS_API_KEY

# Uruchom z root projektu
cd ..
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend → http://localhost:8000
Dokumentacja API (Swagger) → http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install

# Utwórz .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=twoj_klucz_google
NEXT_PUBLIC_BASE_PATH=
EOF

npm run dev
```

Frontend → http://localhost:3000

### Komendy pomocnicze
```bash
# Build produkcyjny (waliduje TypeScript)
npm run build

# Lint
npm run lint
```

---

## Deploy na produkcję

> **Pełne instrukcje deployu → [DEPLOY.md](DEPLOY.md)** (zawiera SSH creds, komendy, troubleshooting).

### TL;DR
```bash
# 1. Lokalnie
git add . && git commit -m "opis" && git push origin main

# 2. Na serwerze
ssh ubuntu@54.38.54.237        # hasło w DEPLOY.md
cd /home/ubuntu/strony/katalog_firm
git pull origin main
cd frontend && npm run build
pm2 restart katalog-backend katalog-frontend
```

Wszystkie dane (`backend/data/*.json`) są **gitignored** — żyją tylko na serwerze, `git pull` ich nie rusza.

---

## Konfiguracja nginx

Plik: `/etc/nginx/sites-available/katalog-firm`

```nginx
server {
    listen 443 ssl http2;
    server_name katalog-firm.ch www.katalog-firm.ch;

    # SSL (Let's Encrypt, auto-renew przez certbot)
    ssl_certificate /etc/letsencrypt/live/katalog-firm.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/katalog-firm.ch/privkey.pem;

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache API (5 minut)
        proxy_cache katalog_cache;
        proxy_cache_valid 200 5m;

        client_max_body_size 10M;
    }

    # Obrazy firm (ekstraktowane do filesystem)
    location /images/ {
        alias /home/ubuntu/strony/katalog_firm/backend/data/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Next.js static assets
    location /_next {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name katalog-firm.ch www.katalog-firm.ch;
    return 301 https://$server_name$request_uri;
}
```

**Testowanie i restart:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Odnowienie SSL (ręczne, normalnie auto):**
```bash
sudo certbot renew
```

---

## PM2 — zarządzanie procesami

```bash
# Status
pm2 list

# Logi na żywo
pm2 logs katalog-backend
pm2 logs katalog-frontend

# Restart
pm2 restart katalog-backend
pm2 restart katalog-frontend
pm2 restart all

# Auto-start po reboot serwera
pm2 save
pm2 startup

# Monitoring zasobów (CPU, RAM)
pm2 monit
```

---

## Google Maps API

### Uzyskanie klucza
1. **Google Cloud Console** → https://console.cloud.google.com
2. Włącz wymagane API:
   - **Maps JavaScript API** — mapa na stronie głównej
   - **Places API** — autocomplete adresów w formularzach
   - **Geocoding API** — zamiana adresów na współrzędne (backend)
3. **Credentials** → **Create Credentials** → **API key**

### Zabezpieczenie klucza
- **Application restrictions** → **HTTP referrers**:
  ```
  https://katalog-firm.ch/*
  https://www.katalog-firm.ch/*
  http://localhost:3000/*
  ```
- **API restrictions** → tylko 3 powyższe APIs

### Umiejscowienie
- Frontend: `frontend/.env.local` → `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
- Backend: `backend/.env` → `GOOGLE_MAPS_API_KEY`

Można użyć tego samego klucza, ale lepiej mieć **osobne**: frontend z HTTP referrer, backend z IP serwera.

---

## Panel admina

**URL**: https://katalog-firm.ch/admin

**Logowanie**: `ADMIN_PASSWORD` z `backend/.env` (header `Authorization: Bearer <hasło>`).

### Funkcje

| Funkcja | Opis |
|---------|------|
| **Lista firm** | Przeglądanie, filtrowanie, sortowanie, paginacja |
| **Zmiana statusu** | draft / published |
| **Promowanie** | Wyróżnienie firmy (`is_promoted`) |
| **Zmiana kategorii** | Przeniesienie do innej kategorii |
| **Edycja emaila** | Aktualizacja adresu email firmy |
| **Link edycji** | Kopiowanie tokena edycji (do wysłania właścicielowi) |
| **Usuwanie firmy** | Trwałe usunięcie |
| **Lista recenzji** | Przeglądanie, usuwanie spam/nieprawdziwych |
| **Blokowanie IP** | Dodawanie spamerów do blacklisty |
| **Kategorie** | CRUD kategorii (emoji + nazwa) |
| **Ustawienia** | Ilość firm w newsletterze, sort order |
| **Statystyki** | Wykres 30 dni: wyświetlenia, unikalni, nowe firmy, nowe opinie, **wysłane prośby o potwierdzenie, otrzymane potwierdzenia** |

### Token edycji firm

- Każda firma dostaje unikalny `edit_token` (256-bit entropy, `secrets.token_urlsafe(32)`) przy utworzeniu
- Link edycji: `https://katalog-firm.ch/edycja/{TOKEN}`
- Widoczny tylko w panelu admina i w mailu do właściciela (publiczne API go NIE zwraca)
- **NIE udostępniaj tokenów publicznie**

---

## Cykliczne potwierdzenia aktywności firm

System automatycznie wysyła maile do firm w katalogu z prośbą o potwierdzenie, że nadal są aktywne w Szwajcarii. Utrzymuje bazę aktualną bez ręcznej weryfikacji.

### Flow

1. **Cron na serwerze** (`0 10 */5 * * /home/ubuntu/strony/katalog_firm/send_confirmations_cron.sh`) — co 5 dni o 10:00 (dni 5, 10, 15, 20, 25, 30 miesiąca)
2. **Filtr kandydatów** — firmy spełniające:
   - `status == "published"`
   - Mają email + edit_token
   - `last_confirmed_at` NULL lub **starsze niż 6 miesięcy** (180 dni)
   - **ORAZ** `last_confirmation_request_at` NULL lub **starsze niż 30 dni** (dedupe)
3. **Wysyłka przez Resend API** — rate limit 1.6 req/s, max 2 req/s (Resend free tier)
4. **Zapisanie `last_confirmation_request_at`** — żeby za 5 dni (następny cron) nie wysłać do tych samych firm
5. **Update wykresu `/admin`** — dzienny licznik `confirmation_emails_sent`
6. **User klika link w mailu** → `/potwierdz` → wpisuje email → `POST /api/companies/confirm` → ustawia `last_confirmed_at` + `confirmations_received++`

### Pliki

| Plik | Rola |
|---|---|
| `email_migration_template.html` | HTML template z placeholderami `{{COMPANY_NAME}}`, `{{COMPANY_EMAIL}}`, `{{EDIT_TOKEN}}` |
| `email_migration_preview.html` | Podgląd z dummy data (otwórz w przeglądarce) |
| `send_migration_emails.py` | Skrypt wysyłki — tryby `--confirmation` (cykliczny), `--bulk` (legacy migracja), `--test` (1 mail) |
| `send_confirmations_cron.sh` | Wrapper bash dla crona (tylko na serwerze, z env vars RESEND_API_KEY + ADMIN_PASSWORD) |
| `migration_send_log.jsonl` | Append-only audit log (status + resend_id + ts per firma) — gitignored |

### Uruchomienie ręczne

```bash
export ADMIN_PASSWORD="..."
export RESEND_API_KEY="re_..."

# Dry-run (pokaż ile firm, nic nie wysyła)
python send_migration_emails.py --confirmation --dry-run

# Wysyłka z pytaniem y/N
python send_migration_emails.py --confirmation

# Wysyłka bez pytania (dla crona)
python send_migration_emails.py --confirmation --auto-confirm

# Ograniczenie do N firm (testy)
python send_migration_emails.py --confirmation --limit 5

# Wewnątrz serwera (lokalny API, szybciej)
python send_migration_emails.py --confirmation --api-url http://127.0.0.1:8000 --auto-confirm
```

### Wykres w `/admin`

Dzienne dane na wykresie w panelu admina:
- **Wysłane prośby o potwierdzenie** (fioletowa linia) — ile maili poszło tego dnia
- **Otrzymane potwierdzenia** (cyjan) — ile firm kliknęło i potwierdziło

---

## API Endpoints

Pełna dokumentacja interaktywna: https://katalog-firm.ch/api/docs (Swagger UI) lub http://localhost:8000/docs lokalnie.

### Publiczne

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/health` | Health check |
| GET | `/api/settings` | Publiczne ustawienia (sort order, newsletter count) |
| GET | `/api/categories` | Lista kategorii |
| GET | `/api/companies` | Lista firm (limit, category_id, status) |
| GET | `/api/companies/{id}` | Firma po ID |
| GET | `/api/companies/by-slug/{slug}` | Firma po slug (SEO) |
| GET | `/api/companies/by-token/{token}` | Firma po tokenie edycji |
| POST | `/api/companies/` | Dodanie nowej firmy (rate limit 3/h) |
| PUT | `/api/companies/{id}` | Edycja firmy (wymaga `edit_token` w body) |
| DELETE | `/api/companies/{id}` | Usunięcie firmy (wymaga `edit_token`) |
| POST | `/api/companies/{id}/view` | Zliczenie wyświetlenia |
| POST | `/api/companies/{id}/click` | Zliczenie kliknięcia |
| POST | `/api/companies/batch-view` | Batch zliczanie (do 50 ID, z Intersection Observer) |
| POST | `/api/companies/confirm` | Potwierdzenie aktywności przez email (rate limit 5/min) |
| GET | `/api/reviews` | Lista recenzji (`company_id`) |
| POST | `/api/reviews` | Dodanie recenzji (rating 1-5) |
| POST | `/api/reports` | Zgłoszenie recenzji |
| POST | `/api/auth/register` | Rejestracja użytkownika |
| POST | `/api/auth/login` | Logowanie (zwraca JWT) |

### Admin (`Authorization: Bearer {ADMIN_PASSWORD}`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/admin/stats` | Statystyki (30 dni + totale views/clicks) |
| GET | `/api/admin/analytics?days=30` | Dzienna analityka (views, unikalni, nowe firmy, recenzje, potwierdzenia) |
| GET | `/api/admin/companies` | Wszystkie firmy (z `edit_token`, wszystkie statusy) |
| PATCH | `/api/admin/companies/{id}/status` | Zmiana statusu (draft/published) |
| PATCH | `/api/admin/companies/{id}/promote` | Toggle promowania |
| PATCH | `/api/admin/companies/{id}/category` | Zmiana kategorii |
| PATCH | `/api/admin/companies/{id}` | Edycja pól firmy |
| DELETE | `/api/admin/companies/{id}` | Usunięcie firmy |
| **POST** | **`/api/admin/track-confirmation-sent`** | **Bulk-update `last_confirmation_request_at` + licznik wysłanych maili (używane przez skrypt cron)** |
| GET | `/api/admin/reviews` | Wszystkie recenzje |
| DELETE | `/api/admin/reviews/{id}` | Usunięcie recenzji |
| GET | `/api/admin/ip-blacklist` | Lista zablokowanych IP |
| POST | `/api/admin/ip-blacklist/add` | Zablokowanie IP |
| DELETE | `/api/admin/ip-blacklist/remove` | Odblokowanie IP |
| GET | `/api/admin/settings` | Ustawienia admina |
| PUT | `/api/admin/settings/social-media` | Aktualizacja linków social |
| PUT | `/api/admin/settings/newsletter-count` | Ilość firm w newsletterze |
| PUT | `/api/admin/settings/sort-order` | Sort order (newest/random/alphabetical) |
| GET | `/api/admin/categories` | Lista kategorii (z ID) |
| POST | `/api/admin/categories` | Dodanie kategorii |
| PUT | `/api/admin/categories/{id}` | Edycja kategorii |
| DELETE | `/api/admin/categories/{id}` | Usunięcie kategorii |

---

## Bezpieczeństwo

### Zaimplementowane zabezpieczenia

| Zabezpieczenie | Opis |
|----------------|------|
| **Rate limiting** (slowapi) | `/companies/confirm` 5/min, `POST /companies/` 3/h, reszta domyślnie |
| **IP Blacklist middleware** | Blokowanie IP spamerów (admin zarządza) |
| **CORS** | Tylko dozwolone domeny w `CORS_ORIGINS` (NIE `*` na prod) |
| **XSS Protection** | `bleach` sanityzacja HTML na wejściu (allowed tags) |
| **Security Headers** | HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP |
| **Password Hashing** | bcrypt bezpośrednio (passlib niekompatybilne z 3.14) |
| **Edit Tokens** | `secrets.token_urlsafe(32)` — 256-bit entropy, unikalne per firma |
| **Anti-enumeracja emaili** | `/companies/confirm` zwraca zawsze ten sam string (niezależnie od istnienia emaila) |
| **Input Validation** | Pydantic: EmailStr, rating 1-5, min_length, url validation |
| **SSRF Protection** | `validate_url` w `security_middleware.py` — blokuje prywatne/wewnętrzne IP w polu `website` |
| **Image Validation** | Max 10MB, JPG/PNG, auto-konwersja do WebP (Pillow) |
| **GZIP Compression** | Odpowiedzi > 1KB kompresowane |

### Ważne zasady bezpieczeństwa

1. **NIGDY nie ustawiaj `CORS_ORIGINS=*`** na produkcji — zawsze dokładna domena
2. **NIGDY nie ustawiaj `DEBUG=True`** na produkcji
3. **Silne `ADMIN_PASSWORD`** — min 12 znaków, litery + cyfry + symbole
4. **Losowy `SECRET_KEY`** — `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
5. **Ogranicz klucz Google Maps** — HTTP referrer + API restrictions
6. **NIE commituj `.env`** — jest w `.gitignore`
7. **NIE commituj `migration_send_log.jsonl`, `_all_companies.json`, `_dummy_company.json`** — zawierają emaile i edit_tokens (gitignored)
8. **Cron wrapper `send_confirmations_cron.sh`** — perms 700, tylko na serwerze, NIE w git

### Zewnętrzny audyt (2026-04-20)

Pełny security audit wykonany zewnętrznie przez Claude — znaleziska tylko **LOW severity**:
- OpenAPI docs (`/api/docs`, `/api/openapi.json`) są publicznie dostępne (info disclosure)
- Brak lockoutu na admin login (rate limit tylko per endpoint)
- CSP z `unsafe-inline` (typowe dla Next.js)

Żadnych krytycznych podatności — auth, IDOR, path traversal, XSS reflection, CORS, SSRF: wszystko zabezpieczone.

---

## SEO

### Sitemap
- **Automatyczny** — generowany przez Next.js (`sitemap.ts`)
- **URL**: https://katalog-firm.ch/sitemap.xml
- **Zawiera**: strona główna, strony firm (`/firma/{slug}`), kategorie (`/kategoria/{slug}`), `/dodaj`, `/jak-to-dziala`, `/polityka-prywatnosci`
- **Rewalidacja**: co 1 godzinę

### robots.txt
`frontend/public/robots.txt`:
```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /api/
Disallow: /_next/

Sitemap: https://katalog-firm.ch/sitemap.xml
```

### Metadata i Open Graph

| Strona | Metadata | Open Graph | Twitter Card |
|--------|----------|------------|--------------|
| Strona główna (layout) | title, description, keywords, robots, canonical | og:title, og:image, og:url, og:locale | summary_large_image |
| Strona firmy (`/firma/[slug]`) | Dynamiczne per firma | Dynamiczne + zdjęcie firmy | Dynamiczne |
| Kategoria (`/kategoria/[slug]`) | Dynamiczne per kategoria | Dynamiczne | Dynamiczne |
| `/admin` | `robots: noindex, nofollow` | — | — |

### Structured Data (JSON-LD)

Automatycznie w `layout.tsx`:
- `Organization` (nazwa, logo, sameAs Facebook/portal)
- `WebSite` (url, język, wydawca)
- `LocalBusiness` na stronach firm (nazwa, adres, telefon, rating, reviews)

### Google Search Console

1. Dodaj właściwość `katalog-firm.ch`
2. Prześlij sitemap `https://katalog-firm.ch/sitemap.xml`
3. Weryfikacja przez DNS TXT lub meta tag w `layout.tsx`

---

## Troubleshooting

### Backend nie startuje
```bash
pm2 logs katalog-backend --lines 30
ls -la /home/ubuntu/strony/katalog_firm/backend/.env
pm2 restart katalog-backend
```

### Frontend 502 Bad Gateway
```bash
pm2 logs katalog-frontend --lines 30
# Jeśli "Could not find production build":
cd /home/ubuntu/strony/katalog_firm/frontend
npm run build
pm2 restart katalog-frontend
```

### `git pull` błąd `DU conflict` na `backend/data/*.json`
Legacy artifact po przeniesieniu danych poza git (commit `feb61b2`):
```bash
cd /home/ubuntu/strony/katalog_firm
git rm --cached backend/data/*.json backend/data/*.txt
git pull origin main
# Pliki zostają na dysku (gitignored), index jest czysty
```

### 404 na API endpoints
```bash
curl http://localhost:8000/health          # backend żyje?
sudo nginx -t                              # nginx config OK?
grep CORS_ORIGINS /home/ubuntu/strony/katalog_firm/backend/.env  # domena w CORS?
```

### 422 przy edycji firmy (Field required: payload)
Frontend musi wysyłać body w zagnieżdżonej strukturze:
```json
{
  "payload": { "name": "...", "email": "...", "...": "..." },
  "edit_token": "token_firmy"
}
```
FastAPI z `Body(..., embed=True)` wymaga zagnieżdżenia.

### Obrazy się nie ładują
```bash
ls -la /home/ubuntu/strony/katalog_firm/backend/data/images/ | head -5
sudo tail -f /var/log/nginx/error.log

# Przebuduj frontend jeśli `/_next/` błędy:
cd frontend && npm run build && pm2 restart katalog-frontend
```

### Brak mapy Google
1. Klucz w `frontend/.env.local` (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`)
2. Czy APIs włączone w Google Cloud Console (Maps JavaScript API, Places API, Geocoding API)?
3. HTTP referrer zawiera `katalog-firm.ch`?
4. Konsola przeglądarki (F12 → Console) pokazuje błędy?

### Cron wysyłki maili nie działa
```bash
# Sprawdź crontab
crontab -l
# Powinno być: 0 10 */5 * * /home/ubuntu/strony/katalog_firm/send_confirmations_cron.sh

# Sprawdź logi cron
tail -50 /home/ubuntu/strony/katalog_firm/logs/cron_confirmations.log

# Odpal ręcznie
/home/ubuntu/strony/katalog_firm/send_confirmations_cron.sh

# Sprawdź czy Resend API key działa (env vars wewnątrz wrappera)
cat /home/ubuntu/strony/katalog_firm/send_confirmations_cron.sh
```

### Nginx cache zwraca stare dane
```bash
sudo rm -rf /var/cache/nginx/katalog/*
sudo systemctl reload nginx
```

### SSL cert wygasa
Certbot auto-renew powinien działać przez timer systemd. Sprawdzenie:
```bash
sudo systemctl status certbot.timer
sudo certbot certificates
# Ręczne odnowienie jeśli trzeba:
sudo certbot renew
```

---

## Kluczowe URLs

| URL | Opis |
|-----|------|
| https://katalog-firm.ch | Strona główna (mapa + lista firm) |
| https://katalog-firm.ch/dodaj | Formularz dodawania firmy |
| https://katalog-firm.ch/admin | Panel admina (login) |
| https://katalog-firm.ch/potwierdz | Potwierdzenie aktywności firmy |
| https://katalog-firm.ch/firma/{slug} | Strona konkretnej firmy |
| https://katalog-firm.ch/kategoria/{slug} | Firmy w kategorii |
| https://katalog-firm.ch/edycja/{token} | Edycja firmy (wymaga tokena) |
| https://katalog-firm.ch/sitemap.xml | Sitemap dla Google |
| https://katalog-firm.ch/api/docs | Swagger UI (OpenAPI) |
| https://katalog-firm.ch/api/companies/ | API lista firm |

---

## License

Proprietary — Natalia & Paweł Poprawscy 2024-2026
