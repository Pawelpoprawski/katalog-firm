/** POWIĄZANIA
 * Cel: KOPIA web/src/lib/consent.ts - zgoda na pliki cookie wspólna dla całej domeny (ciasteczko psz_consent, Path=/).
 * Przy zmianie: zmieniaj RAZEM z web/src/lib/consent.ts i praca/frontend/src/lib/consent.ts drugiego repo (ta sama nazwa ciasteczka,
 *   format v1.<wybór>.<id>.<czas> i zdarzenia). Log wyboru idzie do portalu: POST /api/consent/ (bez basePath - ta sama domena).
 * AUTO używany przez: frontend/src/app/dodaj/page.tsx, frontend/src/app/edycja/[token]/page.tsx, frontend/src/app/page.tsx, frontend/src/components/CookieBanner.tsx, frontend/src/components/CookieSettingsLink.tsx, frontend/src/components/ExternalGate.tsx
 */
"use client";

// Jeden wybór dla całej domeny polacyszwajcaria.com (portal, /katalog-firm, /praca-w-szwajcarii): ciasteczko z Path=/.
// „Odrzucam” = treści zewnętrzne zapisujące własne pliki cookie (Google Maps, YouTube, GetYourGuide) nie ładują się, zamiast
// nich zaślepka z „Pokaż” (zgoda tylko na tę stronę, w pamięci karty). Zmiana zdania: link „Pliki cookie” w stopce.

import { useEffect, useState } from "react";

export type ConsentChoice = "accepted" | "rejected";
export type ExternalService = "google-maps" | "youtube" | "getyourguide";

const COOKIE = "psz_consent";
const VERSION = "v1";
const MAX_AGE = 365 * 24 * 3600; // 12 miesięcy - potem pytamy ponownie
const EVENT = "psz-consent";
const OPEN_EVENT = "psz-consent-open";
const once = new Set<ExternalService>(); // „Pokaż” na tej stronie (do przeładowania)

type Stored = { choice: ConsentChoice; id: string; at: number };

export function readConsent(): Stored | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const [v, choice, id, at] = decodeURIComponent(m?.[1] || "").split(".");
  if (v !== VERSION || (choice !== "accepted" && choice !== "rejected")) return null;
  return { choice, id: id || "", at: Number(at) || 0 };
}

export function saveConsent(choice: ConsentChoice): void {
  const prev = readConsent();
  const id = prev?.id || Math.random().toString(36).slice(2, 12);
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(`${VERSION}.${choice}.${id}.${Date.now()}`)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
  // Dowód zgody (RODO art. 7): wybór, data, strona i losowy identyfikator - bez IP. Błąd logu nie blokuje wyboru.
  fetch("/api/consent/", {
    method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ choice, id, version: VERSION, path: location.pathname }),
  }).catch(() => {});
}

/** Pokaż tę jedną usługę na bieżącej stronie, bez zapisywania zgody. */
export function allowOnce(service: ExternalService): void {
  once.add(service);
  window.dispatchEvent(new Event(EVENT));
}

export function isAllowed(service: ExternalService): boolean {
  return readConsent()?.choice === "accepted" || once.has(service);
}

/** Otwórz baner ponownie (link „Pliki cookie” w stopce). */
export function openConsentBanner(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentOpen(cb: () => void): () => void {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}

/** null przed pierwszym renderem w przeglądarce (SSR nie zna ciasteczka) - wtedy pokazuj zaślepkę/nic, nie treść. */
export function useConsent(service?: ExternalService) {
  const [state, setState] = useState<{ choice: ConsentChoice | null; allowed: boolean; ready: boolean }>({ choice: null, allowed: false, ready: false });
  useEffect(() => {
    const sync = () => setState({ choice: readConsent()?.choice ?? null, allowed: service ? isAllowed(service) : false, ready: true });
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [service]);
  return state;
}
