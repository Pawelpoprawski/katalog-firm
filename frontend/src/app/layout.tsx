import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  metadataBase: new URL('https://poprawskipawel.com'),
  title: "Polskie usługi w Szwajcarii | Katalog Firm",
  description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne – budownictwo, transport, gastronomia, IT i więcej.",
  keywords: ["polskie usługi", "Szwajcaria", "firmy polskie", "Polonia", "katalog firm", "usługi polonijne"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Polskie usługi w Szwajcarii | Katalog Firm",
    description: "Katalog polskich firm i usług w Szwajcarii",
    type: "website",
    url: "https://poprawskipawel.com",
    siteName: "Polskie Usługi w Szwajcarii",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polskie usługi w Szwajcarii | Katalog Firm",
    description: "Katalog polskich firm i usług w Szwajcarii",
  },
  alternates: {
    canonical: "https://poprawskipawel.com",
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/icon.png', type: 'image/png', sizes: '512x512' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

