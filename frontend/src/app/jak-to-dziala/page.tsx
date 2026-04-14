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
      number: "1",
      icon: "📝",
      title: "Dodaj swoją firmę",
      description: "Wypełnij prosty formularz z danymi Twojej firmy — nazwa, opis, zdjęcia, kontakt. Zajmie Ci to max 5 minut.",
      color: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-500",
    },
    {
      number: "2",
      icon: "✅",
      title: "Weryfikacja",
      description: "Nasz zespół sprawdzi Twoje ogłoszenie i opublikuje je w katalogu. Otrzymasz email z linkiem do edycji.",
      color: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-500",
    },
    {
      number: "3",
      icon: "🚀",
      title: "Zdobywaj klientów",
      description: "Twoja firma jest widoczna dla tysięcy Polaków w Szwajcarii. Otrzymujesz zapytania, opinie i rosniesz!",
      color: "bg-green-50 border-green-200",
      iconBg: "bg-green-500",
    },
  ];

  const benefits = [
    { icon: "💰", title: "Całkowicie za darmo", desc: "Dodanie firmy nie kosztuje nic. Zero ukrytych opłat." },
    { icon: "📱", title: "Widoczność na mapie", desc: "Twoja firma pojawia się na interaktywnej mapie Szwajcarii." },
    { icon: "⭐", title: "Opinie klientów", desc: "Klienci mogą wystawiać recenzje, budując Twoją reputację." },
    { icon: "✏️", title: "Łatwa edycja", desc: "W każdej chwili możesz zmienić dane przez link z emaila." },
    { icon: "📧", title: "Powiadomienia email", desc: "Dostajesz email z linkiem do edycji i o nowych recenzjach." },
    { icon: "🔍", title: "SEO & Google", desc: "Twoja firma jest indeksowana przez Google — klienci Cię znajdą." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
          Jak to <span className="text-primary">działa?</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Dodanie firmy do katalogu jest proste, szybkie i całkowicie darmowe. Wystarczą 3 kroki.
        </p>
      </div>

      {/* Steps */}
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`relative rounded-3xl border-2 ${step.color} p-8 text-center space-y-4 hover:shadow-lg transition-shadow`}
          >
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.iconBg} text-3xl shadow-lg`}>
              {step.icon}
            </div>
            <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-white font-black text-lg flex items-center justify-center shadow-lg">
              {step.number}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
            <p className="text-slate-600 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/dodaj"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-10 py-5 text-lg font-bold text-white shadow-xl shadow-primary/20 hover:bg-red-700 transition-all hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Dodaj swoją firmę za darmo
        </Link>
      </div>

      {/* Benefits */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center">Dlaczego warto?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-3xl flex-shrink-0">{b.icon}</span>
              <div>
                <h3 className="font-bold text-slate-900">{b.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center">Częste pytania</h2>
        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            { q: "Ile kosztuje dodanie firmy?", a: "Nic! Dodanie firmy do katalogu jest całkowicie darmowe." },
            { q: "Jak długo trwa weryfikacja?", a: "Zazwyczaj weryfikujemy nowe firmy w ciągu 24 godzin." },
            { q: "Czy mogę edytować dane firmy po dodaniu?", a: "Tak! Po dodaniu firmy otrzymasz email z unikalnym linkiem do edycji. Możesz zmieniać dane w dowolnym momencie." },
            { q: "Czy muszę się rejestrować?", a: "Nie trzeba zakładać konta. Wystarczy podać email — na niego dostaniesz link do zarządzania ogłoszeniem." },
            { q: "Kto może dodać firmę?", a: "Każdy kto prowadzi polską firmę lub oferuje usługi w Szwajcarii." },
          ].map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{faq.q}</h3>
              <p className="text-slate-600 mt-2 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center">
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white">Gotowy aby dołączyć?</h2>
          <p className="text-white/80 text-lg max-w-lg mx-auto">
            Dołącz do ponad 100 polskich firm już obecnych w katalogu i zacznij zdobywać nowych klientów.
          </p>
          <Link
            href="/dodaj"
            className="inline-block rounded-2xl bg-white px-10 py-4 text-lg font-bold text-primary shadow-xl hover:scale-105 transition-all"
          >
            Dodaj firmę — to trwa 5 minut
          </Link>
        </div>
      </div>
    </div>
  );
}
