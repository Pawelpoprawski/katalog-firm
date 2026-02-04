# Katalog Firm - Polskie UsługiW Szwajcarii

## O Projekcie

Katalog polskich firm i usług w Szwajcarii działający jako subdirectory na **polacyszwajcaria.com/uslugi**.

Aplikacja oparta na Next.js 14 z backendem FastAPI, zintegrowana z główną stroną WordPress.

---

## Architektura Deployment

### Struktura Domeny

```
polacyszwajcaria.com/                  → WordPress (główna strona)
polacyszwajcaria.com/uslugi/          → Next.js Katalog (ta aplikacj a)
polacyszwajcaria.com/uslugi/firma/... → Strony firm
polacyszwajcaria.com/uslugi/dodaj     → Formularz dodawania
```

### Komponenty

1. **Frontend**: Next.js 14 (port 3000) - `/frontend`
2. **Backend**: FastAPI Python (port 8000) - `/backend`
3. **WordPress**: Główna domena (tradycyjny hosting)

---

## Wdrożenie Produkcyjne

### 1. Konfiguracja Serwera (nginx)

Dodaj do konfiguracji nginx dla `polacyszwajcaria.com`:

```nginx
# WordPress - główna domena
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
}

# Next.js Katalog - /uslugi
location /uslugi {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # WebSocket support
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
```

**Restart nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 2. Build i Deploy Frontend

```bash
cd frontend

# Zainstaluj zależności
npm install

# Build produkcyjny
npm run build

# Start w trybie produkcyjnym (PM2)
pm2 start npm --name "katalog-frontend" -- start
pm2 save
```

---

### 3. Deploy Backend

```bash
cd backend

# Utwórz wirtualne środowisko
python3 -m venv venv
source venv/bin/activate

# Zainstaluj zależności
pip install -r requirements.txt

# Uruchom z PM2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "katalog-backend"
pm2 save
```

---

### 4. Google Maps API - Konfiguracja

#### Jak uzyskać klucz API:

1. **Przejdź do Google Cloud Console**: https://console.cloud.google.com
2. **Utwórz nowy projekt** lub wybierz istniejący
3. **Włącz APIs**:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. **Utwórz credentials**:
   - W menu "APIs & Services" → "Credentials"
   - Kliknij "Create Credentials" → "API key"
   - Skopiuj wygenerowany klucz

#### Zabezpieczenie klucza API:

5. **Ogranicz klucz** (WAŻNE dla bezpieczeństwa):
   - Kliknij na klucz w liście
   - "Application restrictions" → wybierz "HTTP referrers (web sites)"
   - Dodaj dozwolone domeny:
     ```
     https://polacyszwajcaria.com/*
     http://localhost:3000/*
     ```
   - "API restrictions" → wybierz "Restrict key"
   - Zaznacz tylko potrzebne APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
   - Zapisz zmiany

6. **Dodaj klucz do .env.local**:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...your_key_here
   ```

---

### 5. Zmienne Środowiskowe


#### Frontend (.env.local)

```bash
# API Backend
NEXT_PUBLIC_API_URL=https://polacyszwajcaria.com/api

# Google Maps API (wymagane dla autocomplete adresów i mapy)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...your_key_here

# Google Search Console (opcjonalne)
NEXT_PUBLIC_GOOGLE_VERIFICATION=your_verification_code
```

#### Backend (.env)

```bash
# Database (obecnie JSON, nie używane)
DATABASE_URL=sqlite:///./companies.db

# CORS - WAŻNE! Ustaw dokładną domenę produkcyjną
CORS_ORIGINS=https://polacyszwajcaria.com

# Security - hasło admina (ustaw silne hasło!)
ADMIN_PASSWORD=your_strong_admin_password_here

# Secret key (generuj losowy)
SECRET_KEY=your_secret_key_here_generate_random
```

**Generowanie SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### 6. Security Best Practices ⚠️

#### Rate Limiting (już zaimplementowane)
- **Reviews**: Max 5/minutę per IP
- **Nowe firmy**: Max 3/godzinę per IP
- **IP Blacklist**: Admin może blokować spamerów

#### Admin Panel
- Dostęp tylko z hasłem (`ADMIN_PASSWORD` w .env)
- URL: `https://polacyszwajcaria.com/uslugi/admin`
- **Nigdy nie udostępniaj hasła publicznie!**

#### Upload Obrazów
- Max rozmiar: **10MB per obraz**
- Tylko JPG, PNG (auto-konwersja do WebP)
- Resize do max 1200px

#### Token Edycji
- Każda firma ma unikalny `edit_token`
- Wymagany do edycji/usuwania firmy
- Link edycji: `/uslugi/edycja/[TOKEN]`
- **NIE udostępniaj tokenów publicznie**

