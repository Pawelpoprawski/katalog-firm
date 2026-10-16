/** POWIĄZANIA
 * Cel: brandowany ekran błędu renderu (error boundary App Routera) + automatyczne przeładowanie przy
 *   ChunkLoadError (stary HTML z cache Cloudflare wskazuje chunki JS z poprzedniego builda).
 * Przy zmianie: nie może importować niczego, co samo może rzucić błąd. Ten sam mechanizm w portalu (web/src/app/error.tsx).
 * AUTO plik specjalny Next.js (error) - ładowany przez framework, nie przez import
 */
"use client";

import { useEffect } from "react";

function isChunkError(error: Error): boolean {
  const msg = `${error?.name || ""} ${error?.message || ""}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module/i.test(msg);
}

// Jedno przeładowanie z parametrem omijającym cache (świeży HTML z serwera); bez zapętlania.
function reloadOnceForFreshHtml(): boolean {
  try {
    const KEY = "psz_chunk_reload";
    const last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
    const u = new URL(window.location.href);
    u.searchParams.set("r", String(Date.now()));
    window.location.replace(u.toString());
    return true;
  } catch {
    return false;
  }
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Render error:", error);
    if (isChunkError(error)) reloadOnceForFreshHtml();
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <span className="font-display text-6xl font-bold text-[#E1002A]">Ups!</span>
      <h1 className="mt-4 font-display text-2xl font-bold text-[#0D2240]">Coś poszło nie tak</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Wystąpił nieoczekiwany błąd. Spróbuj ponownie - jeśli problem się powtarza, wróć na stronę główną.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#E1002A] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#B8001F]"
        >
          Spróbuj ponownie
        </button>
        <a
          href="/katalog-firm"
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#0D2240] transition-colors hover:border-[#E1002A] hover:text-[#E1002A]"
        >
          Strona główna
        </a>
      </div>
    </div>
  );
}
