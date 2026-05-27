import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://katalog-firm.ch'),
  title: {
    default: "Polskie firmy w Szwajcarii — Katalog Firm Polonijnych",
    template: "%s | Katalog Firm",
  },
  description:
    "Sprawdzony katalog polskich firm i usług w Szwajcarii. 100+ firm polonijnych — fryzjerstwo, gastronomia, transport, finanse, beauty, edukacja, zdrowie. Dodaj swoją firmę za darmo.",
  keywords: [
    "polskie firmy w Szwajcarii",
    "katalog firm polonijnych",
    "polskie usługi Szwajcaria",
    "firmy polonijne",
    "Polacy w Szwajcarii",
    "polski biznes Szwajcaria",
    "polscy przedsiębiorcy w Szwajcarii",
    "firmy polskie Zürich",
    "firmy polskie Bern",
    "firmy polskie Genewa",
    "katalog-firm.ch",
    "dodaj firmę za darmo",
  ],
  authors: [{ name: "Natalia & Paweł Poprawscy" }],
  creator: "PolacySzwajcaria",
  publisher: "PolacySzwajcaria",
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: "Polskie firmy w Szwajcarii — Katalog Firm Polonijnych",
    description:
      "100+ sprawdzonych polskich firm i usług w Szwajcarii. Znajdź firmę polonijną w swoim kantonie. Dodaj swoją za darmo.",
    type: "website",
    url: "https://katalog-firm.ch",
    siteName: "Katalog Firm Polonijnych w Szwajcarii",
    locale: "pl_PL",
    images: [
      {
        url: "https://katalog-firm.ch/og.png",
        width: 1200,
        height: 630,
        alt: "Polskie firmy w Szwajcarii — Katalog Firm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Polskie firmy w Szwajcarii — Katalog Firm Polonijnych",
    description: "100+ sprawdzonych polskich firm i usług w Szwajcarii. Dodaj swoją za darmo.",
    images: ["https://katalog-firm.ch/og.png"],
  },
  alternates: {
    canonical: "https://katalog-firm.ch",
  },
  // icons handled automatically by App Router via src/app/favicon.ico, icon.png, apple-icon.png
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://katalog-firm.ch#organization",
        name: "Polskie Usługi w Szwajcarii",
        url: "https://katalog-firm.ch",
        logo: {
          "@type": "ImageObject",
          url: "https://katalog-firm.ch/logo.png",
          width: 512,
          height: 512,
        },
        description: "Największy katalog polskich firm i usług w Szwajcarii",
        foundingDate: "2024",
        sameAs: [
          "https://www.facebook.com/PolacySzwajcaria2024",
          "https://polacyszwajcaria.com"
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://katalog-firm.ch#website",
        url: "https://katalog-firm.ch",
        name: "Katalog Firm Polonijnych w Szwajcarii",
        description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne.",
        publisher: { "@id": "https://katalog-firm.ch#organization" },
        inLanguage: "pl-PL",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://katalog-firm.ch/?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      }
    ]
  };

  return (
    <html lang="pl">
      <head>
        {/* viewport set via metadata export — no duplicate here */}
        <meta name="theme-color" content="#E1002A" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Slab:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script defer src="https://stats.katalog-firm.ch/script.js" data-website-id="29e9d993-03f9-4c30-976b-bc2fc1cd1f20" />
      </head>
      <body className="bg-white text-slate-900 antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

