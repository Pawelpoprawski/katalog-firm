/** POWIĄZANIA
 * Cel: layout panelu admina (noindex).
 * Przy zmianie: robots dla /katalog-firm/admin jest w web/src/app/robots.ts.
 * AUTO plik specjalny Next.js (layout) - ładowany przez framework, nie przez import
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel administracyjny | Katalog Firm",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
