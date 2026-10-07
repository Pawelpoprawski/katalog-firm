/** POWIĄZANIA
 * Cel: kanoniczny adres publiczny katalogu (canonicale, OG, JSON-LD, sitemapa) z NEXT_PUBLIC_SITE_URL.
 * Przy zmianie: na produkcji https://polacyszwajcaria.com/katalog-firm.
 * AUTO używany przez: frontend/src/app/dodaj/layout.tsx, frontend/src/app/firma/[slug]/page.tsx, frontend/src/app/jak-to-dziala/page.tsx, frontend/src/app/kategoria/[slug]/page.tsx, frontend/src/app/layout.tsx, frontend/src/app/polityka-prywatnosci/page.tsx, frontend/src/app/regulamin/page.tsx
 */
// Kanoniczny adres publiczny serwisu (canonicale, OG, JSON-LD, sitemapa).
// Sterowany przez NEXT_PUBLIC_SITE_URL (np. https://polacyszwajcaria.com/katalog-firm);
// bez zmiennej — historyczny default katalog-firm.ch.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-firm.ch").replace(/\/+$/, "");
