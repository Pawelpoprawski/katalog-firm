import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dodaj firmę za darmo",
  description:
    "Dodaj swoją polską firmę do katalogu polonijnego w Szwajcarii — bezpłatnie, bez prowizji, w 5 minut. Twoja firma będzie widoczna dla tysięcy Polaków szukających usług po polsku. Otrzymasz link do edycji wpisu na e-mail.",
  keywords: [
    "dodaj firmę za darmo",
    "dodaj firmę polonijną",
    "rejestracja firmy polskiej Szwajcaria",
    "katalog firm dodaj wpis",
    "zarejestruj polską firmę",
    "darmowy katalog firm polonijnych",
    "ogłoszenie usługa polska Szwajcaria",
  ],
  openGraph: {
    title: "Dodaj firmę za darmo | Katalog Firm Polonijnych",
    description:
      "Dodaj swoją firmę do katalogu polskich firm w Szwajcarii — całkowicie za darmo. 5 minut, bez konta, otrzymasz link do edycji wpisu.",
    url: "https://katalog-firm.ch/dodaj",
    type: "website",
    siteName: "Katalog Firm Polonijnych w Szwajcarii",
    locale: "pl_PL",
    images: [
      {
        url: "https://katalog-firm.ch/og.png",
        width: 1200,
        height: 630,
        alt: "Dodaj firmę za darmo — Katalog Firm Polonijnych",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dodaj firmę za darmo | Katalog Firm",
    description: "Bezpłatne dodanie wpisu w katalogu polskich firm w Szwajcarii.",
    images: ["https://katalog-firm.ch/og.png"],
  },
  alternates: {
    canonical: "https://katalog-firm.ch/dodaj",
  },
};

export default function DodajLayout({ children }: { children: React.ReactNode }) {
  return children;
}
