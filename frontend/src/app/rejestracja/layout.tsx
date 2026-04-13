import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rejestracja | Katalog Firm w Szwajcarii",
  description: "Załóż konto w katalogu polskich firm w Szwajcarii. Darmowa rejestracja.",
  robots: { index: false, follow: false },
};

export default function RejestracjaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
