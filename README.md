# Katalog Firm Polonijnych w Szwajcarii

Aplikacja do katalogowania polskich usług w Szwajcarii z mapą, recenzjami i panelem administracyjnym.

---

## 🚀 Deployment - Zmienne Środowiskowe

### KRYTYCZNE - Przed wdrożeniem na produkcję ustaw te zmienne!

#### Backend (`backend/.env`)

Utwórz plik `backend/.env` z następującymi zmiennymi:

```env
# WYMAGANE - Hasło do panelu admin (USTAW SILNE HASŁO!)
ADMIN_PASSWORD=TwojeSuperbezpieczneHaslo123!

# WYMAGANE - Klucz API Google Maps (do geokodowania i mapy)
GOOGLE_MAPS_API_KEY=AIzaSy...TwojKluczGoogleMaps

# ZALECANE - Konfiguracja produkcyjna
DEBUG=False
CORS_ORIGINS=https://twoja-domena.com,https://www.twoja-domena.com

# OPCJONALNE - Token Mapbox
MAPBOX_TOKEN=pk.eyJ1...TwojTokenMapbox
```

#### Frontend (`frontend/.env.local`)

```env
# URL do backendu (zmień na produkcyjny URL)
NEXT_PUBLIC_API_URL=https://api.twoja-domena.com

# Klucz Google Maps (UWAGA: nazwa bez "_API" - to jest poprawna nazwa!)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...TwojKluczGoogleMaps
```

> ⚠️ **Ważne**: Zmienne środowiskowe systemu mają priorytet nad plikiem `.env`. Jeśli w terminalu jest ustawiona zmienna (np. poprzez `$env:ADMIN_PASSWORD`), to ona będzie użyta zamiast wartości z pliku.

---

## 🔐 Bezpieczeństwo

### Panel Administratora
- URL: `/admin`
- Wymaga hasła ustawionego w `ADMIN_PASSWORD`
- Hasło przechowywane w sessionStorage (czyści się po zamknięciu przeglądarki)

### Zmienne Środowiskowe na Serwerze

#### Linux/Ubuntu (systemd service)
```bash
# W pliku /etc/systemd/system/katalog-backend.service
[Service]
Environment="ADMIN_PASSWORD=TwojeHaslo"
Environment="GOOGLE_MAPS_API_KEY=AIzaSy..."
Environment="DEBUG=False"
Environment="CORS_ORIGINS=https://twoja-domena.com"
```

#### Docker
```yaml
# W docker-compose.yml
services:
  backend:
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
      - DEBUG=False
      - CORS_ORIGINS=https://twoja-domena.com
```

#### Vercel/Netlify (Frontend)
Ustaw zmienne w panelu administracyjnym platformy:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

---

## 🏃 Uruchomienie lokalne

### Backend
```bash
cd backend
pip install -r requirements.txt
# Ustaw zmienne w .env (skopiuj z .env.example)
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
# Ustaw zmienne w .env.local
npm run dev
```

Backend: `http://localhost:8000`
Frontend: `http://localhost:3000`

---

## ⚠️ Checklist przed wdrożeniem

- [ ] **ADMIN_PASSWORD** ustawione na silne hasło (min. 12 znaków)
- [ ] **GOOGLE_MAPS_API_KEY** ustawiony i ograniczony do Twojej domeny
- [ ] **DEBUG=False** w produkcji
- [ ] **CORS_ORIGINS** ustawione na konkretne domeny (NIE `*`)
- [ ] Plik `.env` NIGDY nie jest commitowany do repozytorium
- [ ] Certyfikat SSL/TLS (HTTPS) skonfigurowany
- [ ] Rate limiting włączony (już zaimplementowany)

---

## 📁 Struktura projektu

```
Katalog firm/
├── backend/
│   ├── data/              # Dane JSON (companies, reviews, categories)
│   ├── routers/           # Endpointy API
│   ├── main.py           # Główny plik FastAPI
│   ├── settings.py       # Konfiguracja z .env
│   ├── .env              # ⚠️ NIE COMMITUJ!
│   └── .env.example      # Szablon zmiennych
├── frontend/
│   ├── src/app/          # Strony Next.js
│   └── .env.local        # ⚠️ NIE COMMITUJ!
└── .gitignore            # Chroni przed commitowaniem .env
```

---

## 🔧 API Endpoints

### Publiczne
- `GET /companies` - Lista firm
- `GET /categories` - Lista kategorii
- `POST /companies` - Dodaj firmę
- `POST /reviews` - Dodaj recenzję

