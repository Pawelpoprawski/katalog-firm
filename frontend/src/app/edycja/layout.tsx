import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edycja firmy | Katalog Firm w Szwajcarii",
  robots: { index: false, follow: false },
};

export default function EdycjaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
