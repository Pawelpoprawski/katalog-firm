# POWIAZANIA - Katalog firm (repo `katalog-firm`)

> **Przeczytaj przed każdą zmianą.** Ten plik + nagłówki `POWIĄZANIA` na górze każdego pliku mówią, co jeszcze
> trzeba zmienić, gdy zmieniasz jedną rzecz. Część automatyczną (sekcja 7) generuje `python scripts/powiazania.py`
> - uruchom go po każdej zmianie kodu. Zasady pracy: `CLAUDE.md`.

## 1. Gdzie to działa (stan od przeprowadzki 15.07.2026)

| Element | Lokalnie | Serwer | Proces / port | Adres |
|---|---|---|---|---|
| Backend FastAPI | `backend/` | `/home/ubuntu/strony/katalog_firm_psz` | pm2 `katalog-psz-backend` :8201 (`backend/venv/bin/python -m uvicorn backend.main:app`) | `/katalog-firm/api/*` -> :8201 |
| Frontend Next.js 14 (basePath `/katalog-firm`) | `frontend/` | `.../katalog_firm_psz/frontend` | pm2 `katalog-psz-frontend` :3201 | `/katalog-firm` |
| Dane (pliki JSON) | `backend/data/*.json` (poza gitem) | `.../katalog_firm_psz/backend/data` | - | - |
| Zdjęcia firm | `backend/static/images` | `.../katalog_firm_psz/backend/static/images` | - | `/katalog-firm/api/images/...` |

Stara domena `katalog-firm.ch` = 301 na `/katalog-firm`. Stara instancja `strony/katalog_firm` (pm2 `katalog-*`, stopped) nie jest używana.

## 2. Dane

Brak bazy SQL - `backend/storage.py` trzyma wszystko w plikach JSON (`companies`, `users`, `categories`, `reviews`,
`reports`, `stats`, `analytics`, `ai_search_log`, `settings`) z blokadą i cache 60 s, zapis atomowy (tmp + replace).
Ręczna edycja na serwerze: kopia `.bak`, edycja jednego pola, zapis atomowy, odczekaj 60 s. Backup: `web/scripts/backup.sh`
(`katalog-data.tar.gz`, `katalog-images.tar.gz`, `.env`).

## 3. Powiązania z innymi repo

| Kierunek | Mechanizm | Tutaj | Tam | Zmieniasz -> zmień też |
|---|---|---|---|---|
| portal -> katalog | `GET 127.0.0.1:8201/companies/`, `/categories/` | `backend/routers/companies.py`, `categories.py`, `schemas.py` | `web/src/lib/katalog.ts` (widget, strona główna, newsletter) | pola firmy: name, slug, img, kategoria, miasto |
| katalog -> portal | `GET 127.0.0.1:3200/api/menu/` (wspólne menu) | `frontend/src/app/layout.tsx`, `components/PortalBar.tsx` | `web/src/app/api/menu/route.ts` | format menu |
| stopka | kopia kodu | `frontend/src/components/PortalFooter.tsx` | `web/src/components/Footer.tsx` | treść stopki - zmieniaj w obu |
| robots.txt | jeden plik dla domeny | `frontend/src/app/robots.ts` jest MARTWY | `web/src/app/robots.ts` | reguły `/katalog-firm` |
| giełda transportu | import firm przewozowych | dane firm | `web/src/app/api/admin/transport/import` | nie importować więcej bez polecenia (04.10) |
| raport statystyk | odczyt plików JSON | `backend/data/*.json` | `web/scripts/stats_report.py` | format plików danych |
| zaproszenia do katalogu | log wysyłek | - | `web/var/katalog_invite_log.jsonl` (nie powtarzać wysyłek) | - |

## 4. Crony (serwer, crontab ubuntu)

| Kiedy | Co |
|---|---|
| 1. dnia miesiąca 12:00 | `katalog_firm_psz/send_photo_request_cron.sh` -> `send_photo_request.py cron` |
| codziennie 20:00 | `katalog_firm_psz/send_update_reminder_cron.sh` -> `send_update_reminder.py cron` |
| w procesie backendu | `backend/scheduler.py` - auto-publikacja draftów |

