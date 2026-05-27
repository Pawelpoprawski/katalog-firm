import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Jak to działa? | Katalog Firm w Szwajcarii",
  description: "Dowiedz się jak dodać swoją firmę do katalogu polskich usług w Szwajcarii. 3 proste kroki — dodaj, czekaj na weryfikację, zdobywaj klientów.",
  keywords: ["jak dodać firmę", "katalog firm", "rejestracja firmy", "polskie usługi Szwajcaria"],
  openGraph: {
    title: "Jak to działa? | Katalog Firm",
    description: "3 proste kroki do dodania firmy w katalogu polskich usług w Szwajcarii.",
    url: "https://katalog-firm.ch/jak-to-dziala",
  },
  alternates: { canonical: "https://katalog-firm.ch/jak-to-dziala" },
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "Dodaj swoją firmę",
      description: "Wypełnij prosty formularz z danymi Twojej firmy — nazwa, opis, zdjęcia, kontakt. Zajmie Ci to maks. 5 minut.",
    },
    {
      number: "02",
      title: "Weryfikacja",
      description: "Nasz zespół sprawdzi Twoje ogłoszenie i opublikuje je w katalogu. Otrzymasz email z linkiem do edycji.",
    },
    {
      number: "03",
      title: "Zdobywaj klientów",
      description: "Twoja firma jest widoczna dla tysięcy Polaków w Szwajcarii. Otrzymujesz zapytania, opinie i rośniesz!",
    },
  ];

  const benefits = [
    { title: "Całkowicie za darmo", desc: "Dodanie firmy nie kosztuje nic. Zero ukrytych opłat." },
    { title: "Widoczność na mapie", desc: "Twoja firma pojawia się na interaktywnej mapie Szwajcarii." },
    { title: "Opinie klientów", desc: "Klienci mogą wystawiać recenzje, budując Twoją reputację." },
    { title: "Łatwa edycja", desc: "W każdej chwili możesz zmienić dane przez link z emaila." },
    { title: "Powiadomienia email", desc: "Dostajesz email z linkiem do edycji i o nowych recenzjach." },
    { title: "SEO & Google", desc: "Twoja firma jest indeksowana przez Google — klienci Cię znajdą." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-[#0D2240] text-white overflow-hidden">
        <div className="absolute inset-0 hays-pattern opacity-100 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] hays-red-glow pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
          <span className="hays-red-line mx-auto" />
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Jak to <span className="text-[#E1002A]">działa?</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Dodanie firmy do katalogu jest proste, szybkie i całkowicie darmowe. Wystarczą 3 kroki.
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14 lg:py-20 space-y-20">
        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="hays-cat-card relative rounded-md border border-[#E0E3E8] bg-white p-7 space-y-3"
            >
              <div className="font-display text-5xl font-bold text-[#E1002A]/20 leading-none">
                {step.number}
              </div>
              <h3 className="font-display text-xl font-bold text-[#0D2240]">{step.title}</h3>
              <p className="text-sm text-[#555] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dodaj"
            className="btn-hays text-base px-8 py-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Dodaj swoją firmę za darmo
          </Link>
        </div>

        {/* Benefits */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <span className="hays-red-line mx-auto" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0D2240]">Dlaczego warto?</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="hays-cat-card flex flex-col gap-2 p-5 rounded-md bg-white border border-[#E0E3E8]">
                <h3 className="font-display font-bold text-[#0D2240]">{b.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <span className="hays-red-line mx-auto" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0D2240]">Częste pytania</h2>
          </div>
          <div className="space-y-3 max-w-3xl mx-auto">
            {[
              { q: "Ile kosztuje dodanie firmy?", a: "Nic! Dodanie firmy do katalogu jest całkowicie darmowe." },
              { q: "Jak długo trwa weryfikacja?", a: "Zazwyczaj weryfikujemy nowe firmy w ciągu 24 godzin." },
              { q: "Czy mogę edytować dane firmy po dodaniu?", a: "Tak! Po dodaniu firmy otrzymasz email z unikalnym linkiem do edycji. Możesz zmieniać dane w dowolnym momencie." },
              { q: "Czy muszę się rejestrować?", a: "Nie trzeba zakładać konta. Wystarczy podać email — na niego dostaniesz link do zarządzania ogłoszeniem." },
              { q: "Kto może dodać firmę?", a: "Każdy kto prowadzi polską firmę lub oferuje usługi w Szwajcarii." },
            ].map((faq) => (
              <details key={faq.q} className="hays-cat-card group rounded-md border border-[#E0E3E8] bg-white">
                <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-3">
                  <h3 className="font-display font-bold text-[#0D2240]">{faq.q}</h3>
                  <svg className="w-5 h-5 text-[#E1002A] flex-shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 text-sm text-[#555] leading-relaxed border-t border-[#E0E3E8] pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <section className="relative overflow-hidden rounded-md bg-[#0D2240] px-8 py-14 text-center">
          <div className="absolute inset-0 hays-pattern pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-80 h-80 hays-red-glow pointer-events-none" />
          <div className="relative z-10 space-y-5">
            <span className="hays-red-line mx-auto" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Gotowy aby dołączyć?</h2>
            <p className="text-white/70 text-base sm:text-lg max-w-lg mx-auto">
              Dołącz do ponad 100 polskich firm już obecnych w katalogu i zacznij zdobywać nowych klientów.
            </p>
            <div>
              <Link href="/dodaj" className="btn-hays text-base px-8 py-4">
                Dodaj firmę — to trwa 5 minut
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
