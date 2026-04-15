# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polish business directory for Switzerland ("Katalog Firm Polonijnych w Szwajcarii"). Production URL: `https://katalog-firm.ch`

- **Backend**: FastAPI (Python), JSON file-based storage, port 8000
- **Frontend**: Next.js 14 App Router (TypeScript + Tailwind), port 3000
- **Production**: Ubuntu VPS (51.75.141.194), nginx reverse proxy, PM2 process manager

## Build & Run Commands

### Backend
```bash
cd "C:\REPO\Katalog firm"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd "C:\REPO\Katalog firm\frontend"
npm run dev      # Dev server on :3000
npm run build    # Production build (validates TypeScript)
npm run lint     # ESLint
```

### Production Deploy
Deploy script at `C:\Users\popra\fix_katalog.py` uses paramiko SSH to:
1. `git stash && git pull` on server
2. `pm2 restart katalog-backend`
3. `npm run build` in frontend
4. `pm2 restart katalog-frontend`

Run with: `"C:\Python314\python.exe" "C:\Users\popra\fix_katalog.py"`

## Architecture

### Backend Storage (No SQL Database)
All data lives in `backend/data/*.json` files. `backend/storage.py` provides thread-safe CRUD using `threading.RLock()` with atomic writes (temp file + rename). Key files:
- `companies.json` (~21MB, includes base64-encoded images)
- `categories.json`, `reviews.json`, `users.json`, `stats.json`, `analytics.json`, `settings.json`
- `ip_blacklist.txt` (one IP per line)

### Backend Routers
| Router | Prefix | Auth |
|--------|--------|------|
| `companies.py` | `/companies` | edit_token for PUT/DELETE |
| `categories.py` | `/categories` | Admin for writes |
| `admin.py` | `/admin` | `Authorization: Bearer {ADMIN_PASSWORD}` |
| `auth.py` | `/auth` | None |
| `reviews.py` | `/reviews` | None |
| `reports.py` | `/reports` | None |

### Frontend Pages
| Route | File | Rendering |
|-------|------|-----------|
| `/` | `page.tsx` | Client-side (Google Maps + company list) |
| `/firma/[slug]` | `firma/[slug]/page.tsx` + `CompanyPageClient.tsx` | SSR metadata, client interactivity |
| `/dodaj` | `dodaj/page.tsx` | Client (4-step wizard form) |
| `/edycja/[token]` | `edycja/[token]/page.tsx` | Client (token-based edit) |
| `/admin` | `admin/page.tsx` | Client (protected by password) |
| `/kategoria/[slug]` | `kategoria/[slug]/page.tsx` | SSR metadata |

### Middleware Stack (order matters in main.py)
1. IP Blacklist (blocks banned IPs)
2. Security Headers (CSP, HSTS, X-Frame-Options)
3. SlowAPI Rate Limiting
4. GZIP Compression (threshold: 1000 bytes)
5. CORS
6. Analytics (tracks unique IPs per day)
7. Cache-Control headers (5 min for GET endpoints)

## Key Patterns

### Company Edit Flow
Companies are edited via unique `edit_token` (not user login). PUT `/companies/{id}` expects `{payload: {...data}, edit_token: "..."}` because FastAPI uses `Body(..., embed=True)` for the token parameter.

### Admin Auth
All `/admin/*` endpoints require `Authorization: Bearer {ADMIN_PASSWORD}` header where ADMIN_PASSWORD comes from `backend/.env`.

### basePath
Next.js basePath is empty (app at root `/`). Configured in `next.config.mjs` via `NEXT_PUBLIC_BASE_PATH` env var.

### Image Handling
Images uploaded as base64, converted to WebP by `backend/image_utils.py` (max 10MB, 1200px, quality 85%). Stored inline in companies.json as data URIs.

### Analytics
Two separate tracking systems:
- **Per-company views/clicks**: `companies.json` fields, incremented by `/companies/{id}/view` and `/companies/batch-view` (Intersection Observer scroll impressions)
- **Global analytics**: `analytics.json` with daily impressions, unique IPs, new companies/reviews. Exposed via `GET /admin/analytics?days=30`

### Frontend Caching
Homepage uses stale-while-revalidate pattern: shows localStorage-cached data instantly, fetches fresh data in background. Cache keys: `swr_companies`, `swr_categories`, `swr_sort_order` (5 min TTL).

## Python Environment
- Only Python 3.14 available at `C:\Python314\python.exe`
- passlib is NOT compatible with bcrypt>=4.1 - project uses direct bcrypt
- Pillow won't build from pinned versions on 3.14 - use latest
- pydantic-core needs pre-built wheels on 3.14

## Common Gotchas
- `CompanyBase.email` is `Optional[str]` (not EmailStr) to prevent 500 errors when reading companies with invalid emails. `CompanyCreate.email` still uses EmailStr for input validation.
- Admin endpoints with `Body(..., embed=True)` require the parameter wrapped in its field name in the request body (e.g., `{status: "published"}` not just `"published"`).
- The `Company` type is defined locally in multiple frontend page files (page.tsx, ulubione, kategoria, etc.) - when adding fields, update all of them.
- Frontend build (`npm run build`) validates TypeScript strictly - always build before deploying.
- Production server may have local changes - deploy script uses `git stash && git pull`.
