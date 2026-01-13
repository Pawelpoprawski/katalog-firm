import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Polskie usługi w Szwajcarii | PolacySzwajcaria",
  description: "Katalog polskich firm i usług w Szwajcarii. Znajdź sprawdzone firmy polonijne – budownictwo, transport, gastronomia, IT i więcej.",
  openGraph: {
    title: "Polskie usługi w Szwajcarii | PolacySzwajcaria",
    description: "Katalog polskich firm i usług w Szwajcarii",
    type: "website",
    url: "https://polacyszwajcaria.com/uslugi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polskie usługi w Szwajcarii | PolacySzwajcaria",
    description: "Katalog polskich firm i usług w Szwajcarii",
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

