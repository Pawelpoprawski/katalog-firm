import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potwierdź aktywność firmy | Katalog Firm",
  robots: { index: false, follow: false },
};

export default function PotwierdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
