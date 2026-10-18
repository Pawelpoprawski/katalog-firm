/** POWIĄZANIA
 * Cel: KOPIA banera zgody na pliki cookie z portalu (web/src/components/consent/CookieBanner.tsx), kolory wpisane na sztywno.
 * Przy zmianie: tekst i wygląd trzymaj jak w portalu i w drugim repo; logika w lib/consent.ts (wspólne ciasteczko psz_consent).
 * AUTO używany przez: frontend/src/app/layout.tsx
 */
"use client";

// Ten sam baner co na portalu: wybór raz dla całej domeny (portal, katalog, praca). „Odrzucam” blokuje treści zewnętrzne
// (Google Maps, YouTube, GetYourGuide). Linki do polityki bez basePath - jedna polityka na portalu.

import { useEffect, useState } from "react";
import { onConsentOpen, readConsent, saveConsent, type ConsentChoice } from "@/lib/consent";

export default function CookieBanner() {
  const [open, setOpen] = useState(false); // decyzja po zamontowaniu (SSR nie zna ciasteczka)
  useEffect(() => {
    if (!readConsent()) setOpen(true);
    return onConsentOpen(() => setOpen(true));
  }, []);
  if (!open) return null;

  function choose(c: ConsentChoice) {
    saveConsent(c);
    setOpen(false);
  }

  return (
    <div role="dialog" aria-live="polite" aria-label="Pliki cookie"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md sm:p-0">
      <div className="rounded-2xl border border-[#ECEEF1] bg-white p-5 shadow-[0_10px_30px_-10px_rgba(13,34,64,0.25)]">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-6 w-6 shrink-0 text-[#E1002A]" aria-hidden="true">
            <path d="M21 12.5A9 9 0 1 1 11.5 3a3 3 0 0 0 3.5 3.5 3 3 0 0 0 3.5 3.5 3 3 0 0 0 2.5 2.5Z" strokeLinejoin="round" />
            <circle cx="8.5" cy="10.5" r="1" fill="currentColor" /><circle cx="12" cy="15.5" r="1" fill="currentColor" /><circle cx="16" cy="13" r="1" fill="currentColor" />
          </svg>
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-[#16243B]">Pliki cookie</p>
            <p className="mt-1 text-sm leading-relaxed text-[#3A4658]">
              Nie używamy reklam ani śledzenia. Za Twoją zgodą wczytamy też treści z zewnątrz: mapy Google, filmy YouTube
              i oferty wycieczek GetYourGuide. Te serwisy zapisują własne pliki cookie. Szczegóły w{" "}
              <a href="/polityka-prywatnosci/#cookies" className="font-semibold text-[#E1002A] underline-offset-2 hover:underline">polityce prywatności</a>.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => choose("rejected")}
            className="rounded-lg border border-[#16243B]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#16243B] transition hover:border-[#16243B]">
            Odrzucam
          </button>
          <button onClick={() => choose("accepted")}
            className="rounded-lg bg-[#0D2240] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1B3A63]">
            Akceptuję
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[#6B7280]">Zmienisz zdanie w każdej chwili: link „Pliki cookie” w stopce.</p>
      </div>
    </div>
  );
}
