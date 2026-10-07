/** POWIĄZANIA
 * Cel: metadane konta (noindex).
 * Przy zmianie: bez zależności.
 * AUTO plik specjalny Next.js (layout) - ładowany przez framework, nie przez import
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moje konto | Katalog Firm w Szwajcarii",
  robots: { index: false, follow: false },
};

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
