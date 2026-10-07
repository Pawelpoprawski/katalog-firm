/** POWIĄZANIA
 * Cel: metadane potwierdzenia (noindex).
 * Przy zmianie: bez zależności.
 * AUTO plik specjalny Next.js (layout) - ładowany przez framework, nie przez import
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potwierdź aktywność firmy | Katalog Firm",
  robots: { index: false, follow: false },
};

export default function PotwierdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
