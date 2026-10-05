/**
 * Resolve image URL - handles base64 data URIs, external URLs, and local API paths.
 * After backend migration, images are stored as /images/company_X_main_0.webp paths.
 */
export function resolveImageUrl(img: string | undefined | null, apiUrl: string): string {
  // basePath (np. /katalog-firm) — bez niego placeholder leci z roota domeny (404)
  if (!img) return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/default-company.png`;
  if (img.startsWith("data:") || img.startsWith("http")) return img;
  if (img.startsWith("/images/")) return `${apiUrl}${img}`;
  return img;
}

/** Opis do meta description: bez HTML, max ~155 zn., ucięty na granicy słowa (audyt SEO 05.10). */
export function metaDesc(text: string | null | undefined, max = 155): string {
  const t = (text || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:.\s-]+$/, "") + "…";
}
