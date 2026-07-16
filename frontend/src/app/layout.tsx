import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";
import PortalBar, { type PortalNavItem } from "@/components/PortalBar";
import PortalFooter from "@/components/PortalFooter";
import { SITE_URL } from "@/lib/siteUrl";

// Menu wspólnego paska — z API portalu (jedno źródło prawdy: baza menu portalu,
// edytowana w adminie). Lokalnie na serwerze (127.0.0.1:3200), odświeżane co 10 min.
const PORTAL_MENU_URL = process.env.PORTAL_MENU_URL || "http://127.0.0.1:3200/api/menu/";

async function getPortalNav(): Promise<PortalNavItem[]> {
  try {
    const res = await fetch(PORTAL_MENU_URL, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return []; // portal niedostępny → sam pasek logo, bez menu
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    url: SITE_URL,
    siteName: "Katalog Firm Polonijnych w Szwajcarii",
    locale: "pl_PL",
    images: [
      {
        url: `${SITE_URL}/og.png`,
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
    images: [`${SITE_URL}/og.png`],
  },
  alternates: {
    canonical: SITE_URL,
  },
  // icons handled automatically by App Router via src/app/favicon.ico, icon.png, apple-icon.png
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const portalNav = await getPortalNav();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "Polskie Usługi w Szwajcarii",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
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
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: "Katalog Firm Polonijnych w Szwajcarii",
        description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne.",
        publisher: { "@id": `${SITE_URL}#organization` },
        inLanguage: "pl-PL",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
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
        {/* manifest z basePath — bez niego przeglądarka prosi o /manifest.json z roota domeny (404) */}
        <link rel="manifest" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.json`} />
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
        {/* Umami self-hosted — jeden wspólny website całej domeny polacyszwajcaria.com
            (portal + /praca-w-szwajcarii + /katalog-firm). */}
        <script defer src="https://stats.polacyszwajcaria.com/script.js" data-website-id="483d2f9a-9d4c-4412-8c95-d8fd52cae895" />
      </head>
      <body className="bg-white text-slate-900 antialiased font-sans">
        <PortalBar nav={portalNav} />
        <AppShell>{children}</AppShell>
        <PortalFooter />
      </body>
    </html>
  );
}

