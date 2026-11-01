/** POWIĄZANIA
 * Cel: serwerowy blok pod profilem firmy: „W skrócie” (fakty wyłącznie z danych firmy w bazie: kategoria, miejsce,
 *   formy kontaktu, opinie, data dodania i potwierdzenia) i „Inne firmy” z tej samej kategorii i kantonu (linki).
 *   Audyt SEO 01.11.2026: 115 ze 190 profili miało < 150 słów i mało linków wewnętrznych. Niczego nie dopisujemy
 *   o firmie spoza bazy.
 * Przy zmianie: dane z backendu GET /companies/?category_id= (lista bez zdjęć), adresy firm /firma/<slug>.
 * AUTO używany przez: frontend/src/app/firma/[slug]/page.tsx
 */
import Link from "next/link";
import { linkZewnetrzny } from "@/lib/linki";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const KANTONY: Record<string, string> = {
  AG: "Argowia", AI: "Appenzell Innerrhoden", AR: "Appenzell Ausserrhoden", BE: "Berno", BL: "Bazylea-Okręg",
  BS: "Bazylea-Miasto", FR: "Fryburg", GE: "Genewa", GL: "Glarus", GR: "Gryzonia", JU: "Jura", LU: "Lucerna",
  NE: "Neuchâtel", NW: "Nidwalden", OW: "Obwalden", SG: "St. Gallen", SH: "Szafuza", SO: "Solura", SZ: "Schwyz",
  TG: "Turgowia", TI: "Ticino", UR: "Uri", VD: "Vaud", VS: "Valais", ZG: "Zug", ZH: "Zurych",
};
export const nazwaKantonu = (k?: string | null) => (k ? KANTONY[k.toUpperCase()] || k : "");

type Firma = {
  id: number; name: string; slug: string; city?: string | null; canton?: string | null; category_id?: number | null;
  category?: string | null; category_slug?: string | null; phone?: string | null; whatsapp?: string | null;
  email?: string | null; website?: string | null; facebook?: string | null; instagram?: string | null;
  rating?: number | null; rating_count?: number | null; created_at?: number | null; last_confirmed_at?: string | null;
};

async function firmyKategorii(categoryId: number): Promise<Firma[]> {
  try {
    const r = await fetch(`${apiUrl}/companies/?category_id=${categoryId}`, { next: { revalidate: 3600 } });
    return r.ok ? ((await r.json()) as Firma[]) : [];
  } catch {
    return [];
  }
}

const data = (d: Date) => d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

export default async function InfoFirmy({ company }: { company: Firma }) {
  const kat = company.category || "";
  const kanton = nazwaKantonu(company.canton);
  const miejsce = company.city ? (kanton && kanton !== company.city ? `${company.city} (kanton ${kanton})` : company.city) : kanton ? `kanton ${kanton}` : "";
  const kontakt = [
    company.phone && "telefon",
    company.whatsapp && "WhatsApp",
    company.email && "e-mail",
    linkZewnetrzny(company.website, "website") && "strona internetowa",
    (linkZewnetrzny(company.facebook, "facebook") || linkZewnetrzny(company.instagram, "instagram")) && "media społecznościowe",
  ].filter(Boolean) as string[];
  const dodana = company.created_at ? new Date(company.created_at * 1000) : null;
  const potw = company.last_confirmed_at ? new Date(company.last_confirmed_at) : null;

  // Inne firmy: najpierw ta sama kategoria i kanton, dopełnienie tą samą kategorią z innych kantonów (max 6).
  const wszystkie = company.category_id ? (await firmyKategorii(company.category_id)).filter((f) => f.id !== company.id && f.slug) : [];
  const tenKanton = wszystkie.filter((f) => company.canton && f.canton === company.canton);
  const inne = [...tenKanton, ...wszystkie.filter((f) => !tenKanton.includes(f))].slice(0, 6);
  const tytulInnych = tenKanton.length ? `Inne firmy: ${kat}${kanton ? ` w kantonie ${kanton}` : ""}` : `Inne firmy z kategorii ${kat}`;

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-12">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-[#0D2240]">{company.name} w skrócie</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#444]">
            {company.name} to firma z kategorii {kat ? <strong>{kat}</strong> : "usługi"}
            {company.city ? <> z miejscowości {miejsce}</> : miejsce ? <> działająca w regionie: {miejsce}</> : null}, wpisana do Katalogu Firm Polonijnych w Szwajcarii.
            {kontakt.length ? ` Możesz skontaktować się z nią przez: ${kontakt.join(", ")}.` : ""}
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {kat && (
              <>
                <dt className="text-[#888]">Kategoria</dt>
                <dd>{company.category_slug ? <Link href={`/kategoria/${company.category_slug}`} className="font-semibold text-[#0D2240] hover:text-[#E1002A]">{kat}</Link> : kat}</dd>
              </>
            )}
            {miejsce && (<><dt className="text-[#888]">Lokalizacja</dt><dd className="text-[#1A1A1A]">{miejsce}</dd></>)}
            {company.rating && company.rating_count ? (
              <><dt className="text-[#888]">Opinie</dt><dd className="text-[#1A1A1A]">{company.rating.toFixed(1)} / 5 ({company.rating_count})</dd></>
            ) : null}
            {dodana && (<><dt className="text-[#888]">W katalogu od</dt><dd className="text-[#1A1A1A]">{data(dodana)}</dd></>)}
            {potw && !isNaN(potw.getTime()) && (<><dt className="text-[#888]">Dane potwierdzone</dt><dd className="text-[#1A1A1A]">{data(potw)}</dd></>)}
          </dl>
        </div>
        {inne.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-[#0D2240]">{tytulInnych}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {inne.map((f) => (
                <li key={f.id}>
                  <Link href={`/firma/${f.slug}`} className="font-semibold text-[#0D2240] hover:text-[#E1002A]">{f.name}</Link>
                  {f.city ? <span className="text-[#888]"> · {f.city}</span> : null}
                </li>
              ))}
            </ul>
            {company.category_slug && (
              <Link href={`/kategoria/${company.category_slug}`} className="mt-4 inline-block text-sm font-semibold text-[#E1002A] hover:underline">
                Wszystkie firmy z kategorii {kat}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
