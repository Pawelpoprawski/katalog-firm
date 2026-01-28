#!/bin/bash

# Skrypt automatycznego deploymentu dla Katalog Firm
# Użycie: ./deploy.sh

set -e  # Zatrzymaj na błędach

echo "🚀 Rozpoczynam deployment Katalog Firm..."

# 1. Pobierz najnowszy kod z GitHub
echo "📥 Pobieranie kodu z GitHub..."
git stash  # Zachowaj lokalne zmiany (companies.json, stats.json)
git pull origin main

# 2. Przywróć lokalne dane
echo "💾 Przywracanie danych produkcyjnych..."
git stash pop || true  # Ignoruj błędy jeśli nie ma stasha

# 3. Rozwiąż konflikty automatycznie (zachowaj wersję lokalną dla plików danych)
if [ -f backend/data/companies.json ]; then
    git checkout --ours backend/data/companies.json 2>/dev/null || true
    git add backend/data/companies.json 2>/dev/null || true
fi

if [ -f backend/data/stats.json ]; then
    git checkout --ours backend/data/stats.json 2>/dev/null || true
    git add backend/data/stats.json 2>/dev/null || true
fi

# Commit merge jeśli trzeba
git commit -m "Merge: keep production data" 2>/dev/null || true

# 4. Buduj frontend
echo "🔨 Budowanie frontendu..."
cd frontend
npm run build
cd ..

# 5. Restart PM2
echo "🔄 Restartowanie aplikacji..."
pm2 restart all

# 6. Pokaż status
echo "✅ Deployment zakończony!"
echo ""
pm2 list
