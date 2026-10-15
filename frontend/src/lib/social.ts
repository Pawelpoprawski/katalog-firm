/** POWIĄZANIA
 * Cel: JEDYNE miejsce w katalogu z adresami profili social (stopka PortalFooter, JSON-LD sameAs w layout).
 * Przy zmianie: to kopia SOCIAL z portalu (web/src/lib/site.ts) - zmień w OBU repo.
 * AUTO używany przez: frontend/src/app/layout.tsx, frontend/src/components/PortalFooter.tsx
 */
export const SOCIAL = {
  facebook: "https://www.facebook.com/PolacySzwajcaria2024/",
  youtube: "https://www.youtube.com/@pawelszwajcaria",
  instagram: "https://www.instagram.com/polacyszwajcaria/",
  tiktok: "https://www.tiktok.com/@polacyszwajcaria",
  x: "https://x.com/PolacySzwajca",
} as const;
