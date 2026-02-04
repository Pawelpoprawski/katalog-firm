import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  metadataBase: new URL('https://polacyszwajcaria.com/uslugi'),
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
    url: "https://polacyszwajcaria.com/uslugi",
    siteName: "Polskie Usługi w Szwajcarii",
    locale: "pl_PL",
    images: [
      {
        url: "logo.png",
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
    images: ["logo.png"],
  },
  alternates: {
    canonical: "https://polacyszwajcaria.com/uslugi",
  },
  icons: {
    icon: [
      { url: 'favicon.ico' },  // Relative path works with basePath
      { url: 'icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: 'icon.png', type: 'image/png', sizes: '512x512' },
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
        "@id": "https://polacyszwajcaria.com/uslugi#organization",
        name: "Polskie Usługi w Szwajcarii",
        url: "https://polacyszwajcaria.com/uslugi",
        logo: {
          "@type": "ImageObject",
          url: "logo.png",
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
        "@id": "https://polacyszwajcaria.com/uslugi#website",
        url: "https://polacyszwajcaria.com/uslugi",
        name: "Polskie Usługi w Szwajcarii",
        description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne",
        publisher: {
          "@id": "https://polacyszwajcaria.com/uslugi#organization"
        },
        inLanguage: "pl-PL",
      }
    ]
  };

  return (
    <html lang="pl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

