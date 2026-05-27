import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności | Katalog Firm w Szwajcarii",
  description: "Informacje o przetwarzaniu danych osobowych w katalogu polskich firm w Szwajcarii. RODO, cookies, prawa użytkownika.",
  openGraph: {
    title: "Polityka prywatności | Katalog Firm",
    description: "Informacje o przetwarzaniu danych osobowych w katalogu polskich firm w Szwajcarii.",
    url: "https://katalog-firm.ch/polityka-prywatnosci",
  },
  alternates: {
    canonical: "https://katalog-firm.ch/polityka-prywatnosci",
  },
};

const sectionH2 = "font-display text-xl font-bold text-[#0D2240]";
const bodyText = "text-[#1A1A1A] leading-relaxed";
const linkClass = "text-[#E1002A] hover:underline font-medium";
const ul = "list-disc pl-5 text-[#1A1A1A] space-y-2";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#F5F6F8] py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E0E3E8] rounded-md p-6 sm:p-10 space-y-7">
          <div className="space-y-3">
            <span className="hays-red-line" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0D2240]">Polityka prywatności</h1>
          </div>

          <p className={bodyText}>
            Dbamy o bezpieczeństwo Twoich danych. Poniżej znajdziesz informacje o sposobie ich przetwarzania w ramach
            katalogu „Polskie usługi w Szwajcarii”.
          </p>

          <section className="space-y-3" id="administrator">
            <h2 className={sectionH2}>Administrator danych</h2>
            <p className={bodyText}>
              Administratorem jest zespół PolacySzwajcaria.com. W sprawach danych osobowych możesz kontaktować się pod
              adresem e-mail:{" "}
              <a className={linkClass} href="mailto:kontakt@polacyszwajcaria.com">
                kontakt@polacyszwajcaria.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3" id="zakres">
            <h2 className={sectionH2}>Zakres i cel przetwarzania</h2>
            <ul className={ul}>
              <li>Obsługa kont i ogłoszeń w katalogu firm.</li>
              <li>Kontakt z użytkownikami (zapytania o ofertę, zgłoszenia nadużyć).</li>
              <li>Podstawowe statystyki działania serwisu (anonimowe agregaty).</li>
            </ul>
          </section>

          <section className="space-y-3" id="podstawa">
            <h2 className={sectionH2}>Podstawa prawna</h2>
            <p className={bodyText}>
              Przetwarzanie danych odbywa się na podstawie Twojej zgody (np. podczas dodania ogłoszenia) lub prawnie
              uzasadnionego interesu administratora (utrzymanie serwisu, przeciwdziałanie nadużyciom).
            </p>
          </section>

          <section className="space-y-3" id="czas">
            <h2 className={sectionH2}>Czas przechowywania danych</h2>
            <p className={bodyText}>
              Dane przechowujemy tak długo, jak wymaga tego realizacja usług w katalogu lub do momentu cofnięcia zgody,
              jeśli była podstawą przetwarzania.
            </p>
          </section>

          <section className="space-y-3" id="rodo">
            <h2 className={sectionH2}>Twoje prawa (RODO)</h2>
            <ul className={ul}>
              <li>Dostęp do danych oraz uzyskanie kopii.</li>
              <li>Sprostowanie danych.</li>
              <li>Usunięcie danych („prawo do bycia zapomnianym”) w uzasadnionych przypadkach.</li>
              <li>Ograniczenie przetwarzania lub sprzeciw wobec przetwarzania.</li>
              <li>Przeniesienie danych w formacie nadającym się do odczytu maszynowego.</li>
            </ul>
            <p className={bodyText}>
              Aby skorzystać z praw, skontaktuj się mailowo:{" "}
              <a className={linkClass} href="mailto:kontakt@polacyszwajcaria.com">
                kontakt@polacyszwajcaria.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3" id="cookies">
            <h2 className={sectionH2}>Pliki cookies</h2>
            <p className={bodyText}>
              Serwis wykorzystuje pliki cookies do podstawowych funkcji (sesja, preferencje) oraz anonimowych
              statystyk. Możesz zarządzać cookies w ustawieniach przeglądarki.
            </p>
          </section>

          <section className="space-y-3" id="kontakt">
            <h2 className={sectionH2}>Kontakt</h2>
            <p className={bodyText}>
              W sprawach związanych z prywatnością napisz na{" "}
              <a className={linkClass} href="mailto:kontakt@polacyszwajcaria.com">
                kontakt@polacyszwajcaria.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
