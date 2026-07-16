// Stopka portalu PolacySzwajcaria — replika 1:1 Footer.tsx portalu (kolory hex zamiast
// tokenów tailwinda portalu; zwykłe <a>, bo linki prowadzą do INNEJ aplikacji).
// UWAGA: treść (kolumny linków) jest zdefiniowana w kodzie portalu — przy zmianie stopki
// portalu zaktualizuj też ten plik.

const PORTAL = "https://polacyszwajcaria.com";

const COLS = [
  {
    title: "Portal",
    links: [
      { label: "O nas", href: "/o-portalu/o-nas/" },
      { label: "Kontakt", href: "/o-portalu/kontakt/" },
      { label: "Partnerzy", href: "/o-portalu/partnerzy/" },
      { label: "Polityka prywatności", href: "/polityka-prywatnosci/" },
    ],
  },
  {
    title: "Treści",
    links: [
      { label: "Wiadomości", href: "/wiadomosci/" },
      { label: "Poradniki", href: "/poradniki/" },
      { label: "Informacje o Szwajcarii", href: "/informacje/" },
      { label: "Wydarzenia", href: "/wydarzenia/" },
    ],
  },
  {
    title: "Przydatne",
    links: [
      { label: "Katalog polskich firm", href: "/katalog-firm" },
      { label: "Dodaj firmę do katalogu", href: "/katalog-firm/dodaj" },
      { label: "Kalkulator podatkowy", href: "/kalkulator/" },
      { label: "Oferty pracy", href: "/praca/" },
      { label: "Polecane usługi", href: "/polecane/" },
      { label: "Społeczność", href: "/grupy/" },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/PolacySzwajcaria2024/", icon: "fb" },
  { label: "YouTube", href: "https://www.youtube.com/@PolacySzwajcaria", icon: "yt" },
  { label: "Instagram", href: "https://www.instagram.com/polacyszwajcaria/", icon: "ig" },
  { label: "TikTok", href: "https://www.tiktok.com/@polacyszwajcaria", icon: "tt" },
  { label: "X", href: "https://x.com/PolacySzwajca", icon: "x" },
] as const;

const ICONS: Record<string, JSX.Element> = {
  fb: <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.3v3h2.4v7h2.8z" />,
  yt: <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.5.4 7.8.4 7.8.4s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8L15.2 12 10 15.2z" />,
  ig: <path d="M12 4.4c2.5 0 2.8 0 3.8.1 2.4.1 3.6 1.3 3.7 3.7 0 1 .1 1.3.1 3.8s0 2.8-.1 3.8c-.1 2.4-1.3 3.6-3.7 3.7-1 0-1.3.1-3.8.1s-2.8 0-3.8-.1c-2.4-.1-3.6-1.3-3.7-3.7 0-1-.1-1.3-.1-3.8s0-2.8.1-3.8c.1-2.4 1.3-3.6 3.7-3.7 1 0 1.3-.1 3.8-.1zM12 3c-2.5 0-2.8 0-3.8.1-3.3.1-5 1.9-5.2 5.2C3 9.2 3 9.5 3 12s0 2.8.1 3.8c.1 3.3 1.9 5 5.2 5.2 1 0 1.3.1 3.8.1s2.8 0 3.8-.1c3.3-.1 5-1.9 5.2-5.2 0-1 .1-1.3.1-3.8s0-2.8-.1-3.8c-.1-3.3-1.9-5-5.2-5.2C14.8 3 14.5 3 12 3zm0 4.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z" />,
  tt: <path d="M16.6 3c.3 2.3 1.6 3.7 3.9 3.9v2.7c-1.4.1-2.6-.3-3.9-1.2v5.5c0 7-7.6 9.2-10.7 4.2-2-3.2-.8-8.9 5.6-9.1v2.8c-.5.1-1 .2-1.5.4-1.5.5-2.3 1.5-2.1 3.2.4 3.2 6.4 4.2 5.9-2.1V3h2.8z" />,
  x: <path d="M17.8 3h3l-6.7 7.6L22 21h-6.2l-4.8-6.3L5.4 21h-3l7.1-8.2L2 3h6.3l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />,
};

export default function PortalFooter() {
  return (
    <footer className="mt-20 border-t-[3px] border-[#E1002A] bg-[#0D2240] text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PORTAL}/logo.jpg`} alt="Polacy Szwajcaria" width={48} height={48} className="rounded-full" />
            <span className="font-display text-lg font-bold text-[#E1002A]">Polacy Szwajcaria</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Portal dla Polonii w Szwajcarii. Wiadomości, poradniki, wydarzenia i sprawdzone usługi w jednym miejscu.
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            {SOCIALS.map((s) => (
              <a
                key={s.icon}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-[#E1002A] hover:text-white"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {ICONS[s.icon]}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">{col.title}</h4>
            <ul className="space-y-2 list-none m-0 p-0">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-white/60 transition-colors hover:text-[#E1002A] no-underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Polacy Szwajcaria · Natalia &amp; Paweł</p>
          <p className="flex flex-wrap justify-center gap-x-4">
            <a href="/katalog-firm/regulamin" className="text-white/40 hover:text-white no-underline">Regulamin katalogu</a>
            <a href="/katalog-firm/polityka-prywatnosci" className="text-white/40 hover:text-white no-underline">Polityka prywatności</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
