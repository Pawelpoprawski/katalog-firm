import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logowanie | Katalog Firm w Szwajcarii",
  description: "Zaloguj się do swojego konta w katalogu polskich firm w Szwajcarii. Zarządzaj swoimi ogłoszeniami.",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
