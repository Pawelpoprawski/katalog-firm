/**
 * Resolve image URL - handles base64 data URIs, external URLs, and local API paths.
 * After backend migration, images are stored as /images/company_X_main_0.webp paths.
 */
export function resolveImageUrl(img: string | undefined | null, apiUrl: string): string {
  if (!img) return "/default-company.png";
  if (img.startsWith("data:") || img.startsWith("http")) return img;
  if (img.startsWith("/images/")) return `${apiUrl}${img}`;
  return img;
}
