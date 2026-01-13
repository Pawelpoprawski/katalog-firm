export const metadata = {
  title: "Polityka prywatności | Polskie usługi w Szwajcarii",
  description: "Informacje o przetwarzaniu danych w katalogu polskich firm w Szwajcarii.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Polityka prywatności</h1>
      <p className="text-slate-700 dark:text-slate-300">
        Dbamy o bezpieczeństwo Twoich danych. Poniżej znajdziesz informacje o sposobie ich przetwarzania w ramach
        katalogu „Polskie usługi w Szwajcarii”.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Administrator danych</h2>
        <p className="text-slate-700 dark:text-slate-300">
          Administratorem jest zespół PolacySzwajcaria.com. W sprawach danych osobowych możesz kontaktować się pod
          adresem e-mail: <a className="text-primary hover:underline" href="mailto:kontakt@polacyszwajcaria.com">kontakt@polacyszwajcaria.com</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Zakres i cel przetwarzania</h2>
        <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 space-y-2">
          <li>Obsługa kont i ogłoszeń w katalogu firm.</li>
          <li>Kontakt z użytkownikami (zapytania o ofertę, zgłoszenia nadużyć).</li>
          <li>Podstawowe statystyki działania serwisu (anonimowe agregaty).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Podstawa prawna</h2>
        <p className="text-slate-700 dark:text-slate-300">
          Przetwarzanie danych odbywa się na podstawie Twojej zgody (np. podczas dodania ogłoszenia) lub prawnie
          uzasadnionego interesu administratora (utrzymanie serwisu, przeciwdziałanie nadużyciom).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Czas przechowywania danych</h2>
        <p className="text-slate-700 dark:text-slate-300">
          Dane przechowujemy tak długo, jak wymaga tego realizacja usług w katalogu lub do momentu cofnięcia zgody, jeśli
          była podstawą przetwarzania.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Twoje prawa</h2>
        <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 space-y-2">
          <li>Dostęp do danych oraz uzyskanie kopii.</li>
          <li>Sprostowanie danych.</li>
          <li>Usunięcie danych („prawo do bycia zapomnianym”) w uzasadnionych przypadkach.</li>
          <li>Ograniczenie przetwarzania lub sprzeciw wobec przetwarzania.</li>
          <li>Przeniesienie danych w formacie nadającym się do odczytu maszynowego.</li>
        </ul>
        <p className="text-slate-700 dark:text-slate-300">
          Aby skorzystać z praw, skontaktuj się mailowo:{" "}
          <a className="text-primary hover:underline" href="mailto:kontakt@polacyszwajcaria.com">kontakt@polacyszwajcaria.com</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pliki cookies</h2>
        <p className="text-slate-700 dark:text-slate-300">
          Serwis wykorzystuje pliki cookies do podstawowych funkcji (sesja, preferencje) oraz anonimowych statystyk. Możesz
          zarządzać cookies w ustawieniach przeglądarki.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Kontakt</h2>
        <p className="text-slate-700 dark:text-slate-300">
          W sprawach związanych z prywatnością napisz na{" "}
          <a className="text-primary hover:underline" href="mailto:kontakt@polacyszwajcaria.com">kontakt@polacyszwajcaria.com</a>.
        </p>
      </section>
    </div>
  );
}

