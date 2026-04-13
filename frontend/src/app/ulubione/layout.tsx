import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ulubione firmy | Katalog Firm w Szwajcarii",
  description: "Twoje ulubione polskie firmy w Szwajcarii. Zapisuj i przeglądaj wybrane usługi.",
  robots: { index: false, follow: false },
};

export default function UlubioneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
