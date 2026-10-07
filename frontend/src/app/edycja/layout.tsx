/** POWIĄZANIA
 * Cel: metadane edycji (noindex).
 * Przy zmianie: bez zależności.
 * AUTO plik specjalny Next.js (layout) - ładowany przez framework, nie przez import
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edycja firmy | Katalog Firm w Szwajcarii",
  robots: { index: false, follow: false },
};

export default function EdycjaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