Skrypty `*_cron.sh` są poza gitem (zawierają klucz Resend); lokalne kopie mogą wskazywać stary katalog - wzorcem jest wersja na serwerze.

## 5. Checklisty: zmieniasz X -> sprawdź Y

- **Pola firmy (schemas.py / storage)** -> `frontend/src/types.ts`, `web/src/lib/katalog.ts`, szablony maili `send_*.py`.
- **Zdjęcia** -> `backend/image_utils.py` + `frontend/src/lib/utils.ts resolveImageUrl`; karty przycinają obraz (object-cover) - logo z marginesem. Podmiana zdjęcia = nowa nazwa pliku (cache).
- **Nowa strona publiczna** -> `frontend/src/app/sitemap.xml/route.ts`; robots w `web/src/app/robots.ts`.
- **Linki do portalu / innej aplikacji** -> zwykłe `<a>` (pułapka basePath).
- **Panel admina** -> `ADMIN_PASSWORD` musi być w `.env` (bez niego panel jest otwarty).
- **Nowy plik danych / sekret** -> `web/scripts/backup.sh`.

## 6. Deploy

Lokalnie: zmiana -> `npx tsc --noEmit` (frontend) + `python scripts/powiazania.py --check` -> commit -> push ->
`python ../_recon/deploy_git_katalog.py` (`--backend` restartuje też backend). Kod na serwerze tylko przez git pull.

## 7. Mapa automatyczna


<!-- AUTO:START (generuje scripts/powiazania.py - nie edytuj ręcznie) -->

_Wygenerowane automatycznie. Odśwież: `python scripts/powiazania.py`._

### Endpointy (API) i kto je wywołuje

