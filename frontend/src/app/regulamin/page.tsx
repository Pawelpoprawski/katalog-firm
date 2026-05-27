import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regulamin | Katalog Firm Polonijnych w Szwajcarii",
  description:
    "Regulamin korzystania z katalogu polskich firm w Szwajcarii. Zasady darmowego dodawania wpisów, prawa i obowiązki użytkowników.",
  openGraph: {
    title: "Regulamin | Katalog Firm",
    description:
      "Regulamin korzystania z katalogu polskich firm w Szwajcarii. Dodawanie wpisów jest bezpłatne.",
    url: "https://katalog-firm.ch/regulamin",
  },
  alternates: {
    canonical: "https://katalog-firm.ch/regulamin",
  },
};

export default function RegulaminPage() {
  return (
    <div className="bg-[#F5F6F8] py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E0E3E8] rounded-md p-6 sm:p-10 space-y-7">
          <div className="space-y-3">
            <span className="hays-red-line" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0D2240]">
              Regulamin katalogu firm
            </h1>
          </div>
      <p className="text-[#1A1A1A]">
        Poniższy regulamin określa zasady korzystania z serwisu{" "}
        <strong>Katalog Firm Polonijnych w Szwajcarii</strong> dostępnego pod
        adresem{" "}
        <a
          className="text-primary hover:underline"
          href="https://katalog-firm.ch"
        >
          katalog-firm.ch
        </a>
        . Serwis jest częścią portalu{" "}
        <a
          className="text-primary hover:underline"
          href="https://polacyszwajcaria.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          PolacySzwajcaria.com
        </a>
        .
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §1. Postanowienia ogólne
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            Operatorem serwisu jest zespół PolacySzwajcaria — Natalia i Paweł.
            Kontakt:{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:kontakt@polacyszwajcaria.com"
            >
              kontakt@polacyszwajcaria.com
            </a>
            .
          </li>
          <li>
            Serwis udostępnia darmową przestrzeń do prezentacji polskich firm i
            usług działających na terenie Szwajcarii.
          </li>
          <li>
            Korzystanie z serwisu (zarówno przeglądanie, jak i dodawanie wpisów)
            oznacza akceptację niniejszego regulaminu.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §2. Bezpłatne dodawanie firm
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            <strong>Dodanie firmy do katalogu jest całkowicie bezpłatne.</strong>{" "}
            Każda osoba lub podmiot prowadzący działalność polonijną w
            Szwajcarii może utworzyć wpis za pośrednictwem formularza{" "}
            <Link href="/dodaj" className="text-primary hover:underline">
              /dodaj
            </Link>
            .
          </li>
          <li>
            Nie pobieramy żadnych opłat za publikację wpisu, jego utrzymanie ani
            za podstawową widoczność w wynikach katalogu.
          </li>
          <li>
            Wpis może obejmować nazwę firmy, opis działalności, kategorię, dane
            kontaktowe, adres, lokalizację na mapie, zdjęcia oraz linki do stron
            społecznościowych.
          </li>
          <li>
            Po wysłaniu formularza wpis trafia do moderacji. Po pozytywnej
            weryfikacji jest publikowany i widoczny w katalogu.
          </li>
          <li>
            Operator zastrzega sobie prawo do odmowy publikacji wpisu, który
            narusza regulamin, prawo lub dobre obyczaje — bez konieczności
            podawania szczegółowego uzasadnienia.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §3. Edycja i zarządzanie wpisem
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            Po dodaniu firmy autor wpisu otrzymuje unikalny link edycyjny
            (zawierający token), który pozwala na późniejszą aktualizację danych
            bez konieczności zakładania konta.
          </li>
          <li>
            Link edycyjny należy zachować — jest jedynym sposobem na samodzielne
            modyfikowanie wpisu. W razie jego utraty skontaktuj się z
            administracją.
          </li>
          <li>
            Właściciel wpisu ma prawo w dowolnym momencie zażądać usunięcia
            swojej firmy z katalogu.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §4. Obowiązki użytkownika
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            Dodawane treści muszą być prawdziwe, aktualne i nie wprowadzać w
            błąd osób korzystających z katalogu.
          </li>
          <li>
            Użytkownik oświadcza, że posiada prawa do publikowanych treści, w
            szczególności do zdjęć, logotypów i opisów.
          </li>
          <li>
            Zabronione jest publikowanie treści: niezgodnych z prawem,
            obraźliwych, dyskryminujących, naruszających prawa osób trzecich,
            spamerskich, oszukańczych lub reklamujących działalność niezgodną z
            prawem szwajcarskim lub polskim.
          </li>
          <li>
            Każdy użytkownik może zgłosić nieprawidłowy wpis poprzez przycisk
            zgłoszenia na stronie firmy lub mailowo.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §5. Recenzje i opinie
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            Użytkownicy mogą zostawiać opinie o firmach. Opinie powinny być
            rzetelne, oparte na faktycznym doświadczeniu i napisane z
            zachowaniem kultury wypowiedzi.
          </li>
          <li>
            Operator zastrzega sobie prawo do usuwania opinii naruszających
            regulamin, zawierających wulgaryzmy, nieprawdziwe oskarżenia lub
            stanowiących próbę manipulacji oceną firmy.
          </li>
          <li>
            Firmy nie mają możliwości samodzielnego usuwania negatywnych opinii
            — mogą jednak zgłosić nieprawidłową opinię do moderacji.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §6. Odpowiedzialność operatora
        </h2>
        <ol className="list-decimal pl-5 text-[#1A1A1A] space-y-2">
          <li>
            Operator nie ponosi odpowiedzialności za treści publikowane przez
            użytkowników ani za jakość, zakres i sposób świadczenia usług przez
            firmy widoczne w katalogu.
          </li>
          <li>
            Operator dokłada starań, aby serwis działał prawidłowo, ale nie
            gwarantuje jego nieprzerwanej dostępności. Możliwe są okresowe
            przerwy techniczne.
          </li>
          <li>
            Wszelkie rozliczenia, umowy i transakcje są zawierane wyłącznie
            pomiędzy użytkownikami i firmami — operator nie jest ich stroną.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §7. Dane osobowe
        </h2>
        <p className="text-[#1A1A1A]">
          Zasady przetwarzania danych osobowych opisane są w odrębnym
          dokumencie{" "}
          <Link
            href="/polityka-prywatnosci"
            className="text-primary hover:underline"
          >
            Polityka prywatności
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §8. Zmiany regulaminu
        </h2>
        <p className="text-[#1A1A1A]">
          Operator zastrzega sobie prawo do zmiany regulaminu. O istotnych
          zmianach użytkownicy zostaną poinformowani z odpowiednim wyprzedzeniem
          — m.in. poprzez komunikat na stronie głównej lub mailem (jeśli adres
          został podany przy dodawaniu firmy).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[#0D2240]">
          §9. Kontakt
        </h2>
        <p className="text-[#1A1A1A]">
          W sprawach związanych z funkcjonowaniem serwisu napisz na{" "}
          <a
            className="text-primary hover:underline"
            href="mailto:kontakt@polacyszwajcaria.com"
          >
            kontakt@polacyszwajcaria.com
          </a>
          .
        </p>
      </section>

          <p className="text-xs text-[#888] pt-4 border-t border-[#E0E3E8]">
            Regulamin obowiązuje od dnia publikacji wpisu w katalogu.
          </p>
        </div>
      </div>
    </div>
  );
}
