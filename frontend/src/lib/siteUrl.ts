// Kanoniczny adres publiczny serwisu (canonicale, OG, JSON-LD, sitemapa).
// Sterowany przez NEXT_PUBLIC_SITE_URL (np. https://polacyszwajcaria.com/katalog-firm);
// bez zmiennej — historyczny default katalog-firm.ch.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-firm.ch").replace(/\/+$/, "");