| Metoda | Ścieżka | Obsługa | Wywoływane z (literały URL w kodzie, też z innych repo) |
|---|---|---|---|
| GET | `/admin/ai-searches` | `backend/routers/admin.py:86` get_ai_searches_endpoint() | `frontend/src/app/admin/components/AdminAiSearches.tsx` |
| GET | `/admin/analytics` | `backend/routers/admin.py:80` get_analytics_endpoint() | `frontend/src/app/admin/page.tsx` |
| GET | `/admin/categories` | `backend/routers/admin.py:336` list_admin_categories() | `frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/sitemap.xml/route.ts` |
| POST | `/admin/categories` | `backend/routers/admin.py:341` add_category() | `frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/sitemap.xml/route.ts` |
| DELETE | `/admin/categories/{category_id}` | `backend/routers/admin.py:386` remove_category() | `frontend/src/app/admin/components/AdminCategories.tsx` |
| PUT | `/admin/categories/{category_id}` | `backend/routers/admin.py:361` edit_category() | `frontend/src/app/admin/components/AdminCategories.tsx` |
| GET | `/admin/companies` | `backend/routers/admin.py:122` list_admin_companies() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/moje-ogloszenia/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/sitemap.xml/route.ts`<br>`send_migration_emails.py` |
| DELETE | `/admin/companies/{company_id}` | `backend/routers/admin.py:256` delete_company() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| PATCH | `/admin/companies/{company_id}` | `backend/routers/admin.py:207` update_company_fields() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| PATCH | `/admin/companies/{company_id}/category` | `backend/routers/admin.py:194` update_company_category() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| PATCH | `/admin/companies/{company_id}/promote` | `backend/routers/admin.py:182` toggle_promotion() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| PATCH | `/admin/companies/{company_id}/status` | `backend/routers/admin.py:154` update_company_status() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| GET | `/admin/ip-blacklist` | `backend/routers/admin.py:270` get_ip_blacklist() | — |
| POST | `/admin/ip-blacklist/add` | `backend/routers/admin.py:316` add_ip_blacklist() | `frontend/src/app/admin/components/AdminReviews.tsx` |
| DELETE | `/admin/ip-blacklist/remove` | `backend/routers/admin.py:324` remove_ip_blacklist() | — |
| GET | `/admin/reviews` | `backend/routers/admin.py:130` list_admin_reviews() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx` |
| DELETE | `/admin/reviews/{review_id}` | `backend/routers/admin.py:145` delete_review() | `frontend/src/app/admin/components/AdminReviews.tsx` |
| POST | `/admin/run-auto-publish` | `backend/routers/admin.py:175` run_auto_publish() | `deploy_scheduler.py` |
| GET | `/admin/settings` | `backend/routers/admin.py:277` get_settings_endpoint() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/page.tsx` |
| PUT | `/admin/settings/newsletter-count` | `backend/routers/admin.py:298` update_newsletter_count_endpoint() | `frontend/src/app/admin/components/AdminSettings.tsx` |
| PUT | `/admin/settings/social-media` | `backend/routers/admin.py:284` update_social_media_endpoint() | — |
| PUT | `/admin/settings/sort-order` | `backend/routers/admin.py:307` update_sort_order_endpoint() | `frontend/src/app/admin/components/AdminSettings.tsx` |
| GET | `/admin/stats` | `backend/routers/admin.py:61` get_stats() | `frontend/src/app/admin/page.tsx` |
| POST | `/admin/track-confirmation-sent` | `backend/routers/admin.py:92` track_confirmation_sent() | `send_migration_emails.py` |
| POST | `/auth/login` | `backend/routers/auth.py:32` login() | `frontend/src/app/login/page.tsx` |
| POST | `/auth/register` | `backend/routers/auth.py:19` register() | `frontend/src/app/rejestracja/page.tsx` |
| GET | `/categories/` | `backend/routers/categories.py:19` list_categories() | `[web] src/lib/katalog.ts`<br>`backend/main.py`<br>`frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx` +1 |
| POST | `/categories/` | `backend/routers/categories.py:24` create_category() | `[web] src/lib/katalog.ts`<br>`backend/main.py`<br>`frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx` +1 |
| GET | `/companies/` | `backend/routers/companies.py:66` list_companies() | `[web] src/lib/katalog.ts`<br>`backend/main.py`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/moje-ogloszenia/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/sitemap.xml/route.ts` +1 |
| POST | `/companies/` | `backend/routers/companies.py:263` create_company() | `[web] src/lib/katalog.ts`<br>`backend/main.py`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/konto/moje-ogloszenia/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/sitemap.xml/route.ts` +1 |
| POST | `/companies/ai-search` | `backend/routers/ai_search.py:110` ai_search() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx` |
| POST | `/companies/archive-token` | `backend/routers/companies.py:561` archive_company_by_token() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx` |
| POST | `/companies/batch-view` | `backend/routers/companies.py:328` batch_increment_views() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx` |
| GET | `/companies/by-slug/{slug}` | `backend/routers/companies.py:311` get_company_by_slug() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| GET | `/companies/by-token/{token}` | `backend/routers/companies.py:414` get_company_by_edit_token() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx` |
| POST | `/companies/confirm` | `backend/routers/companies.py:487` confirm_company_activity() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx` |
| POST | `/companies/confirm-token` | `backend/routers/companies.py:526` confirm_company_by_token() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| GET | `/companies/newsletter` | `backend/routers/companies.py:237` get_newsletter_companies() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx` |
| GET | `/companies/newsletter-preview` | `backend/routers/companies.py:197` get_newsletter_preview() | `frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx` |
| DELETE | `/companies/{company_id}` | `backend/routers/companies.py:390` delete_company() | `backend/main.py`<br>`frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| GET | `/companies/{company_id}` | `backend/routers/companies.py:320` get_company() | `backend/main.py`<br>`frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| PUT | `/companies/{company_id}` | `backend/routers/companies.py:352` update_company() | `backend/main.py`<br>`frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/archiwizuj/[token]/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/konto/edytuj/[id]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/app/potwierdz/[token]/page.tsx` |
| POST | `/companies/{company_id}/click` | `backend/routers/companies.py:346` increment_click() | `frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| GET | `/companies/{company_id}/edit-token` | `backend/routers/companies.py:425` get_company_with_edit_token() | `frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| GET | `/companies/{company_id}/photo/{photo_index}` | `backend/routers/companies.py:438` get_company_photo() | — |
| POST | `/companies/{company_id}/view` | `backend/routers/companies.py:340` increment_view() | `frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx` |
| GET | `/firma-test` | `frontend/src/app/firma-test/route.ts:12` GET() | — |
| GET | `/health` | `backend/main.py:100` health() | `[_recon] deploy_git_katalog.py` |
| GET | `/homepage-test` | `frontend/src/app/homepage-test/route.ts:12` GET() | — |
| GET | `/reports/` | `backend/routers/reports.py:18` list_reports() | `frontend/src/app/companies/[slug]/page.tsx` |
| POST | `/reports/` | `backend/routers/reports.py:23` create_report() | `frontend/src/app/companies/[slug]/page.tsx` |
| GET | `/reviews/` | `backend/routers/reviews.py:23` list_reviews() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx` |
| POST | `/reviews/` | `backend/routers/reviews.py:29` create_review() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx` |
| GET | `/settings` | `backend/main.py:105` get_public_settings() | `frontend/src/app/admin/page.tsx`<br>`frontend/src/app/page.tsx` |
| GET | `/sitemap.xml` | `frontend/src/app/sitemap.xml/route.ts:66` GET() | `[web] src/app/robots.ts`<br>`deploy_seo.py`<br>`frontend/src/app/robots.ts` |

### Strony (URL -> plik)

| URL | Plik |
|---|---|
| `/` | `frontend/src/app/page.tsx` |
| `/admin` | `frontend/src/app/admin/page.tsx` |
| `/archiwizuj/[token]` | `frontend/src/app/archiwizuj/[token]/page.tsx` |
| `/categories/[slug]` | `frontend/src/app/categories/[slug]/page.tsx` |
| `/companies/[slug]` | `frontend/src/app/companies/[slug]/page.tsx` |
| `/dodaj` | `frontend/src/app/dodaj/page.tsx` |
| `/edycja/[token]` | `frontend/src/app/edycja/[token]/page.tsx` |
| `/firma/[slug]` | `frontend/src/app/firma/[slug]/page.tsx` |
| `/jak-to-dziala` | `frontend/src/app/jak-to-dziala/page.tsx` |
| `/kategoria/[slug]` | `frontend/src/app/kategoria/[slug]/page.tsx` |
| `/konto` | `frontend/src/app/konto/page.tsx` |
| `/konto/edytuj/[id]` | `frontend/src/app/konto/edytuj/[id]/page.tsx` |
| `/konto/moje-ogloszenia` | `frontend/src/app/konto/moje-ogloszenia/page.tsx` |
| `/login` | `frontend/src/app/login/page.tsx` |
| `/polityka-prywatnosci` | `frontend/src/app/polityka-prywatnosci/page.tsx` |
| `/potwierdz` | `frontend/src/app/potwierdz/page.tsx` |
| `/potwierdz/[token]` | `frontend/src/app/potwierdz/[token]/page.tsx` |
| `/regulamin` | `frontend/src/app/regulamin/page.tsx` |
| `/rejestracja` | `frontend/src/app/rejestracja/page.tsx` |

### Zmienne środowiskowe -> pliki

| Zmienna | Pliki |
|---|---|
| `ADMIN_PASSWORD` | `send_migration_emails.py` |
| `API_BASE_URL` | `send_migration_emails.py` |
| `AUTO_PUBLISH_CHECK_INTERVAL_MINUTES` | `backend/scheduler.py` |
| `AUTO_PUBLISH_DELAY_HOURS` | `backend/scheduler.py` |
| `AUTO_PUBLISH_ENABLED` | `backend/scheduler.py` |
| `NEXT_PUBLIC_API_URL` | `frontend/src/app/admin/page.tsx`, `frontend/src/app/archiwizuj/[token]/page.tsx`, `frontend/src/app/categories/[slug]/page.tsx`, `frontend/src/app/companies/[slug]/page.tsx`, `frontend/src/app/dodaj/page.tsx`, `frontend/src/app/edycja/[token]/page.tsx`, `frontend/src/app/firma/[slug]/CompanyPageClient.tsx`, `frontend/src/app/firma/[slug]/page.tsx`, `frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`, `frontend/src/app/kategoria/[slug]/page.tsx`, `frontend/src/app/konto/edytuj/[id]/page.tsx`, `frontend/src/app/konto/moje-ogloszenia/page.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/potwierdz/[token]/page.tsx`, `frontend/src/app/potwierdz/page.tsx`, `frontend/src/app/rejestracja/page.tsx`, `frontend/src/app/sitemap.xml/route.ts` |
| `NEXT_PUBLIC_BASE_PATH` | `frontend/src/app/admin/components/AdminCompanies.tsx`, `frontend/src/app/dodaj/page.tsx`, `frontend/src/app/edycja/[token]/page.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/potwierdz/page.tsx`, `frontend/src/lib/utils.ts` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `frontend/src/app/companies/[slug]/page.tsx`, `frontend/src/app/dodaj/page.tsx`, `frontend/src/app/edycja/[token]/page.tsx`, `frontend/src/app/firma/[slug]/CompanyPageClient.tsx`, `frontend/src/app/page.tsx`, `frontend/src/components/GoogleMap.tsx` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | `frontend/src/app/layout.tsx` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `frontend/src/app/companies/[slug]/page.tsx`, `frontend/src/app/firma/[slug]/CompanyPageClient.tsx` |
| `NEXT_PUBLIC_NOINDEX` | `frontend/src/app/robots.ts` |
| `NEXT_PUBLIC_SITE_URL` | `frontend/src/app/robots.ts`, `frontend/src/app/sitemap.xml/route.ts`, `frontend/src/lib/siteUrl.ts` |
| `NODE_ENV` | `frontend/src/components/ErrorBoundary.tsx` |
| `OPENAI_API_KEY` | `backend/routers/ai_search.py` |
| `OPENAI_MODEL` | `backend/routers/ai_search.py` |
| `OPEN_AI_KATALOG_FIRM` | `backend/routers/ai_search.py` |
| `PORTAL_MENU_URL` | `frontend/src/app/layout.tsx` |
| `RESEND_API_KEY` | `send_migration_emails.py`, `send_photo_request.py`, `send_update_reminder.py` |

### Moduły: importuje / jest importowany przez

| Plik | Importuje | Importowany przez |
|---|---|---|
| `backend/__init__.py` | — | — |
| `backend/clear_cache.py` | — | `backend/routers/admin.py`<br>`backend/routers/companies.py`<br>`backend/scheduler.py` |
| `backend/email_service.py` | `backend/settings.py` | `backend/routers/companies.py` |
| `backend/geocoding.py` | — | — |
| `backend/image_utils.py` | — | `backend/routers/companies.py` |
| `backend/ip_blacklist.py` | — | `backend/main.py`<br>`backend/routers/admin.py` |
| `backend/main.py` | `backend/ip_blacklist.py`<br>`backend/routers/__init__.py`<br>`backend/routers/admin.py`<br>`backend/routers/ai_search.py`<br>`backend/routers/auth.py`<br>`backend/routers/categories.py`<br>`backend/routers/companies.py`<br>`backend/routers/reports.py`<br>`backend/routers/reviews.py`<br>`backend/scheduler.py`<br>`backend/security_middleware.py`<br>`backend/settings.py`<br>`backend/storage.py` | — |
| `backend/migrate_coordinates.py` | `backend/settings.py`<br>`backend/storage.py` | — |
| `backend/migrate_images.py` | — | — |
| `backend/routers/__init__.py` | `backend/routers/auth.py`<br>`backend/routers/categories.py`<br>`backend/routers/companies.py`<br>`backend/routers/reviews.py` | `backend/main.py` |
| `backend/routers/admin.py` | `backend/clear_cache.py`<br>`backend/ip_blacklist.py`<br>`backend/scheduler.py`<br>`backend/settings.py`<br>`backend/storage.py` | `backend/main.py` |
| `backend/routers/ai_search.py` | `backend/security_middleware.py` | `backend/main.py` |
| `backend/routers/auth.py` | `backend/security.py`<br>`backend/storage.py` | `backend/main.py`<br>`backend/routers/__init__.py` |
| `backend/routers/categories.py` | `backend/security_middleware.py`<br>`backend/storage.py` | `backend/main.py`<br>`backend/routers/__init__.py` |
| `backend/routers/companies.py` | `backend/clear_cache.py`<br>`backend/email_service.py`<br>`backend/image_utils.py`<br>`backend/settings.py`<br>`backend/storage.py` | `backend/main.py`<br>`backend/routers/__init__.py` |
| `backend/routers/reports.py` | `backend/storage.py` | `backend/main.py` |
| `backend/routers/reviews.py` | `backend/security_middleware.py`<br>`backend/storage.py` | `backend/main.py`<br>`backend/routers/__init__.py` |
| `backend/scheduler.py` | `backend/clear_cache.py`<br>`backend/storage.py` | `backend/main.py`<br>`backend/routers/admin.py` |
| `backend/schemas.py` | — | — |
| `backend/security.py` | — | `backend/routers/auth.py` |
| `backend/security_middleware.py` | — | `backend/main.py`<br>`backend/routers/ai_search.py`<br>`backend/routers/categories.py`<br>`backend/routers/reviews.py` |
| `backend/settings.py` | — | `backend/email_service.py`<br>`backend/main.py`<br>`backend/migrate_coordinates.py`<br>`backend/routers/admin.py`<br>`backend/routers/companies.py`<br>`backend/storage.py` |
| `backend/storage.py` | `backend/settings.py` | `backend/main.py`<br>`backend/migrate_coordinates.py`<br>`backend/routers/admin.py`<br>`backend/routers/auth.py`<br>`backend/routers/categories.py`<br>`backend/routers/companies.py`<br>`backend/routers/reports.py`<br>`backend/routers/reviews.py`<br>`backend/scheduler.py` |
| `deploy_nginx.py` | — | — |
| `deploy_scheduler.py` | — | — |
| `deploy_seo.py` | — | — |
| `frontend/src/app/AppShell.tsx` | — | `frontend/src/app/layout.tsx` |
| `frontend/src/app/admin/components/AdminAiSearches.tsx` | — | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/components/AdminCategories.tsx` | `frontend/src/types.ts` | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/components/AdminCompanies.tsx` | `frontend/src/types.ts` | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/components/AdminReviews.tsx` | — | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/components/AdminSettings.tsx` | — | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/components/AdminStats.tsx` | — | `frontend/src/app/admin/page.tsx` |
| `frontend/src/app/admin/layout.tsx` | — | — |
| `frontend/src/app/admin/page.tsx` | `frontend/src/app/admin/components/AdminAiSearches.tsx`<br>`frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/admin/components/AdminReviews.tsx`<br>`frontend/src/app/admin/components/AdminSettings.tsx`<br>`frontend/src/app/admin/components/AdminStats.tsx`<br>`frontend/src/types.ts` | — |
| `frontend/src/app/archiwizuj/[token]/page.tsx` | — | — |
| `frontend/src/app/categories/[slug]/page.tsx` | `frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | — |
| `frontend/src/app/companies/[slug]/page.tsx` | `frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | — |
| `frontend/src/app/dodaj/layout.tsx` | `frontend/src/lib/siteUrl.ts` | — |
| `frontend/src/app/dodaj/page.tsx` | `frontend/src/types.ts` | — |
| `frontend/src/app/edycja/[token]/page.tsx` | `frontend/src/types.ts` | — |
| `frontend/src/app/edycja/layout.tsx` | — | — |
| `frontend/src/app/firma-test/route.ts` | — | — |
| `frontend/src/app/firma/[slug]/CompanyPageClient.tsx` | `frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | `frontend/src/app/firma/[slug]/page.tsx` |
| `frontend/src/app/firma/[slug]/page.tsx` | `frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/lib/siteUrl.ts`<br>`frontend/src/lib/utils.ts` | — |
| `frontend/src/app/homepage-test/route.ts` | — | — |
| `frontend/src/app/jak-to-dziala/page.tsx` | `frontend/src/lib/siteUrl.ts` | — |
| `frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx` | `frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | `frontend/src/app/kategoria/[slug]/page.tsx` |
| `frontend/src/app/kategoria/[slug]/page.tsx` | `frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/lib/siteUrl.ts`<br>`frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | — |
| `frontend/src/app/konto/edytuj/[id]/page.tsx` | — | — |
| `frontend/src/app/konto/layout.tsx` | — | — |
| `frontend/src/app/konto/moje-ogloszenia/page.tsx` | — | — |
| `frontend/src/app/konto/page.tsx` | — | — |
| `frontend/src/app/layout.tsx` | `frontend/src/app/AppShell.tsx`<br>`frontend/src/components/PortalBar.tsx`<br>`frontend/src/components/PortalFooter.tsx`<br>`frontend/src/lib/siteUrl.ts` | — |
| `frontend/src/app/login/layout.tsx` | — | — |
| `frontend/src/app/login/page.tsx` | — | — |
| `frontend/src/app/not-found.tsx` | — | — |
| `frontend/src/app/page.tsx` | `frontend/src/components/CompanyCard.tsx`<br>`frontend/src/components/Filters.tsx`<br>`frontend/src/components/GoogleMap.tsx`<br>`frontend/src/components/Pagination.tsx`<br>`frontend/src/lib/utils.ts`<br>`frontend/src/types.ts` | — |
| `frontend/src/app/polityka-prywatnosci/page.tsx` | `frontend/src/lib/siteUrl.ts` | — |
| `frontend/src/app/potwierdz/[token]/page.tsx` | — | — |
| `frontend/src/app/potwierdz/layout.tsx` | — | — |
| `frontend/src/app/potwierdz/page.tsx` | — | — |
| `frontend/src/app/regulamin/page.tsx` | `frontend/src/lib/siteUrl.ts` | — |
| `frontend/src/app/rejestracja/layout.tsx` | — | — |
| `frontend/src/app/rejestracja/page.tsx` | — | — |
| `frontend/src/app/robots.ts` | — | — |
| `frontend/src/app/sitemap.xml/route.ts` | — | — |
| `frontend/src/components/CompanyCard.tsx` | `frontend/src/types.ts` | `frontend/src/app/page.tsx` |
| `frontend/src/components/ErrorBoundary.tsx` | — | — |
| `frontend/src/components/Filters.tsx` | `frontend/src/types.ts` | `frontend/src/app/page.tsx` |
| `frontend/src/components/GoogleMap.tsx` | `frontend/src/types.ts` | `frontend/src/app/page.tsx` |
| `frontend/src/components/Pagination.tsx` | — | `frontend/src/app/page.tsx` |
| `frontend/src/components/PortalBar.tsx` | — | `frontend/src/app/layout.tsx` |
| `frontend/src/components/PortalFooter.tsx` | — | `frontend/src/app/layout.tsx` |
| `frontend/src/lib/siteUrl.ts` | — | `frontend/src/app/dodaj/layout.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/jak-to-dziala/page.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/layout.tsx`<br>`frontend/src/app/polityka-prywatnosci/page.tsx`<br>`frontend/src/app/regulamin/page.tsx` |
| `frontend/src/lib/utils.ts` | — | `frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/firma/[slug]/page.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/page.tsx` |
| `frontend/src/types.ts` | — | `frontend/src/app/admin/components/AdminCategories.tsx`<br>`frontend/src/app/admin/components/AdminCompanies.tsx`<br>`frontend/src/app/admin/page.tsx`<br>`frontend/src/app/categories/[slug]/page.tsx`<br>`frontend/src/app/companies/[slug]/page.tsx`<br>`frontend/src/app/dodaj/page.tsx`<br>`frontend/src/app/edycja/[token]/page.tsx`<br>`frontend/src/app/firma/[slug]/CompanyPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/CategoryPageClient.tsx`<br>`frontend/src/app/kategoria/[slug]/page.tsx`<br>`frontend/src/app/page.tsx`<br>`frontend/src/components/CompanyCard.tsx`<br>`frontend/src/components/Filters.tsx`<br>`frontend/src/components/GoogleMap.tsx` |
| `scripts/generate_og.py` | — | — |
| `scripts/powiazania.py` | — | — |
| `send_migration_emails.py` | — | — |
| `send_photo_request.py` | — | — |
| `send_update_reminder.py` | — | — |

<!-- AUTO:END -->
