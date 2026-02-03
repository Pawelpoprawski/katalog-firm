#!/bin/bash

# Deploy script dla Katalog Firm na polacyszwajcaria.com/uslugi
# Użycie: ./deploy.sh

set -e  # Exit on error

echo "🚀 === Deploy Katalog Firm ===" 
echo ""

# Kolory dla outputu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Katalog projektu (dostosuj do swojej ścieżki)
PROJECT_DIR="/var/www/katalog-firm"

echo -e "${YELLOW}📂 Przechodzę do katalogu projektu...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}📥 Git pull (pobieranie zmian)...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}✅ Git pull zakończony${NC}"
echo ""

# Frontend
echo -e "${YELLOW}🎨 === Frontend ===${NC}"
cd $PROJECT_DIR/frontend

echo "📦 Instalacja zależności npm..."
npm install

echo "🏗️  Building Next.js..."
npm run build

echo "♻️  Restart PM2 frontend..."
pm2 restart katalog-frontend || pm2 start npm --name "katalog-frontend" -- start

echo ""
echo -e "${GREEN}✅ Frontend zaktualizowany${NC}"
echo ""

# Backend
echo -e "${YELLOW}⚙️  === Backend ===${NC}"
cd $PROJECT_DIR/backend

echo "🐍 Aktywacja virtualenv..."
source venv/bin/activate

echo "📦 Instalacja zależności Python..."
pip install -r requirements.txt --quiet

echo "♻️  Restart PM2 backend..."
pm2 restart katalog-backend

echo ""
echo -e "${GREEN}✅ Backend zaktualizowany${NC}"
echo ""

# Status
echo -e "${YELLOW}📊 Status PM2:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🎉 === Deploy zakończony pomyślnie! ===${NC}"
echo ""
echo "URL: https://polacyszwajcaria.com/uslugi"
echo ""
echo "Logi:"
echo "  Frontend: pm2 logs katalog-frontend"
echo "  Backend:  pm2 logs katalog-backend"
