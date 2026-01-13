#!/bin/bash
# ============================================
# DEPLOYMENT SCRIPT - Katalog Firm
# ============================================
# Użycie:
# 1. SSH do serwera: ssh ubuntu@51.75.141.194
# 2. Wklej lub uruchom ten skrypt
# ============================================

APP_DIR="/var/www/katalog-firm"
GITHUB_TOKEN="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"
REPO_URL="https://$GITHUB_TOKEN@github.com/Pawelpoprawski/katalog-firm.git"

echo "=== 🚀 DEPLOY KATALOG FIRM ==="

# === 1) PIERWSZY RAZ - KLONOWANIE REPO ===
if [ ! -d "$APP_DIR" ]; then
    echo "=== Klonuję repo (pierwszy raz) ==="
    sudo mkdir -p /var/www
    cd /var/www
    sudo git clone $REPO_URL katalog-firm
    sudo chown -R ubuntu:ubuntu $APP_DIR
fi

# === 2) AKTUALIZACJA KODU ===
echo "=== Pobieram najnowszy kod z GitHub ==="
cd $APP_DIR
git pull $REPO_URL main

# === 3) BACKEND (Python / FastAPI) ===
echo "=== Konfiguruję Backend ==="
cd $APP_DIR/backend

# Tworzenie venv jeśli nie istnieje
if [ ! -d "venv" ]; then
    echo "Tworzę virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
deactivate

# Tworzenie pliku .env jeśli nie istnieje
if [ ! -f ".env" ]; then
    echo "⚠️ Tworzę plik .env - UZUPEŁNIJ WARTOŚCI!"
    cat > .env << 'EOF'
ADMIN_PASSWORD=ZMIEN_NA_SILNE_HASLO
GOOGLE_MAPS_API_KEY=AIzaSyDutoIKo3R23WjktVnjj8FvqYMKicCgIuw
DEBUG=False
CORS_ORIGINS=https://katalog.twoja-domena.com
EOF
fi

# Restart backendu przez PM2
pm2 delete katalog-api 2>/dev/null || true
cd $APP_DIR
pm2 start "cd backend && source venv/bin/activate && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001" --name katalog-api

# === 4) FRONTEND (Next.js) ===
echo "=== Konfiguruję Frontend ==="
cd $APP_DIR/frontend

# Tworzenie .env.local jeśli nie istnieje
if [ ! -f ".env.local" ]; then
    echo "⚠️ Tworzę plik .env.local - UZUPEŁNIJ WARTOŚCI!"
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.katalog.twoja-domena.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyDutoIKo3R23WjktVnjj8FvqYMKicCgIuw
EOF
fi

npm install
npm run build

# Restart frontendu przez PM2
pm2 delete katalog-frontend 2>/dev/null || true
pm2 start "npm run start -- -p 3001" --name katalog-frontend --cwd $APP_DIR/frontend

# === 5) ZAPISZ KONFIGURACJĘ PM2 ===
pm2 save

# === 6) STATUS ===
echo ""
echo "=== 📊 STATUS PM2 ==="
pm2 status

echo ""
echo "=== ✅ DEPLOY ZAKOŃCZONY ==="
echo ""
echo "Backend:  http://localhost:8001"
echo "Frontend: http://localhost:3001"
echo ""
echo "⚠️ PAMIĘTAJ:"
echo "1. Uzupełnij /var/www/katalog-firm/backend/.env"
echo "2. Uzupełnij /var/www/katalog-firm/frontend/.env.local"
echo "3. Skonfiguruj nginx (poniżej przykład)"
echo ""
