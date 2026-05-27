import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-[#F5F6F8] py-20">
      <span className="hays-red-line mx-auto" />
      <h1 className="font-display text-7xl sm:text-8xl font-bold text-[#0D2240]">404</h1>
      <p className="mt-4 font-display text-xl sm:text-2xl text-[#0D2240]">
        Strona nie została znaleziona
      </p>
      <p className="mt-2 text-sm text-[#555] max-w-md">
        Sprawdź adres URL lub wróć na stronę główną katalogu.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-hays">
          Wróć na stronę główną
        </Link>
        <Link href="/dodaj" className="btn-hays-outline">
          Dodaj firmę
        </Link>
      </div>
    </div>
  );
}
