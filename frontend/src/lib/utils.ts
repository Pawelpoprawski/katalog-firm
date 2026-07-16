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
