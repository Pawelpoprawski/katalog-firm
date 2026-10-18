/** POWIĄZANIA
 * Cel: link „Pliki cookie” w stopce - otwiera ponownie wspólny baner zgody (KOPIA z portalu).
 * Przy zmianie: zdarzenie z lib/consent.ts (openConsentBanner); baner CookieBanner zamontowany w app/layout.tsx.
 * AUTO używany przez: frontend/src/components/PortalFooter.tsx
 */
"use client";

import { openConsentBanner } from "@/lib/consent";

export default function CookieSettingsLink({ className }: { className?: string }) {
  return <button type="button" onClick={openConsentBanner} className={className}>Pliki cookie</button>;
}
