import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">
        Strona nie została znaleziona
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
        Sprawdź adres URL lub wróć na stronę główną.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-red-700 transition-colors"
      >
        Wróć na stronę główną
      </Link>
    </div>
  );
}
