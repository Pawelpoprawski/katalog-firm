# Instrukcje Deploy na Serwer

## Pierwsza Konfiguracja (Jednorazowo)

### 1. Połącz się z serwerem SSH

```bash
ssh user@polacyszwajcaria.com
```

### 2. Sklonuj repozytorium (jeśli jeszcze nie ma)

```bash
cd /var/www
git clone https://github.com/Pawelpoprawski/katalog-firm.git
cd katalog-firm
```

### 3. Setup Frontend

```bash
cd /var/www/katalog-firm/frontend

# Zainstaluj zależności
npm install

# Utwórz plik .env.local
nano .env.local
```

Wklej:
```
NEXT_PUBLIC_API_URL=https://polacyszwajcaria.com/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key
```

```bash
# Build
npm run build

# Uruchom PM2
pm2 start npm --name "katalog-frontend" -- start
pm2 save
```

### 4. Setup Backend

```bash
cd /var/www/katalog-firm/backend

# Utwórz virtualenv
python3 -m venv venv
source venv/bin/activate

# Zainstaluj zależności
pip install -r requirements.txt

# Utwórz plik .env
nano .env
```

Wklej:
```
DATABASE_URL=sqlite:///./companies.db
CORS_ORIGINS=https://polacyszwajcaria.com
SECRET_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password
```

```bash
# Uruchom PM2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "katalog-backend"
pm2 save
```

### 5. Konfiguracja nginx

```bash
sudo nano /etc/nginx/sites-available/polacyszwajcaria.com
```

Dodaj (zobacz README.md dla pełnej konfiguracji):
```nginx
# Next.js /uslugi
location /uslugi {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
}

# Backend API
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

```bash
# Test i reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## Normalne Wdrożenie (Każda Aktualizacja)

### Opcja 1: Automatyczny Skrypt (ZALECANE)

```bash
# Połącz się z serwerem
ssh user@polacyszwajcaria.com

# Przejdź do projektu
cd /var/www/katalog-firm

# Uruchom skrypt deploy
chmod +x deploy.sh  # Tylko pierwszego razu
./deploy.sh
```

### Opcja 2: Ręcznie Krok po Kroku

```bash
# Połącz się z serwerem
ssh user@polacyszwajcaria.com

# 1. Git pull
cd /var/www/katalog-firm
git pull origin main

# 2. Frontend
cd frontend
npm install
npm run build
pm2 restart katalog-frontend

# 3. Backend
cd ../backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart katalog-backend

# 4. Sprawdź status
pm2 status
pm2 logs katalog-frontend --lines 50
pm2 logs katalog-backend --lines 50
```

---

## Szybkie Komendy

### Sprawdzanie Statusu

```bash
# PM2 status
pm2 status

# Logi real-time
pm2 logs

# Logi tylko frontend
pm2 logs katalog-frontend

# Logi tylko backend
pm2 logs katalog-backend
```

### Restart Procesów

```bash
# Restart wszystkiego
pm2 restart all

# Restart tylko frontend
pm2 restart katalog-frontend

# Restart tylko backend
pm2 restart katalog-backend
```

### Sprawdzanie nginx

```bash
# Test konfiguracji
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Logi nginx errors
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Problem: PM2 processes nie startują

```bash
# Zatrzymaj wszystko
pm2 kill

# Uruchom ponownie
cd /var/www/katalog-firm/frontend
pm2 start npm --name "katalog-frontend" -- start

cd ../backend
source venv/bin/activate
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "katalog-backend"

pm2 save
```

### Problem: Port już zajęty

```bash
# Sprawdź co używa portu 3000
sudo lsof -i :3000

# Sprawdź co używa portu 8000
sudo lsof -i :8000

# Zabij proces (zastąp PID)
kill -9 PID
```

### Problem: Git conflicts

```bash
cd /var/www/katalog-firm

# Zapisz lokalne zmiany
git stash

# Pull
git pull origin main

# Przywróć lokalne zmiany (opcjonalnie)
git stash pop
```

### Problem: 502 Bad Gateway

```bash
# Sprawdź czy PM2 działa
pm2 status

# Sprawdź logi
pm2 logs

# Sprawdź nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## Monitoring

### Setup PM2 Monitoring (Opcjonalnie)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monit web interface
pm2 web
```

---

## Backup Bazy Danych

```bash
# Backup SQLite
cd /var/www/katalog-firm/backend
cp companies.db companies.db.backup.$(date +%Y%m%d)

# Automatyczny backup (dodaj do crontab)
crontab -e

# Dodaj linię:
# 0 2 * * * cp /var/www/katalog-firm/backend/companies.db /var/www/katalog-firm/backend/backups/companies.db.$(date +\%Y\%m\%d)
```

---

## Przydatne Aliasy (Opcjonalnie)

Dodaj do `~/.bashrc`:

```bash
alias katalog='cd /var/www/katalog-firm'
alias katalog-deploy='cd /var/www/katalog-firm && ./deploy.sh'
alias katalog-logs='pm2 logs'
alias katalog-status='pm2 status'
```

Następnie:
```bash
source ~/.bashrc
```
