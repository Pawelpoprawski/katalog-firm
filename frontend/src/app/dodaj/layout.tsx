import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dodaj swoją firmę za darmo | Katalog Firm w Szwajcarii",
  description: "Dodaj swoją polską firmę do katalogu usług w Szwajcarii. Bezpłatna rejestracja, dotrzyj do tysięcy Polaków. Wypełnij formularz i zacznij zdobywać klientów.",
  keywords: ["dodaj firmę", "rejestracja firmy", "polskie usługi Szwajcaria", "katalog firm", "darmowe ogłoszenie"],
  openGraph: {
    title: "Dodaj swoją firmę za darmo | Katalog Firm",
    description: "Bezpłatna rejestracja firmy w największym katalogu polskich usług w Szwajcarii.",
    url: "https://katalog-firm.ch/dodaj",
  },
  alternates: {
    canonical: "https://katalog-firm.ch/dodaj",
  },
};

export default function DodajLayout({ children }: { children: React.ReactNode }) {
  return children;
}
