# Deploy Guide — Katalog Firm

## Dane dostępowe

```
Serwer:  54.38.54.237 (OVH VPS, Warszawa, Ubuntu 25.04)
Domena:  katalog-firm.ch
User:    ubuntu
Hasło:   7QmK9xP2vLr8TzW4aNfC
SSL:     Let's Encrypt (auto-renew)
GitHub:  https://github.com/Pawelpoprawski/katalog-firm
```

## Struktura na serwerze

```
/home/ubuntu/strony/katalog_firm/
├── backend/
│   ├── .env                 # ADMIN_PASSWORD, SECRET_KEY, GOOGLE_MAPS_API_KEY
│   ├── venv/                # Python virtual environment
│   ├── data/                # JSON dane (firmy, kategorie, users)
│   └── ...
├── frontend/
│   ├── .env.local           # NEXT_PUBLIC_API_URL, GOOGLE_MAPS_KEY
│   ├── .next/               # Build output (generowany przez npm run build)
│   └── ...
└── ...
```

## Połączenie z serwerem

### Ręcznie (terminal)
```bash
ssh ubuntu@54.38.54.237
# hasło: 7QmK9xP2vLr8TzW4aNfC
```

### Przez Python (paramiko) — tak robi Claude
```python
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('54.38.54.237', username='ubuntu', password='7QmK9xP2vLr8TzW4aNfC')

stdin, stdout, stderr = ssh.exec_command('pm2 list')
print(stdout.read().decode())

ssh.close()
```

## Deploy — krok po kroku

### 1. Commit + push (lokalnie)
```bash
cd "C:/REPO/Katalog firm"
git add <pliki>
git commit -m "opis zmian"
git push origin main
```

### 2. Na serwerze — git pull + rebuild + restart
```bash
ssh ubuntu@54.38.54.237

cd /home/ubuntu/strony/katalog_firm
git pull origin main

# Jeśli zmienił się backend:
pm2 restart katalog-backend

# Jeśli zmienił się frontend:
cd frontend
npm run build
pm2 restart katalog-frontend

# Jeśli zmienił się i backend i frontend:
cd /home/ubuntu/strony/katalog_firm/frontend
npm run build
pm2 restart all
```

### 3. Sprawdzenie czy działa
```bash
pm2 list                    # status procesów
pm2 logs katalog-backend    # logi backendu
pm2 logs katalog-frontend   # logi frontendu
curl https://katalog-firm.ch/health   # health check
```

## Kluczowe komendy

| Co | Komenda |
|---|---|
| **Status procesów** | `pm2 list` |
| **Restart backend** | `pm2 restart katalog-backend` |
| **Restart frontend** | `pm2 restart katalog-frontend` |
| **Restart oba** | `pm2 restart all` |
| **Logi na żywo** | `pm2 logs` |
| **Logi backend** | `pm2 logs katalog-backend --lines 50` |
| **Logi frontend** | `pm2 logs katalog-frontend --lines 50` |
| **Nginx test** | `sudo nginx -t` |
| **Nginx reload** | `sudo systemctl reload nginx` |
| **Firewall status** | `sudo ufw status` |
| **SSL odnów ręcznie** | `sudo certbot renew` |
| **Wyczyść nginx cache** | `sudo rm -rf /var/cache/nginx/katalog/*` |

## Zmienne środowiskowe

### Backend (`backend/.env`)
```
ADMIN_PASSWORD=Nutella144.
SECRET_KEY=mwqRiD9rW27eTXOZY3q1PFvEOGneqUeJTXqb5Skhaew
GOOGLE_MAPS_API_KEY=AIzaSyDutoIKo3R23WjktVnjj8FvqYMKicCgIuw
DEBUG=False
CORS_ORIGINS=https://katalog-firm.ch,https://www.katalog-firm.ch
```

| Zmienna | Do czego | Jak zmienić |
|---------|----------|-------------|
| `ADMIN_PASSWORD` | Hasło do panelu admina (`/admin`) | Zmień w .env, restart backend |
| `SECRET_KEY` | Podpisywanie tokenów JWT (logowanie użytkowników) | `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `GOOGLE_MAPS_API_KEY` | Geocoding adresów (backend) | Google Cloud Console → Credentials |
| `DEBUG` | Tryb debug (True = verbose errors, NIE na produkcji) | Zawsze `False` na serwerze |
| `CORS_ORIGINS` | Dozwolone domeny (ochrona przed CSRF) | Dodaj nowe domeny oddzielone przecinkiem |

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=https://katalog-firm.ch/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyDutoIKo3R23WjktVnjj8FvqYMKicCgIuw
NEXT_PUBLIC_BASE_PATH=
```

| Zmienna | Do czego | Jak zmienić |
|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL backendu API | Zmień + `npm run build` + restart frontend |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Mapa Google na stronie | Google Cloud Console → Credentials |
| `NEXT_PUBLIC_BASE_PATH` | Prefix ścieżki (puste = root `/`, `/uslugi` = subdirectory) | Zmień + `npm run build` + restart frontend |

**WAŻNE:** Po zmianie `.env` backendu → `pm2 restart katalog-backend`
**WAŻNE:** Po zmianie `.env.local` frontendu → `npm run build && pm2 restart katalog-frontend`

## Konfiguracja nginx

Plik: `/etc/nginx/sites-available/katalog-firm`

```bash
# Edycja
sudo nano /etc/nginx/sites-available/katalog-firm

# Test czy config OK
sudo nginx -t

# Załaduj zmiany
sudo systemctl reload nginx
```

Routing:
- `/api/*` → backend (FastAPI, port 8000) — nginx stripuje `/api` prefix
- `/health`, `/docs` → backend bezpośrednio
- `/_next/*` → frontend static assets (cache 365 dni)
- Wszystko inne → frontend (Next.js, port 3000)
- Cache API: 5 minut (nginx proxy_cache)

## Firewall (UFW)

```
Otwarte porty:
- 22/tcp  (SSH)
- 80/tcp  (HTTP → redirect do HTTPS)
- 443/tcp (HTTPS)

Zablokowane:
- 3000 (Next.js) — nie dostępny z zewnątrz
- 8000 (FastAPI) — nie dostępny z zewnątrz
```

## SSL (Let's Encrypt)

- Certyfikat: `/etc/letsencrypt/live/katalog-firm.ch/`
- Auto-renew: certbot timer (systemd)
- Ręczne odnowienie: `sudo certbot renew`

## Troubleshooting

### Frontend nie działa (502)
```bash
pm2 logs katalog-frontend --lines 30
# Jeśli "Could not find production build":
cd /home/ubuntu/strony/katalog_firm/frontend
npm run build
pm2 restart katalog-frontend
```

### Backend nie działa
```bash
pm2 logs katalog-backend --lines 30
# Sprawdź .env:
cat /home/ubuntu/strony/katalog_firm/backend/.env
pm2 restart katalog-backend
```

### Nginx nie działa
```bash
sudo nginx -t                    # test konfiguracji
sudo systemctl status nginx      # status
sudo journalctl -xeu nginx       # logi
```

### Wyczyść cache (jeśli stare dane)
```bash
sudo rm -rf /var/cache/nginx/katalog/*
sudo systemctl reload nginx
```
