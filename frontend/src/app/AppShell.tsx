"use client";

import { useEffect } from "react";

// Powłoka aplikacji — od 15.07.2026 katalog żyje pod polacyszwajcaria.com/katalog-firm
// i używa WSPÓLNEGO paska portalu (PortalBar w layout.tsx, menu z API portalu).
// Własny nagłówek („Katalog Firm / część portalu…"), stopka i banner cookies USUNIĘTE
// na życzenie — portal ma swoje (jedna nawigacja, bez menu-w-menu i podwójnych zgód).
export default function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 animate-fade-in">{children}</main>
    </div>
  );
}
