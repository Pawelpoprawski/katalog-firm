// Ręczny sitemap route — Next.js MetadataRoute Sitemap nie pozwala kontrolować Cache-Control.
// force-dynamic + Cache-Control z Response → Googlebot dostaje cacheable sitemap.
// Backend ma własny cache (revalidate na fetch), więc cost generacji jest niski.

export const dynamic = "force-dynamic";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-firm.ch";

type Company = {
  slug?: string;
  is_active?: boolean;
  status?: string;
  updated_at?: number;
};

type Category = {
  slug?: string;
};

async function getCompanies(): Promise<Company[]> {
  try {
    const res = await fetch(`${apiUrl}/companies/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.companies || []);
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${apiUrl}/categories/`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const companies = await getCompanies();
  const categories = await getCategories();
  const now = new Date().toISOString();

  const entries: string[] = [
    urlEntry(`${baseUrl}`, now, "daily", "1.0"),
    urlEntry(`${baseUrl}/dodaj`, now, "monthly", "0.7"),
    urlEntry(`${baseUrl}/jak-to-dziala`, now, "monthly", "0.6"),
    urlEntry(`${baseUrl}/regulamin`, now, "yearly", "0.3"),
    urlEntry(`${baseUrl}/polityka-prywatnosci`, now, "yearly", "0.3"),
  ];

  for (const cat of categories) {
    if (!cat.slug) continue;
    entries.push(urlEntry(`${baseUrl}/kategoria/${cat.slug}`, now, "weekly", "0.7"));
  }

  for (const c of companies) {
    if (!c.slug || !c.is_active) continue;
    const lastmod = c.updated_at ? new Date(c.updated_at * 1000).toISOString() : now;
    entries.push(urlEntry(`${baseUrl}/firma/${c.slug}`, lastmod, "weekly", "0.8"));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
