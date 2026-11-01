/** POWIĄZANIA
 * Cel: 301 ze starych adresów firm ze znakami spoza ASCII („ł”, ozdobne litery Unicode) na nowe slugi ASCII
 *   (audyt SEO 01.11.2026). Middleware zamiast permanentRedirect na stronie: w Next 14 przekierowanie ze strony z cache
 *   ISR potrafi wyjść bez nagłówka Location.
 * Przy zmianie: mapa = wynik scripts/seo_katalog_2026_11.py (stary slug zostaje też w companies.json „old_slugs”, więc
 *   backend /companies/by-slug znajdzie firmę i po starym adresie; strona ma wtedy canonical na nowy).
 * AUTO plik specjalny Next.js (middleware) - ładowany przez framework, nie przez import
 */
import { NextRequest, NextResponse } from "next/server";

const STARE_SLUGI: Record<string, string> = {
  "cejerski038sun-michał-cejer": "cejerski038sun-michal-cejer",
  "estis-garkuche-z-miłosci-do-jedzenia-z-pasji-do-gotowania": "estis-garkuche-z-milosci-do-jedzenia-z-pasji-do-gotowania",
  "pracownia-psychologii-stanisławska": "pracownia-psychologii-stanislawska",
  "wojtek-gasowski-technika-eventowa-nagłosnienie-i-oswietlenie": "wojtek-gasowski-technika-eventowa-naglosnienie-i-oswietlenie",
  "lilliland-zajecia-rozwojowe-dla-dzieci-i-młodziezy-w-zurychu-i-szwajcarii-tus-jezyk-polski-rozwoj-emocjonalny-społeczny-i-jezykowy":
    "lilliland-zajecia-rozwojowe-dla-dzieci-i-mlodziezy-w-zurychu-i-szwajcarii-tus",
  "𝓞𝓛𝓐𝓷𝓭𝓻𝓪-𝓒𝓪𝓴𝓮𝓼": "olandra-cakes",
  "twoje-włosy-moja-pasja": "twoje-wlosy-moja-pasja",
  "tłumacz-przysiegły-sadowy-w-szwajcarii-i-w-polsce": "tlumacz-przysiegly-sadowy-w-szwajcarii-i-w-polsce",
};

export function middleware(req: NextRequest) {
  const m = /^\/firma\/([^/]+)\/?$/.exec(req.nextUrl.pathname);
  if (!m) return NextResponse.next();
  let slug = m[1];
  try { slug = decodeURIComponent(slug); } catch { /* zostaje surowy */ }
  const nowy = STARE_SLUGI[slug] || STARE_SLUGI[slug.toLowerCase()];
  if (!nowy) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/firma/${nowy}`;
  return NextResponse.redirect(url, 301);
}

export const config = { matcher: ["/firma/:path*"] };
