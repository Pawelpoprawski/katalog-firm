/** POWIĄZANIA
 * Cel: katalog - treść Google Maps tylko po zgodzie na pliki cookie (inaczej zaślepka z „Pokaż”). Odpowiednik portalowego ExternalGate.
 * Przy zmianie: zgoda w lib/consent.ts (wspólna z portalem i pracą); tekst zgodny z polityką prywatności portalu.
 * AUTO używany przez: frontend/src/app/companies/[slug]/page.tsx, frontend/src/app/dodaj/page.tsx, frontend/src/app/edycja/[token]/page.tsx, frontend/src/app/firma/[slug]/CompanyPageClient.tsx, frontend/src/app/page.tsx
 */
"use client";

import type { ReactNode } from "react";
import { allowOnce, saveConsent, useConsent, type ExternalService } from "@/lib/consent";

const NAMES: Record<ExternalService, string> = { "google-maps": "Google Maps", youtube: "YouTube", getyourguide: "GetYourGuide" };

/** Zaślepka bez dzieci - dla miejsc, które same ładują skrypt (mapa na liście firm, podpowiedzi adresów). */
export function ConsentPlaceholder({ service, what, height = 220, dark = false }: { service: ExternalService; what: string; height?: number | string; dark?: boolean }) {
  const name = NAMES[service];
  return (
    <div className={`flex h-full flex-col items-center justify-center px-5 py-6 text-center ${dark ? "bg-[#0D2240] text-white" : "rounded-xl border border-dashed border-[#16243B]/20 bg-[#F6F7F9]"}`} style={{ minHeight: height }}>
      <p className={`text-sm font-bold ${dark ? "text-white" : "text-[#16243B]"}`}>{what}</p>
      <p className={`mt-1 max-w-sm text-xs leading-relaxed ${dark ? "text-white/70" : "text-[#6B7280]"}`}>
        Treść z serwisu {name}. Po wczytaniu {name} może zapisać pliki cookie i zobaczy Twój adres IP.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => allowOnce(service)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${dark ? "bg-white text-[#0D2240] hover:bg-white/90" : "bg-[#0D2240] text-white hover:bg-[#1B3A63]"}`}>Pokaż</button>
        <button type="button" onClick={() => saveConsent("accepted")} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${dark ? "border-white/40 text-white hover:border-white" : "border-[#16243B]/20 bg-white text-[#16243B] hover:border-[#16243B]"}`}>
          Zawsze pokazuj treści zewnętrzne
        </button>
      </div>
    </div>
  );
}

export default function ExternalGate({ service, what, height = 220, children }: { service: ExternalService; what: string; height?: number | string; children: ReactNode }) {
  const { allowed, ready } = useConsent(service);
  if (allowed) return <>{children}</>;
  if (!ready) return <div className="h-full bg-[#F6F7F9]" style={{ minHeight: height }} aria-hidden="true" />;
  return <ConsentPlaceholder service={service} what={what} height={height} />;
}

/** Pod polem adresu (dodaj / edycja): podpowiedzi Google Places tylko po zgodzie - inaczej krótka notka z „Włącz”. */
export function PlacesConsentNote() {
  const { allowed, ready } = useConsent("google-maps");
  if (allowed || !ready) return null;
  return (
    <p className="text-xs text-[#6B7280]">
      Podpowiedzi adresów z Google Maps są wyłączone (pliki cookie). Adres możesz wpisać ręcznie albo{" "}
      <button type="button" onClick={() => allowOnce("google-maps")} className="font-semibold text-[#E1002A] hover:underline">włączyć podpowiedzi</button>.
    </p>
  );
}