### Admin (wymaga hasła w nagłówku Authorization)
- `GET /admin/stats` - Statystyki
- `GET /admin/companies` - Lista firm z tokenami edycji
- `DELETE /admin/companies/{id}` - Usuń firmę
- `PATCH /admin/companies/{id}/promote` - Promocja firmy
- `GET/POST/DELETE /admin/categories` - Zarządzanie kategoriami

### Newsletter
- `GET /companies/random?count=5` - Losowe firmy dla newslettera
- `GET /companies/{id}/photo` - Główne zdjęcie firmy jako obrazek

---

## 📤 Git - Wysyłanie zmian na GitHub

### Pierwsze użycie (jeśli repo nie jest skonfigurowane)
```bash
cd "c:\REPO\Katalog firm"
git init
git remote add origin https://github.com/Pawelpoprawski/katalog-firm.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### Codzienne wysyłanie zmian
```bash
cd "c:\REPO\Katalog firm"
git add .
git commit -m "Opis zmian"
git push
```

### Szybkie komendy (skopiuj i wklej)
```powershell
# Wyślij wszystkie zmiany na GitHub
cd "c:\REPO\Katalog firm"; git add .; git commit -m "Update"; git push
```

### Rozwiązywanie konfliktów plików danych (stats/companies)
Jeśli na serwerze wystąpi błąd `Your local changes to the following files would be overwritten by merge`, wykonaj:
```bash
git checkout --theirs backend/data/stats.json
git add backend/data/stats.json backend/data/companies.json
git commit -m "Zachowanie danych serwera przed pull"
git pull
```

---

### 🚀 Deployment - Server-side Fixes (Ubuntu)

If you encounter Git conflicts or "Load failed" (CORS) errors on production, follow these steps:

1. **Resolve Git Conflict (Server Data vs Repo)**:
   ```bash
   cd /var/www/katalog-firm
   # Backup data just in case
   cp backend/data/companies.json backend/data/companies.json.bak
   # Overwrite server stat files with repo versions to allow pull
   git checkout --theirs backend/data/stats.json
   git add backend/data/stats.json backend/data/companies.json
   git commit -m "Resolve data conflicts for production"
   git pull
   ```

2. **Fix CORS_ORIGINS (Backend)**:
   ```bash
   # Edit the backend environment file
   nano /var/www/katalog-firm/backend/.env
   ```
   Ensure the `CORS_ORIGINS` line matches your production domains:
   ```text
   CORS_ORIGINS=https://poprawskipawel.com,https://www.poprawskipawel.com
   ```

3. **Rebuild Frontend & Restart**:
   ```bash
   cd /var/www/katalog-firm/frontend && npm run build
   pm2 restart katalog-api katalog-frontend
   ```

---

## 🌐 Zmiana domeny (PROD deployment)

Jeśli zmieniasz domenę (np. z `katalog-firm.com` na `poprawskipawel.com`), musisz zaktualizować poniższe pliki:

### 1. Backend - `backend/.env`
```env
CORS_ORIGINS=https://TWOJA-DOMENA.com,https://www.TWOJA-DOMENA.com
```

### 2. Frontend - `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.TWOJA-DOMENA.com
```

### 3. SEO/Robots - `frontend/public/robots.txt`
```txt
Sitemap: https://TWOJA-DOMENA.com/sitemap.xml
```

### 4. Sitemap - `frontend/src/app/sitemap.ts`
Linia 4:
```typescript
const baseUrl = "https://TWOJA-DOMENA.com";
```

### 5. Metadata SEO - `frontend/src/app/layout.tsx`
Zmień wszystkie wystąpienia URL w obiekcie `metadata`:
```typescript
metadataBase: new URL('https://TWOJA-DOMENA.com'),
// ...
url: "https://TWOJA-DOMENA.com",
// ...
canonical: "https://TWOJA-DOMENA.com",
```

### 6. (Opcjonalnie) AppShell - `frontend/src/app/AppShell.tsx`
Jeśli link do PolacySzwajcaria.com ma być inny.

### Checklist przy zmianie domeny:
- [ ] `backend/.env` - CORS_ORIGINS
- [ ] `frontend/.env.local` - NEXT_PUBLIC_API_URL
- [ ] `frontend/public/robots.txt` - Sitemap URL
- [ ] `frontend/src/app/sitemap.ts` - baseUrl
- [ ] `frontend/src/app/layout.tsx` - metadataBase, url, canonical
- [ ] Nginx - konfiguracja domen
- [ ] SSL certyfikaty (Certbot)
- [ ] DNS rekordy (A, CNAME dla www i api)

### Komendy na serwerze po zmianach:
```bash
cd /var/www/katalog-firm
git pull
cd frontend && npm run build
pm2 restart katalog-api katalog-frontend
```
