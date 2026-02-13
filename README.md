# Katalog Firm - Polskie Uslugi w Szwajcarii

Katalog polskich firm i uslug w Szwajcarii dzialajacy jako subdirectory na **polacyszwajcaria.com/uslugi**.

Aplikacja oparta na **Next.js 14** (frontend) z backendem **FastAPI** (Python), zintegrowana z glowna strona WordPress.

**GitHub**: https://github.com/Pawelpoprawski/katalog-firm

---

## Spis tresci

1. [Architektura](#architektura)
2. [Stack technologiczny](#stack-technologiczny)
3. [Struktura projektu](#struktura-projektu)
4. [Zmienne srodowiskowe](#zmienne-srodowiskowe)
5. [Development lokalny](#development-lokalny)
6. [Deploy na produkcje](#deploy-na-produkcje)
7. [Konfiguracja nginx](#konfiguracja-nginx)
8. [PM2 - zarzadzanie procesami](#pm2---zarzadzanie-procesami)
9. [Google Maps API](#google-maps-api)
10. [Panel admina](#panel-admina)
11. [API Endpoints](#api-endpoints)
12. [Bezpieczenstwo](#bezpieczenstwo)
13. [SEO](#seo)
14. [Troubleshooting](#troubleshooting)

---

## Architektura

```
polacyszwajcaria.com/                  -> WordPress (glowna strona)
polacyszwajcaria.com/uslugi/           -> Next.js Katalog (ta aplikacja)
polacyszwajcaria.com/uslugi/firma/...  -> Strony firm
polacyszwajcaria.com/uslugi/dodaj      -> Formularz dodawania
polacyszwajcaria.com/uslugi/admin      -> Panel admina
polacyszwajcaria.com/api/...           -> FastAPI Backend
```

```
                     nginx (reverse proxy)
                    /          |          \
                   /           |           \
          WordPress        Next.js 14     FastAPI
         (port 80)        (port 3000)    (port 8000)
           root /          /uslugi         /api
                               |            |
                               +--fetch---->+
                                  (SSR + client)
```

### Komponenty

| Komponent | Technologia | Port | Sciezka |
|-----------|-------------|------|---------|
| Glowna strona | WordPress | 80 | `/` |
| Frontend katalogu | Next.js 14 | 3000 | `/uslugi` |
| Backend API | FastAPI | 8000 | `/api` |

---

## Stack technologiczny

### Frontend
- **Next.js 14.2.4** - framework React z SSR
- **React 18.3.1** - biblioteka UI
- **TypeScript 5.5.3** - typy statyczne
- **TailwindCSS 3.4.4** - framework CSS (dark mode)
- **Google Maps** - interaktywna mapa + autocomplete adresow
- **@googlemaps/markerclusterer** - grupowanie markerow na mapie
- **react-hot-toast** - powiadomienia UI

### Backend
- **FastAPI 0.115.12** - framework API (Python)
- **Pydantic 2.10** - walidacja danych + schematy
- **uvicorn** - serwer ASGI
- **googlemaps 4.10** - geocoding adresow (lat/lng)
- **Pillow** - konwersja obrazow do WebP
- **bleach** - sanityzacja HTML (ochrona XSS)
- **slowapi** - rate limiting
- **bcrypt** - hashowanie hasel
- **PyJWT** - tokeny JWT

### Baza danych
- **JSON file-based** - dane przechowywane w plikach `.json`
- Pliki w `backend/data/`: companies.json, categories.json, reviews.json, users.json, stats.json, settings.json, reports.json
- Thread-safe z `threading.RLock()`
- Atomiczne zapisy (temp file + replace)

### Serwer produkcyjny
- **Ubuntu** (VPS)
- **nginx** - reverse proxy
- **PM2** - manager procesow
- **Let's Encrypt** - certyfikat SSL

---

## Struktura projektu

```
katalog-firm/
|-- backend/
|   |-- data/                    # Pliki bazy danych (JSON)
|   |   |-- companies.json       # Firmy (~21MB, zawiera base64 obrazy)
|   |   |-- categories.json      # Kategorie
|   |   |-- reviews.json         # Recenzje
|   |   |-- users.json           # Uzytkownicy
|   |   |-- stats.json           # Statystyki (views/clicks per dzien)
|   |   |-- settings.json        # Ustawienia (social media, sort order)
|   |   |-- reports.json         # Zgloszenia
|   |   |-- ip_blacklist.txt     # Zablokowane IP
|   |-- routers/
|   |   |-- admin.py             # Endpointy admina
|   |   |-- auth.py              # Rejestracja/logowanie
|   |   |-- categories.py        # Kategorie CRUD
|   |   |-- companies.py         # Firmy CRUD (glowny zasob)
|   |   |-- reviews.py           # Recenzje
|   |   |-- reports.py           # Zgloszenia
|   |-- main.py                  # Punkt wejscia FastAPI
|   |-- settings.py              # Konfiguracja (env vars)
|   |-- schemas.py               # Modele Pydantic
|   |-- security.py              # Hashowanie hasel (bcrypt)
|   |-- security_middleware.py   # Rate limiting, sanityzacja
|   |-- ip_blacklist.py          # Middleware blokowania IP
|   |-- geocoding.py             # Google Maps geocoding
|   |-- image_utils.py           # Konwersja obrazow (WebP)
|   |-- storage.py               # Warstwa bazy danych (JSON)
|   |-- requirements.txt         # Zaleznosci Python
|   |-- .env                     # Zmienne srodowiskowe (NIE COMMITOWAC!)
|   |-- .env.example             # Szablon zmiennych
|
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- page.tsx             # Strona glowna (mapa + lista firm)
|   |   |   |-- layout.tsx           # Root layout (SEO, JSON-LD)
|   |   |   |-- AppShell.tsx         # Header, footer, cookie banner
|   |   |   |-- sitemap.ts           # Dynamiczny sitemap
|   |   |   |-- dodaj/page.tsx       # Formularz dodawania firmy (4 kroki)
|   |   |   |-- admin/page.tsx       # Panel admina
|   |   |   |-- firma/[slug]/        # Strona firmy (SSR + metadata)
|   |   |   |-- edycja/[token]/      # Edycja firmy przez token
|   |   |   |-- login/page.tsx       # Logowanie uzytkownika
|   |   |   |-- konto/               # Panel uzytkownika
|   |   |   |-- ulubione/page.tsx    # Ulubione firmy
|   |   |   |-- kategoria/[slug]/    # Filtr po kategorii (SSR metadata)
|   |   |   |-- polityka-prywatnosci/ # Polityka prywatnosci
|   |   |-- hooks/
|   |   |   |-- useFavorites.ts      # Hook ulubionych (localStorage)
|   |   |-- components/
|   |       |-- ErrorBoundary.tsx     # Obsluga bledow
|   |-- public/
|   |   |-- favicon.ico              # Ikona przegladarki
|   |   |-- favicon.svg              # Ikona SVG
|   |   |-- icon.png                 # Ikona 512x512 (apple-touch-icon)
|   |   |-- logo.png                 # Logo (Open Graph, sharing)
|   |   |-- default-company.png      # Domyslne zdjecie firmy
|   |   |-- manifest.json            # PWA manifest (mobile)
|   |   |-- robots.txt               # Reguly dla crawlerow
|   |-- next.config.mjs              # Konfiguracja Next.js
|   |-- tailwind.config.cjs          # Konfiguracja Tailwind
|   |-- tsconfig.json                # Konfiguracja TypeScript
|   |-- package.json                 # Zaleznosci Node.js
|   |-- .env.local                   # Zmienne srodowiskowe (NIE COMMITOWAC!)
|   |-- .env.example                 # Szablon zmiennych
|
|-- run/
|   |-- run_backend.bat              # Skrypt startowy backendu (Windows)
|   |-- run_frontend.bat             # Skrypt startowy frontendu (Windows)
|
|-- .gitignore                       # Ignorowane pliki
|-- README.md                        # Ten plik
```

---

## Zmienne srodowiskowe

### Backend (`backend/.env`)

| Zmienna | Wymagana | Opis | Przyklad |
|---------|----------|------|----------|
| `ADMIN_PASSWORD` | **TAK** | Haslo do panelu admina | `MojeSilneHaslo123!` |
| `SECRET_KEY` | **TAK** | Klucz do podpisywania tokenow JWT (min. 32 znaki) | `wygeneruj-losowy-string` |
| `GOOGLE_MAPS_API_KEY` | **TAK** | Klucz API Google Maps (geocoding adresow) | `AIzaSy...` |
| `CORS_ORIGINS` | TAK (prod) | Dozwolone domeny (w produkcji NIE `*`) | `https://polacyszwajcaria.com` |
| `DEBUG` | NIE | Tryb debug (domyslnie `False`) | `False` |
| `MAPBOX_TOKEN` | NIE | Token Mapbox (nieuzywany, opcja zastepcza) | - |

**Szablon `backend/.env`:**
```bash
# === WYMAGANE NA SERWERZE ===
ADMIN_PASSWORD=twoje_silne_haslo_admina
SECRET_KEY=wygeneruj_losowy_string_min_32_znakow
GOOGLE_MAPS_API_KEY=AIzaSy_twoj_klucz_google_maps

# === PRODUKCJA ===
DEBUG=False
CORS_ORIGINS=https://polacyszwajcaria.com

# === OPCJONALNE ===
MAPBOX_TOKEN=
```

**Generowanie SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend (`frontend/.env.local`)

| Zmienna | Wymagana | Opis | Przyklad |
|---------|----------|------|----------|
| `NEXT_PUBLIC_API_URL` | **TAK** | URL backendu API | `https://polacyszwajcaria.com/api` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | **TAK** | Klucz API Google Maps (mapa + autocomplete) | `AIzaSy...` |

**Szablon `frontend/.env.local`:**
```bash
# === PRODUKCJA ===
NEXT_PUBLIC_API_URL=https://polacyszwajcaria.com/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy_twoj_klucz_google_maps

# === DEVELOPMENT ===
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy_twoj_klucz_google_maps
```

### Uwaga o OpenAI

**OpenAI NIE jest uzywane w tym projekcie.** Nie ma zadnej integracji z GPT/OpenAI. Jesli w przyszlosci bedzie potrzebna, nalezy dodac `openai` do `requirements.txt` i zmienna `OPENAI_API_KEY` do `.env`.

---

## Development lokalny

### Wymagania
- **Python 3.10+** (testowane na 3.14)
- **Node.js 18+**
- **npm**

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/Pawelpoprawski/katalog-firm.git
cd katalog-firm
```

### 2. Backend

```bash
# Utworz virtual environment
cd backend
python3 -m venv venv

# Aktywuj (Linux/Mac)
source venv/bin/activate
# Aktywuj (Windows)
venv\Scripts\activate

# Zainstaluj zaleznosci
pip install -r requirements.txt

# Skopiuj i uzupelnij .env
cp .env.example .env
# Edytuj .env - ustaw ADMIN_PASSWORD, SECRET_KEY, GOOGLE_MAPS_API_KEY

# Uruchom
cd ..
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend dostepny na: http://localhost:8000
Dokumentacja API (Swagger): http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

# Zainstaluj zaleznosci
npm install

# Skopiuj i uzupelnij .env.local
cp .env.example .env.local
# Edytuj .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_GOOGLE_MAPS_KEY=twoj_klucz

# Uruchom w trybie dev
npm run dev
```

Frontend dostepny na: http://localhost:3000

### Windows - szybki start

Uzyj skryptow w folderze `run/`:
```bash
# Terminal 1 - Backend
run\run_backend.bat

# Terminal 2 - Frontend
run\run_frontend.bat
```

---

## Deploy na produkcje

### Serwer

- **IP**: `51.75.141.194`
- **OS**: Ubuntu
- **User**: `ubuntu`
- **Domena**: `polacyszwajcaria.com`

### Wymagania na serwerze

```bash
# Zainstaluj Node.js 18+ (jesli nie ma)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Zainstaluj Python 3.10+
sudo apt-get install python3 python3-venv python3-pip

# Zainstaluj PM2
sudo npm install -g pm2

# Zainstaluj nginx (jesli nie ma)
sudo apt-get install nginx
```

### Krok po kroku - pierwszy deploy

```bash
# 1. Zaloguj sie na serwer
ssh ubuntu@51.75.141.194

# 2. Sklonuj repozytorium
cd /var/www
git clone https://github.com/Pawelpoprawski/katalog-firm.git
cd katalog-firm

# 3. Skonfiguruj backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Utworz plik .env z wymaganymi zmiennymi
cat > .env << 'EOF'
ADMIN_PASSWORD=TwojeSilneHasloAdmina123!
SECRET_KEY=wygeneruj_python3_-c_import_secrets_print_secrets.token_urlsafe_32
GOOGLE_MAPS_API_KEY=AIzaSy_twoj_klucz
DEBUG=False
CORS_ORIGINS=https://polacyszwajcaria.com
EOF

cd ..

# 5. Skonfiguruj frontend
cd frontend
npm install

# Utworz .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://polacyszwajcaria.com/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy_twoj_klucz
EOF

# Build produkcyjny
npm run build
cd ..

# 6. Uruchom z PM2
pm2 start "cd /var/www/katalog-firm && /var/www/katalog-firm/backend/venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000" --name katalog-backend

cd frontend
pm2 start npm --name katalog-frontend -- start
cd ..

# 7. Zapisz konfiguracje PM2 (auto-restart po reboot)
pm2 save
pm2 startup
```

### Kolejne deploye (aktualizacja kodu)

```bash
ssh ubuntu@51.75.141.194
cd /var/www/katalog-firm

# Pobierz zmiany
git pull origin main

# Jesli zmienily sie zaleznosci backendu:
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Jesli zmienily sie zaleznosci frontendu:
cd frontend
npm install

# Zawsze przebuduj frontend
npm run build
cd ..

# Restart procesow
pm2 restart katalog-backend
pm2 restart katalog-frontend
```

### Szybki deploy (tylko frontend, bez zmian zaleznosci)

```bash
ssh ubuntu@51.75.141.194
cd /var/www/katalog-firm
git pull
cd frontend && npm run build && pm2 restart katalog-frontend
```

---

## Konfiguracja nginx

Dodaj do konfiguracji nginx dla domeny `polacyszwajcaria.com`:

```nginx
server {
    listen 443 ssl;
    server_name polacyszwajcaria.com www.polacyszwajcaria.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/polacyszwajcaria.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/polacyszwajcaria.com/privkey.pem;

    # WordPress - glowna domena
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # Backend API dla katalogu
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Wiekszy limit dla uploadu obrazow (10MB)
        client_max_body_size 10M;
    }

    # Next.js Katalog - /uslugi
    location /uslugi {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js static assets
    location /_next {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        # Cache static files
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name polacyszwajcaria.com www.polacyszwajcaria.com;
    return 301 https://$server_name$request_uri;
}
```

**Testowanie i restart nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**SSL (Let's Encrypt):**
```bash
sudo certbot --nginx -d polacyszwajcaria.com -d www.polacyszwajcaria.com
```

---

## PM2 - zarzadzanie procesami

```bash
# Status wszystkich procesow
pm2 status

# Logi (na zywo)
pm2 logs katalog-frontend
pm2 logs katalog-backend

# Restart
pm2 restart katalog-frontend
pm2 restart katalog-backend
pm2 restart all

# Stop / Delete
pm2 stop katalog-frontend
pm2 delete katalog-backend

# Auto-restart po reboot serwera
pm2 startup
pm2 save

# Monitoring zasobow (CPU, RAM)
pm2 monit
```

---

## Google Maps API

### Jak uzyskac klucz API

1. Wejdz na **Google Cloud Console**: https://console.cloud.google.com
2. Utworz nowy projekt lub wybierz istniejacy
3. Wlacz wymagane APIs:
   - **Maps JavaScript API** - mapa na stronie glownej
   - **Places API** - autocomplete adresow w formularzach
   - **Geocoding API** - zamiana adresow na wspolrzedne (backend)
4. Przejdz do **APIs & Services** -> **Credentials**
5. Kliknij **Create Credentials** -> **API key**
6. Skopiuj wygenerowany klucz

### Zabezpieczenie klucza (WAZNE!)

1. Kliknij na klucz w liscie credentials
2. **Application restrictions** -> **HTTP referrers (web sites)**
3. Dodaj dozwolone domeny:
   ```
   https://polacyszwajcaria.com/*
   http://localhost:3000/*
   ```
4. **API restrictions** -> **Restrict key**
5. Zaznacz tylko:
   - Maps JavaScript API
   - Places API
   - Geocoding API
6. Zapisz

### Gdzie umiescic klucz

- **Frontend**: `frontend/.env.local` -> `NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...`
- **Backend**: `backend/.env` -> `GOOGLE_MAPS_API_KEY=AIzaSy...`

Mozna uzyc tego samego klucza w obu miejscach, ale dla lepszego bezpieczenstwa warto miec osobne klucze (frontend ograniczony do HTTP referrer, backend ograniczony do IP serwera).

---

## Panel admina

**URL**: https://polacyszwajcaria.com/uslugi/admin

**Logowanie**: Haslo ustawione w `ADMIN_PASSWORD` (plik `backend/.env`)

### Funkcje panelu admina

| Funkcja | Opis |
|---------|------|
| **Lista firm** | Przegladanie, filtrowanie, sortowanie |
| **Zmiana statusu** | draft / published |
| **Promowanie** | Wyroznienie firmy (is_promoted) |
| **Zmiana kategorii** | Przeniesienie do innej kategorii |
| **Edycja emaila** | Aktualizacja adresu email firmy |
| **Usuwanie firmy** | Trwale usuniecie |
| **Link edycji** | Kopiowanie tokena edycji firmy |
| **Lista recenzji** | Przegladanie, usuwanie recenzji |
| **Blokowanie IP** | Dodawanie IP spamerow do blacklisty |
| **Kategorie** | Dodawanie/usuwanie kategorii (emoji + nazwa) |
| **Ustawienia** | Ilosc firm w newsletterze, sortowanie |
| **Statystyki** | Wykres aktywnosci (30 dni), totale |
| **Export CSV** | Lista emaili firm (do emailingu) |

### Token edycji firm

- Kazda firma dostaje unikalny `edit_token` przy dodaniu
- Link edycji: `/uslugi/edycja/[TOKEN]`
- Token widoczny w panelu admina (mozna kopiowac i wyslac wlascicielowi)
- **NIE udostepniaj tokenow publicznie!**

---

## API Endpoints

Pelna dokumentacja interaktywna: http://localhost:8000/docs (Swagger UI)

### Publiczne

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/health` | Health check |
| GET | `/settings` | Publiczne ustawienia (sort order, newsletter) |
| GET | `/categories` | Lista kategorii |
| GET | `/companies` | Lista firm (limit, category_id, status) |
| GET | `/companies/{id}` | Firma po ID |
| GET | `/companies/by-slug/{slug}` | Firma po slug (SEO) |
| GET | `/companies/by-token/{token}` | Firma po tokenie edycji |
| GET | `/companies/{id}/photo/{index}` | Zdjecie firmy |
| POST | `/companies` | Dodanie nowej firmy |
| PUT | `/companies/{id}` | Edycja firmy (wymaga edit_token) |
| DELETE | `/companies/{id}` | Usuniecie firmy (wymaga edit_token) |
| POST | `/companies/{id}/view` | Zliczenie wyswietlenia |
| POST | `/companies/{id}/click` | Zliczenie klikniecia |
| POST | `/companies/confirm` | Potwierdzenie aktywnosci firmy |
| GET | `/reviews` | Lista recenzji (company_id) |
| POST | `/reviews` | Dodanie recenzji (rating 1-5) |
| POST | `/reports` | Zgloszenie recenzji |
| POST | `/auth/register` | Rejestracja uzytkownika |
| POST | `/auth/login` | Logowanie |

### Admin (wymaga `Authorization: Bearer {ADMIN_PASSWORD}`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/admin/stats` | Statystyki (30 dni + totale) |
| GET | `/admin/companies` | Wszystkie firmy (z tokenami) |
| GET | `/admin/reviews` | Wszystkie recenzje |
| DELETE | `/admin/reviews/{id}` | Usuniecie recenzji |
| PATCH | `/admin/companies/{id}/status` | Zmiana statusu (draft/published) |
| PATCH | `/admin/companies/{id}/promote` | Toggle promowania |
| PATCH | `/admin/companies/{id}/category` | Zmiana kategorii |
| PATCH | `/admin/companies/{id}` | Edycja pol firmy |
| DELETE | `/admin/companies/{id}` | Usuniecie firmy |
| GET | `/admin/ip-blacklist` | Lista zablokowanych IP |
| POST | `/admin/ip-blacklist/add` | Zablokowanie IP |
| DELETE | `/admin/ip-blacklist/remove` | Odblokowanie IP |
| GET | `/admin/settings` | Ustawienia admina |
| PUT | `/admin/settings/social-media` | Aktualizacja social media |
| PUT | `/admin/settings/newsletter-count` | Ilosc firm w newsletterze |
| PUT | `/admin/settings/sort-order` | Sortowanie (newest/random/alphabetical) |
| GET | `/admin/categories` | Lista kategorii |
| POST | `/admin/categories` | Dodanie kategorii |
| PUT | `/admin/categories/{id}` | Edycja kategorii |
| DELETE | `/admin/categories/{id}` | Usuniecie kategorii |

---

## Bezpieczenstwo

### Zaimplementowane zabezpieczenia

| Zabezpieczenie | Opis |
|----------------|------|
| **Rate limiting** | slowapi - max 100 req/min per IP (domyslnie) |
| **IP Blacklist** | Middleware blokujace spamerow (admin zarzadza) |
| **CORS** | Ograniczenie do dozwolonych domen (ustaw w .env!) |
| **XSS Protection** | bleach sanityzacja HTML na wejsciu |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, HSTS, CSP |
| **Password Hashing** | bcrypt (bezposrednio, nie passlib) |
| **Edit Tokens** | secrets.token_urlsafe(32) - unikalne tokeny edycji |
| **Input Validation** | Pydantic: EmailStr, rating 1-5, min_length, etc. |
| **Image Validation** | Max 10MB, tylko JPG/PNG, auto-konwersja do WebP |
| **GZIP Compression** | Odpowiedzi > 1KB kompresowane (21MB -> ~3-5MB) |

### Wazne zasady bezpieczenstwa

1. **NIGDY nie ustawiaj `CORS_ORIGINS=*` na produkcji** - zawsze podaj dokladna domene
2. **NIGDY nie ustawiaj `DEBUG=True` na produkcji**
3. **Ustaw silne `ADMIN_PASSWORD`** - min. 12 znakow, litery + cyfry + znaki specjalne
4. **Wygeneruj losowy `SECRET_KEY`** - uzyj `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
5. **Ogranicz klucz Google Maps** - HTTP referrer + API restrictions
6. **Nie commituj plikow `.env`** - sa w `.gitignore`

---

## SEO

### Sitemap

- **Automatyczny**: Generowany dynamicznie przez Next.js
- **URL**: https://polacyszwajcaria.com/uslugi/sitemap.xml
- **Zawiera**: Strona glowna, strony firm, kategorie, formularz dodawania, polityka prywatnosci
- **Rewalidacja**: co 1 godzine

### Robots.txt

Plik `frontend/public/robots.txt` (serwowany automatycznie przez Next.js):
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Sitemap: https://polacyszwajcaria.com/uslugi/sitemap.xml
```

Dodatkowo na glownym serwerze WordPress (`/var/www/polacyszwajcaria.com/robots.txt`):
```
User-agent: *
Allow: /

Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /uslugi/admin/
Disallow: /uslugi/api/
Disallow: /uslugi/_next/

Sitemap: https://polacyszwajcaria.com/sitemap.xml
Sitemap: https://polacyszwajcaria.com/uslugi/sitemap.xml
```

### Metadata i Open Graph

Zaimplementowane na kazdej stronie:

| Strona | Metadata | Open Graph | Twitter Card |
|--------|----------|------------|--------------|
| Strona glowna (layout) | title, description, keywords, robots | og:title, og:image, og:url, og:locale | summary_large_image |
| Strona firmy (/firma/[slug]) | Dynamiczne per firma | Dynamiczne + zdjecie firmy | Dynamiczne |
| Kategoria (/kategoria/[slug]) | Dynamiczne per kategoria | Dynamiczne | Dynamiczne |
| Inne strony | Dziedziczone z layout | Dziedziczone z layout | Dziedziczone z layout |

- **og:image**: Absolutne URL (`https://polacyszwajcaria.com/uslugi/logo.png`)
- **theme-color**: `#E30613` (czerwony - kolor marki)
- **manifest.json**: PWA manifest dla mobilnych przegladarek

### Structured Data (JSON-LD)

Zaimplementowane automatycznie w `layout.tsx`:
- Schema.org Organization (nazwa, logo, social media)
- Schema.org WebSite (url, jezyk, wydawca)
- Schema.org LocalBusiness na stronach firm

### Google Search Console

1. Dodaj wlasciwosc: `polacyszwajcaria.com`
2. Przeslij oba sitemapy:
   - `https://polacyszwajcaria.com/sitemap.xml` (WordPress)
   - `https://polacyszwajcaria.com/uslugi/sitemap.xml` (Katalog)
3. Opcjonalnie dodaj kod weryfikacyjny do `frontend/.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_VERIFICATION=twoj_kod_weryfikacyjny
   ```

---

## Troubleshooting

### Next.js nie dziala na /uslugi

```bash
# Sprawdz czy basePath jest poprawny
grep basePath frontend/next.config.mjs
# Powinno byc: basePath: process.env.NODE_ENV === 'production' ? '/uslugi' : ''

# Sprawdz nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Restart
pm2 restart katalog-frontend
```

### 404 na API endpoints

```bash
# Sprawdz czy backend dziala
curl http://localhost:8000/health

# Sprawdz nginx proxy
sudo nginx -t

# Sprawdz CORS
grep CORS_ORIGINS backend/.env
```

### 422 przy edycji firmy (Field required: payload)

Frontend musi wysylac body w formacie:
```json
{
  "payload": {
    "name": "...",
    "email": "...",
    "...": "..."
  },
  "edit_token": "token_firmy"
}
```
**NIE** jako plaski obiekt. FastAPI z `Body(..., embed=True)` wymaga zagniezdzonej struktury.

### Obrazy sie nie laduja

```bash
# Sprawdz nginx dla /_next/static
sudo tail -f /var/log/nginx/error.log

# Przebuduj frontend
cd frontend && npm run build && pm2 restart katalog-frontend
```

### Brak mapy Google

1. Sprawdz klucz w `frontend/.env.local` (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`)
2. Sprawdz czy APIs sa wlaczone w Google Cloud Console
3. Sprawdz ograniczenia klucza (HTTP referrer musi zawierac twoja domene)
4. Sprawdz konsole przegladarki (F12 -> Console) na bledy Google Maps

### Backend nie startuje

```bash
# Sprawdz logi
pm2 logs katalog-backend

# Sprawdz czy .env istnieje
ls -la backend/.env

# Sprawdz czy venv jest aktywne
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

### Duzy rozmiar companies.json (~21MB)

To normalne - plik zawiera obrazy zakodowane w base64. Kompresja GZIP redukuje transfer do ~3-5MB. W przyszlosci mozna przeniesc obrazy do S3/CDN.

---

## Kluczowe URLs

| URL | Opis |
|-----|------|
| https://polacyszwajcaria.com | Glowna strona (WordPress) |
| https://polacyszwajcaria.com/uslugi | Katalog firm |
| https://polacyszwajcaria.com/uslugi/dodaj | Dodaj firme |
| https://polacyszwajcaria.com/uslugi/admin | Panel admina |
| https://polacyszwajcaria.com/uslugi/sitemap.xml | Sitemap katalogu |
| https://polacyszwajcaria.com/api/companies/ | API lista firm |
| https://polacyszwajcaria.com/api/docs | Swagger UI (jesli DEBUG=True) |

---

## License

Proprietary - Natalia & Pawel Poprawscy 2024-2026
