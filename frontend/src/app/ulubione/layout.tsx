import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ulubione firmy",
  description: "Twoje ulubione polskie firmy w Szwajcarii. Zapisuj i przeglądaj wybrane usługi polonijne.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://katalog-firm.ch/ulubione" },
};

export default function UlubioneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