#### CORS
- W produkcji ustaw `CORS_ORIGINS` na dokładną domenę
- **NIE używaj** `CORS_ORIGINS=*` w produkcji!

---

### 7. SEO - Sitemaps i Robots.txt

#### Główny robots.txt (WordPress root)

Utwórz lub zaktualizuj `/var/www/polacyszwajcaria.com/robots.txt`:

```
User-agent: *
Allow: /

# WordPress admin
Disallow: /wp-admin/
Disallow: /wp-includes/

# Next.js Katalog admin
Disallow: /uslugi/admin/
Disallow: /uslugi/api/
Disallow: /uslugi/_next/

# Sitemaps
Sitemap: https://polacyszwajcaria.com/sitemap.xml
Sitemap: https://polacyszwajcaria.com/uslugi/sitemap.xml
```

#### Weryfikacja Sitemaps

```bash
# WordPress sitemap (generowany przez plugin Yoast/RankMath)
curl https://polacyszwajcaria.com/sitemap.xml

# Next.js katalog sitemap (automatyczny)
curl https://polacyszwajcaria.com/uslugi/sitemap.xml
```

---

### 6. Google Search Console

1. Dodaj właściwość: `polacyszwajcaria.com`
2. Prześlij **oba** sitemapy:
   - `https://polacyszwajcaria.com/sitemap.xml` (WordPress)
   - `https://polacyszwajcaria.com/uslugi/sitemap.xml` (Katalog)
3. Dodaj kod weryfikacyjny do `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_VERIFICATION=your_verification_code
   ```

---

### 7. SSL/HTTPS

Upewnij się że certyfikat SSL obejmuje główną domenę:

```bash
# Używając Certbot
sudo certbot --nginx -d polacyszwajcaria.com -d www.polacyszwajcaria.com
```

---

## Development Lokalny

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dostępne na: http://localhost:3000/uslugi
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# Dostępne na: http://localhost:8000
```

---

## Monitoring i Utrzymanie

### PM2 Commands

```bash
# Status wszystkich procesów
pm2 status

# Logi
pm2 logs katalog-frontend
pm2 logs katalog-backend

# Restart
pm2 restart katalog-frontend
pm2 restart katalog-backend

# Auto-restart po reboot
pm2 startup
pm2 save
```

### Update Aplikacji

```bash
# Pull latest changes
git pull origin main

# Frontend
cd frontend
npm install  # jeśli są nowe zależności
npm run build
pm2 restart katalog-frontend

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt  # jeśli są nowe zależności
pm2 restart katalog-backend
```

---

## Troubleshooting

### Problem: Next.js nie działa na /uslugi

**Rozwiązanie:**
- Sprawdź czy `basePath: '/uslugi'` jest w `next.config.mjs`
- Sprawdź nginx proxy_pass dla `/uslugi`
- Restart PM2: `pm2 restart katalog-frontend`

### Problem: 404 na API endpoints

**Rozwiązanie:**
- Sprawdź czy backend działa: `curl http://localhost:8000/companies/`
- Sprawdź nginx proxy_pass dla `/api`
- Sprawdź CORS_ORIGINS w backend/.env

### Problem: Sitemap nie generuje się

**Rozwiązanie:**
- Sprawdź czy backend API odpowiada
- Zobacz logi: `pm2 logs katalog-frontend`
- Odwiedź bezpośrednio: `curl https://polacyszwajcaria.com/uslugi/sitemap.xml`

### Problem: Obrazy się nie ładują

**Rozwiązanie:**
- Sprawdź nginx konfigurację dla `/_next/static`
- Rebuild frontend: `npm run build && pm2 restart katalog-frontend`

---

## Kluczowe URLs

- **Główna strona**: https://polacyszwajcaria.com
- **Katalog**: https://polacyszwajcaria.com/uslugi
- **Dodaj firmę**: https://polacyszwajcaria.com/uslugi/dodaj
- **Admin**: https://polacyszwajcaria.com/uslugi/admin
- **Sitemap**: https://polacyszwajcaria.com/uslugi/sitemap.xml
- **Robots**: https://polacyszwajcaria.com/uslugi/robots.txt
- **API**: https://polacyszwajcaria.com/api/companies/

---

## Stack Technologiczny

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: FastAPI, Python 3.10+, SQLite
- **Server**: nginx, PM2, Ubuntu
- **CMS**: WordPress (główna strona)

---

## Support

W razie problemów:
1. Sprawdź logi PM2: `pm2 logs`
2. Sprawdź nginx error log: `sudo tail -f /var/log/nginx/error.log`
3. Sprawdź status procesów: `pm2 status`

---

## License

Proprietary - Natalia & Paweł Poprawscy © 2024
