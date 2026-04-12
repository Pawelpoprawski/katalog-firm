import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  metadataBase: new URL('https://katalog-firm.ch'),
  title: "Polskie usługi w Szwajcarii | Katalog Firm",
  description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne – budownictwo, transport, gastronomia, IT i więcej.",
  keywords: ["polskie usługi", "Szwajcaria", "firmy polskie", "Polonia", "katalog firm", "usługi polonijne", "polscy przedsiębiorcy", "Polacy w Szwajcarii", "polskie firmy w Szwajcarii"],
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
    title: "Polskie usługi w Szwajcarii | Katalog Firm",
    description: "Katalog polskich firm i usług w Szwajcarii. Najlepsza baza polskich przedsiębiorców.",
    type: "website",
    url: "https://katalog-firm.ch",
    siteName: "Polskie Usługi w Szwajcarii",
    locale: "pl_PL",
    images: [
      {
        url: "https://katalog-firm.ch/logo.png",
        width: 512,
        height: 512,
        alt: "Polskie Usługi w Szwajcarii - Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Polskie usługi w Szwajcarii | Katalog Firm",
    description: "Katalog polskich firm i usług w Szwajcarii",
    images: ["https://katalog-firm.ch/logo.png"],
  },
  alternates: {
    canonical: "https://katalog-firm.ch",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/icon.png', type: 'image/png', sizes: '512x512' },
  },
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
        name: "Polskie Usługi w Szwajcarii",
        description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne",
        publisher: {
          "@id": "https://katalog-firm.ch#organization"
        },
        inLanguage: "pl-PL",
      }
    ]
  };

  return (
    <html lang="pl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#E30613" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script defer src="https://stats.katalog-firm.ch/script.js" data-website-id="29e9d993-03f9-4c30-976b-bc2fc1cd1f20" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

