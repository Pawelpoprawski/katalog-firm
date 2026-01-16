#!/bin/bash
# Deployment script for Katalog Firm updates
# Run this on your server to update the application

set -e  # Exit on error

echo "🚀 Starting deployment..."

# 1. Navigate to project directory
cd ~/Katalog-firm || { echo "❌ Project directory not found"; exit 1; }

# 2. Pull latest changes from GitLab
echo "📥 Pulling latest changes from GitLab..."
git pull origin main

# 3. Backend updates
echo "🔧 Updating backend..."
cd backend

# Install any new Python dependencies
pip install -r requirements.txt --user

# 4. Reimport companies with new city/canton parsing
echo "📦 Reimporting companies with address parsing..."
cd ..
python3 import_uslugi.py

# 5. Frontend updates
echo "🎨 Updating frontend..."
cd frontend

# Install any new npm dependencies
npm install

# Build production frontend
echo "🏗️  Building frontend..."
npm run build

# 6. Restart services
echo "🔄 Restarting services..."
cd ..

# Restart backend (assuming PM2)
pm2 restart backend

# Restart frontend (assuming PM2)
pm2 restart frontend

# 7. Verify services are running
echo "✅ Checking service status..."
pm2 status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Changes deployed:"
echo "  ✓ Admin panel improvements (numbering, category dropdown, Edit button)"
echo "  ✓ Address display fixed on company cards"
echo "  ✓ Company count sync between hero and results"
echo "  ✓ Hydration error fixed"
echo "  ✓ Random sorting with promoted companies priority"
echo "  ✓ Sort order settings (newest/random/alphabetical)"
echo "  ✓ Offer HTML rendering fixed"
echo "  ✓ Default company placeholder added"
echo "  ✓ 100 companies reimported with proper addresses"
echo ""
echo "🌐 Application should now be running with all updates!"
