"use client";

import { useEffect, useState } from "react";

// Wspólny pasek portalu PolacySzwajcaria — wygląd 1:1 z Header/HeaderNav portalu
// (logo + granatowy pasek menu z czerwonym akcentem). Menu przychodzi z API portalu
// (/api/menu — jedno źródło prawdy: baza edytowana w adminie portalu).
// Wszystkie linki to zwykłe <a> — nawigacja prowadzi do INNEJ aplikacji (portalu),
// więc client-routing Next.js katalogu nie ma tu zastosowania.

export type PortalNavChild = {
  label: string;
  href: string;
  external?: boolean;
  children?: PortalNavChild[];
};
export type PortalNavItem = PortalNavChild;

const PORTAL = "https://polacyszwajcaria.com";

// Linki z menu portalu są względne wobec domeny (np. /wiadomosci) — z poziomu
// katalogu (ta sama domena) działają wprost; absolutne (FB itd.) → nowa karta.
function A({
  href,
  external,
  className,
  onClick,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const absolute = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      target={external && absolute ? "_blank" : undefined}
      rel={external && absolute ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  );
}

function SubItem({ child }: { child: PortalNavChild }) {
  const hasKids = !!child.children?.length;
  return (
    <li className="group/sub relative">
      <A
        href={child.href}
        external={child.external}
        className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px] text-white/75 transition-colors hover:bg-[#E1002A] hover:text-white no-underline"
      >
        <span className="flex items-center gap-2">
          <span className="text-[#E1002A]">›</span> {child.label}
        </span>
        {hasKids && (
          <svg className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7.5 5.2L12 10l-4.5 4.8" /></svg>
        )}
      </A>
      {hasKids && (
        <ul className="invisible absolute left-full top-0 z-50 w-64 -translate-x-1 rounded-lg border-l-2 border-[#E1002A] bg-[#081A33] py-1 opacity-0 shadow-xl transition-all duration-200 group-hover/sub:visible group-hover/sub:translate-x-0 group-hover/sub:opacity-100 list-none">
          {child.children!.map((c) => (
            <li key={c.label}>
              <A
                href={c.href}
                external={c.external}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-white/75 transition-colors hover:bg-[#E1002A] hover:pl-5 hover:text-white no-underline"
              >
                <span className="text-[#E1002A]">›</span> {c.label}
              </A>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Dropdown({ item }: { item: PortalNavItem }) {
  return (
    <li className="group relative list-none">
      <A
        href={item.href}
        external={item.external}
        className="relative flex items-center gap-1 px-4 py-4 text-[13px] font-medium uppercase tracking-wide text-white/85 transition-colors hover:text-white no-underline"
      >
        {item.label}
        {item.children?.length ? (
          <svg className="h-3 w-3 opacity-60 transition-transform group-hover:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.2 7.5L10 12l4.8-4.5" /></svg>
        ) : null}
        <span className="pointer-events-none absolute inset-x-3 bottom-0 h-[3px] origin-left scale-x-0 bg-[#E1002A] transition-transform duration-300 group-hover:scale-x-100" />
      </A>
      {item.children?.length ? (
        <ul className="invisible absolute left-0 top-full z-50 w-64 translate-y-2 rounded-b-lg border-t-2 border-[#E1002A] bg-[#081A33] py-1 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 list-none">
          {item.children.map((c) => (
            <SubItem key={c.label} child={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// Szybkie linki na mobilnej belce — te same co na portalu (HeaderNav.tsx).
const QUICK_LINKS = [
  { label: "Newsy", href: "/wiadomosci" },
  { label: "Praca", href: "/praca-w-szwajcarii/oferty" },
  { label: "Forum", href: "/forum" },
  { label: "Usługi", href: "/katalog-firm" },
];

export default function PortalBar({ nav, chfRate }: { nav: PortalNavItem[]; chfRate?: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Logo portalu — kompaktowe na mobile (jak na portalu), pełne od md */}
      <div className="bg-white">
        <div className="relative mx-auto max-w-[1200px] px-4 py-2.5 md:py-5">
          {/* Ticker kursu franka — jak na portalu; tu link do przelicznika na portalu */}
          {chfRate && (
            <a
              href="/kalkulator/waluty"
              title="Przelicznik walut CHF/PLN"
              className="absolute left-1 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#ECEEF1] bg-[#F6F7F9] px-2.5 py-1 text-xs font-semibold text-[#0D2240] shadow-sm transition-colors hover:border-[#E1002A] hover:bg-[#E1002A] hover:text-white no-underline md:left-2 md:px-3"
            >
              <span aria-hidden="true">🇨🇭</span>
              <span className="hidden md:inline">1 CHF = {chfRate} zł</span>
              <span className="md:hidden">{chfRate} zł</span>
            </a>
          )}
          <a href={PORTAL} className="flex flex-row items-center justify-center gap-2.5 no-underline md:flex-col md:gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${PORTAL}/logo.jpg`}
              alt="Polacy Szwajcaria"
              width={80}
              height={80}
              className="h-11 w-11 rounded-full shadow-sm md:h-20 md:w-20"
            />
            <div className="text-left leading-none md:text-center">
              <span className="font-display text-xl font-bold tracking-tight text-[#E1002A] md:text-[2rem]">
                Polacy Szwajcaria
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.3em] text-[#6B7280] md:mt-1.5 md:text-[11px] md:tracking-[0.35em]">
                Natalia &amp; Paweł
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Pasek nawigacji (desktop) */}
      <nav
        className={`sticky top-0 z-40 hidden border-t-[3px] border-[#E1002A] bg-[#0D2240] transition-shadow lg:block ${
          scrolled ? "shadow-xl" : ""
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-1">
          <ul className="flex flex-wrap items-center list-none m-0 p-0">
            {nav.map((item) => (
              <Dropdown key={item.label} item={item} />
            ))}
          </ul>
        </div>
      </nav>

      {/* Pasek nawigacji (mobile) */}
      <div className="sticky top-0 z-40 border-t-[3px] border-[#E1002A] bg-[#0D2240] lg:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-1 pl-3 pr-2 py-1">
          {/* Szybkie linki zamiast napisu „Menu" — 1:1 z belką portalu */}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5">
            {QUICK_LINKS.map((q) => (
              <a
                key={q.label}
                href={q.href}
                className="px-1.5 py-3 text-[13px] font-semibold uppercase tracking-wide text-white/90 no-underline hover:text-white"
              >
                {q.label}
              </a>
            ))}
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={open}
            aria-controls="portal-mobile-nav"
            className="flex h-11 w-11 items-center justify-center rounded text-white"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <ul id="portal-mobile-nav" className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-[#081A33] pb-3 list-none m-0 p-0">
            {nav.map((item) => (
              <li key={item.label} className="border-b border-white/5">
                <A
                  href={item.href}
                  external={item.external}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-3 text-sm font-medium uppercase tracking-wide text-white/90 no-underline"
                >
                  {item.label}
                </A>
                {item.children?.length ? (
                  <ul className="bg-black/20 pb-1 list-none m-0 p-0">
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <A
                          href={c.href}
                          external={c.external}
                          onClick={() => setOpen(false)}
                          className="block px-8 py-2 text-[13px] text-white/70 no-underline"
                        >
                          {c.label}
                        </A>
                        {c.children?.length ? (
                          <ul className="pb-1 list-none m-0 p-0">
                            {c.children.map((g) => (
                              <li key={g.label}>
                                <A
                                  href={g.href}
                                  external={g.external}
                                  onClick={() => setOpen(false)}
                                  className="block px-12 py-2.5 text-[13px] text-white/70 no-underline"
                                >
                                  {g.label}
                                </A>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
