/** POWIĄZANIA
 * Cel: zamiana pól firmy „strona www / Facebook / Instagram” na bezpieczny adres zewnętrzny albo null (wtedy zwykły
 *   tekst, bez linku). Audyt SEO 01.11.2026: wartości bez https:// („Www.instagram.com/x”, „APF Garage”) dawały
 *   względne linki /katalog-firm/firma/<tekst> = 404.
 * Przy zmianie: te same reguły w backend/linki.py (normalizacja przy zapisie i jednorazowa poprawka danych).
 * AUTO używany przez: frontend/src/app/firma/[slug]/CompanyPageClient.tsx, frontend/src/app/firma/[slug]/InfoFirmy.tsx, frontend/src/app/firma/[slug]/page.tsx
 */

export type TypLinku = "website" | "facebook" | "instagram";

const DOMENA = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#].*)?$/i;
const UCHWYT_IG = /^@?[a-z0-9._]{2,30}$/i;
const UCHWYT_FB = /^@?[a-z0-9.]{5,50}$/i;

/** Adres https:// do otwarcia albo null, gdy wartość nie jest adresem (np. sama nazwa firmy). */
export function linkZewnetrzny(wartosc: string | null | undefined, typ: TypLinku): string | null {
  const v = (wartosc || "").trim();
  if (!v || v === "-") return null;
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v;
  if (/\s/.test(v)) return null; // nazwa ze spacjami, np. „Karol Haustechnik”
  const bezProt = v.replace(/^\/+/, "");
  if (typ === "instagram" && !/instagram\.com/i.test(bezProt)) {
    return UCHWYT_IG.test(bezProt) ? `https://www.instagram.com/${bezProt.replace(/^@/, "")}` : null;
  }
  if (typ === "facebook" && !/(facebook|fb)\.com/i.test(bezProt)) {
    return UCHWYT_FB.test(bezProt) && !DOMENA.test(bezProt) ? `https://www.facebook.com/${bezProt.replace(/^@/, "")}` : null;
  }
  return DOMENA.test(bezProt) ? `https://${bezProt.replace(/^www\./i, "www.")}` : null;
}
