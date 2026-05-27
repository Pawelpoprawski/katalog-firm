"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const NAV_ITEMS = [
  { href: "/", label: "Strona główna", exact: true },
  { href: "/dodaj", label: "Dodaj firmę" },
  { href: "/jak-to-dziala", label: "Jak to działa" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [user, setUser] = useState<{ email?: string; first_name?: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;

    const consent = window.localStorage.getItem("cookie_consent");
    if (consent !== "accepted") setShowCookieBanner(true);

    try {
      const raw = window.localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }

    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const acceptCookies = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cookie_consent", "accepted");
    }
    setShowCookieBanner(false);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("user");
    }
    setUser(null);
    window.location.href = "/";
  };

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* === Header === */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E0E3E8]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-[72px] gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/"
                aria-label="Strona główna"
                className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group"
              >
                <Image
                  src={`${basePath}/logo.png`}
                  alt="Katalog Firm"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  priority
                />
              </Link>
              <div className="leading-tight min-w-0">
                <Link
                  href="/"
                  className="block font-display font-extrabold text-[1.05rem] sm:text-[1.4rem] text-[#0D2240] whitespace-nowrap no-underline"
                >
                  Katalog <span className="text-[#E1002A]">Firm</span>
                </Link>
                <a
                  href="https://polacyszwajcaria.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[0.6rem] sm:text-[0.65rem] text-[#888] tracking-[0.05em] -mt-0.5 no-underline hover:text-[#E1002A] transition-colors"
                >
                  część portalu <span className="font-semibold">PolacySzwajcaria.com</span>
                </a>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-7">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hays-nav-link ${isActive(item) ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {isMounted && user ? (
                <>
                  <Link
                    href="/konto"
                    className="flex items-center gap-2 text-sm text-[#555] bg-[#F5F6F8] px-3 py-1.5 rounded border border-[#E0E3E8] hover:border-[#E1002A] transition-colors"
                  >
                    <span className="w-6 h-6 bg-[#FFF0F3] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-[#E1002A]">
                        {(user.first_name || user.email || "U")[0].toUpperCase()}
                      </span>
                    </span>
                    <span className="font-medium">{user.first_name || user.email}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-[#888] hover:text-[#E1002A] transition-colors"
                    aria-label="Wyloguj"
                    title="Wyloguj się"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </>
              ) : (
                <Link href="/dodaj" className="btn-hays">
                  Dodaj firmę
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 hover:bg-[#F5F6F8] rounded transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6 text-[#0D2240]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#0D2240]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="lg:hidden border-t border-[#E0E3E8] bg-white shadow-xl animate-fade-in">
            <div className="px-4 py-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between text-[#0D2240] font-semibold py-3 px-4 rounded hover:bg-[#F5F6F8] transition-colors no-underline"
                >
                  {item.label}
                  <svg className="w-4 h-4 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}

              <div className="h-px bg-[#E0E3E8] my-2" />

              {isMounted && user ? (
                <>
                  <Link
                    href="/konto"
                    className="flex items-center gap-3 text-[#0D2240] font-semibold py-3 px-4 rounded hover:bg-[#F5F6F8] transition-colors no-underline"
                  >
                    <span className="w-7 h-7 bg-[#FFF0F3] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-[#E1002A]">
                        {(user.first_name || user.email || "U")[0].toUpperCase()}
                      </span>
                    </span>
                    Moje konto
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-[#E1002A] font-semibold py-3 px-4 rounded hover:bg-[#FFF0F3] transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Wyloguj się
                  </button>
                </>
              ) : (
                <Link
                  href="/dodaj"
                  className="block text-[#0D2240] font-semibold py-3 px-4 rounded hover:bg-[#F5F6F8] transition-colors no-underline"
                >
                  Dodaj firmę
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* === Main === */}
      <main className="flex-1 animate-fade-in">{children}</main>

      {/* === Footer === */}
      <footer className="bg-[#0D2240] text-white/85 mt-auto">
        <div className="max-w-[1200px] mx-auto px-6 pt-12 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr] gap-10 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src={`${basePath}/logo.png`}
                  alt="Katalog Firm"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain flex-shrink-0"
                />
                <span className="font-display font-extrabold text-[1.4rem] text-white leading-none">
                  Katalog <span className="text-[#E1002A]">Firm</span>
                </span>
              </div>
              <p className="text-[0.85rem] text-white/50 leading-[1.7] max-w-[320px]">
                Część portalu{" "}
                <a
                  href="https://polacyszwajcaria.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white/70 hover:text-white no-underline"
                >
                  PolacySzwajcaria.com
                </a>{" "}
                — od 2024 roku tworzymy największą polską społeczność dla Polaków w Szwajcarii. Nie jesteśmy anonimowi.
              </p>
            </div>

            {/* Dla firm */}
            <div>
              <h4 className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-white mb-4">
                Dla firm
              </h4>
              <ul className="flex flex-col gap-2.5 list-none">
                <li>
                  <Link
                    href="/dodaj"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Dodaj firmę
                  </Link>
                </li>
                <li>
                  <Link
                    href="/jak-to-dziala"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Jak to działa
                  </Link>
                </li>
              </ul>
            </div>

            {/* O nas */}
            <div>
              <h4 className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-white mb-4">
                O nas
              </h4>
              <ul className="flex flex-col gap-2.5 list-none">
                <li>
                  <Link
                    href="/regulamin"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Regulamin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/polityka-prywatnosci"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Polityka prywatności
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:kontakt@polacyszwajcaria.com"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>

            {/* Pozostałe portale */}
            <div>
              <h4 className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-white mb-4">
                Nasze pozostałe portale
              </h4>
              <ul className="flex flex-col gap-2.5 list-none">
                <li>
                  <a
                    href="https://polacyszwajcaria.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    PolacySzwajcaria.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://praca-w-szwajcarii.ch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white text-[0.88rem] transition-colors no-underline"
                  >
                    Praca-w-szwajcarii.ch
                  </a>
                </li>
              </ul>
              <div className="mt-5 flex gap-3">
                <a
                  href="https://www.facebook.com/PolacySzwajcaria2024"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#E1002A] flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[0.78rem] text-white/40">
            <span>
              © {new Date().getFullYear()} Katalog Firm Polonijnych w Szwajcarii. Wszystkie prawa zastrzeżone.
            </span>
            <div className="flex gap-5 flex-wrap justify-center">
              <Link href="/regulamin" className="text-white/40 hover:text-white transition-colors no-underline">
                Regulamin
              </Link>
              <Link
                href="/polityka-prywatnosci"
                className="text-white/40 hover:text-white transition-colors no-underline"
              >
                Polityka prywatności
              </Link>
              <Link
                href="/polityka-prywatnosci#rodo"
                className="text-white/40 hover:text-white transition-colors no-underline"
              >
                RODO
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* === Cookie banner === */}
      {showCookieBanner && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-sm w-full mx-4 sm:mx-0">
          <div className="bg-white border border-[#E0E3E8] shadow-2xl rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#FFF0F3] p-2 rounded-md text-[#E1002A] flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#0D2240] mb-1">Ciasteczka</h4>
                <p className="text-xs text-[#555] leading-relaxed mb-4">
                  Używamy plików cookies, aby zapewnić Ci najlepszą jakość korzystania z naszego portalu.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={acceptCookies}
                    className="flex-1 rounded-md bg-[#E1002A] px-4 py-2 text-xs font-bold text-white hover:bg-[#B8001F] transition-colors"
                  >
                    Akceptuję
                  </button>
                  <button
                    onClick={() => setShowCookieBanner(false)}
                    className="rounded-md border border-[#E0E3E8] px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F6F8] transition-colors"
                  >
                    Nie teraz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
