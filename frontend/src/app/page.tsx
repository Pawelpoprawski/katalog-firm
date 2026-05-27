"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Company, Category } from "@/types";
import { resolveImageUrl } from "@/lib/utils";
import CompanyCard from "@/components/CompanyCard";
import Filters from "@/components/Filters";
import GoogleMap from "@/components/GoogleMap";
import Pagination from "@/components/Pagination";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const CANTON_COORDS: Record<string, { lat: number; lng: number }> = {
  ZH: { lat: 47.3769, lng: 8.5417 },
  BE: { lat: 46.948, lng: 7.447 },
  GE: { lat: 46.2044, lng: 6.1432 },
  LU: { lat: 47.0502, lng: 8.3093 },
  BS: { lat: 47.5596, lng: 7.5886 },
  ZG: { lat: 47.1662, lng: 8.5155 },
  VD: { lat: 46.5197, lng: 6.6323 },
};

type MapBounds = { north: number; south: number; east: number; west: number };
const DEFAULT_CH_BOUNDS: MapBounds = { north: 48.5, south: 45.5, east: 11.0, west: 5.5 };

export default function HomePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCanton, setSelectedCanton] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [minRating] = useState<number>(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'random' | 'alphabetical'>('random');
  const [currentPage, setCurrentPage] = useState(1);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(DEFAULT_CH_BOUNDS);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Stable total count — cached separately with long TTL so it doesn't "flicker" on cold loads
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const PAGE_SIZE = 24;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const viewedIdsRef = useRef<Set<number>>(new Set());
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushImpressions = useCallback(() => {
    if (viewedIdsRef.current.size === 0) return;
    const ids = Array.from(viewedIdsRef.current);
    viewedIdsRef.current.clear();
    fetch(`${apiUrl}/companies/batch-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids),
    }).catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) flushImpressions();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushImpressions();
    };
  }, [flushImpressions]);

  const trackImpression = useCallback((companyId: number) => {
    if (viewedIdsRef.current.has(companyId)) return;
    viewedIdsRef.current.add(companyId);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushImpressions, 3000);
  }, [flushImpressions]);

  const goToCompany = (slug?: string, id?: number) => {
    router.push(`/firma/${slug || id}`);
  };

  const goToAdd = () => {
    router.push(`/dodaj`);
  };

  const resolveImage = (img?: string) => resolveImageUrl(img, apiUrl);

  const withCoords = (company: Company) => {
    if (
      company.latitude !== undefined &&
      company.longitude !== undefined &&
      Number.isFinite(company.latitude) &&
      Number.isFinite(company.longitude)
    ) {
      return { ...company, coords: { lat: company.latitude, lng: company.longitude } };
    }
    const coords = CANTON_COORDS[company.canton as keyof typeof CANTON_COORDS];
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      return { ...company, coords: null };
    }
    return { ...company, coords };
  };

  const isBoundsValid = (b: MapBounds | null) => {
    if (!b) return false;
    const spansOk = (b.north - b.south) < 30 && (b.east - b.west) < 30;
    const inRegion = b.north <= 55 && b.south >= 40 && b.east <= 15 && b.west >= 0;
    return Number.isFinite(b.north) && Number.isFinite(b.south) && Number.isFinite(b.east) && Number.isFinite(b.west) && spansOk && inRegion;
  };

  const baseFiltered = companies.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hit =
        (c.name || "").toLowerCase().includes(q) ||
        (c.short_description || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.canton || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (selectedCanton && c.canton !== selectedCanton) return false;
    if (selectedCategory && c.category_id !== selectedCategory) return false;
    if (minRating > 0 && (c.rating || 0) < minRating) return false;
    return true;
  });

  const filteredWithBounds = isBoundsValid(mapBounds) && mapsReady
    ? baseFiltered.map(withCoords).filter((enriched) => {
        if (!enriched.coords) return true;
        const { lat, lng } = enriched.coords;
        return (
          lat <= (mapBounds as MapBounds).north &&
          lat >= (mapBounds as MapBounds).south &&
          lng <= (mapBounds as MapBounds).east &&
          lng >= (mapBounds as MapBounds).west
        );
      })
    : baseFiltered.map(withCoords);

  const companiesWithCoordsAll = filteredWithBounds.filter(
    (c): c is Company & { coords: { lat: number; lng: number } } =>
      c.coords !== null && Number.isFinite(c.coords?.lat) && Number.isFinite(c.coords?.lng)
  );

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch companies with stale-while-revalidate caching
  useEffect(() => {
    const CACHE_TTL = 5 * 60 * 1000;
    const COUNT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dni — tylko liczba, taniej cachowac dlugo

    const getCached = <T,>(key: string, ttl: number = CACHE_TTL): T | null => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > ttl) return null;
        return data as T;
      } catch { return null; }
    };

    const setCache = <T,>(key: string, data: T) => {
      try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
    };

    const cachedCompanies = getCached<Company[]>('swr_companies');
    const cachedCategories = getCached<Category[]>('swr_categories');
    const cachedSortOrder = getCached<"newest" | "random" | "alphabetical">('swr_sort_order');
    const cachedCount = getCached<number>('swr_total_count', COUNT_TTL);

    // Count cache wczytany od razu — eliminuje "skok" liczby przy zaladowaniu
    if (typeof cachedCount === "number" && cachedCount > 0) {
      setTotalCount(cachedCount);
    }

    if (cachedCompanies && cachedCompanies.length > 0) {
      setCompanies(cachedCompanies);
      setFilteredCompanies(cachedCompanies);
      setTotalCount(cachedCompanies.length);
      setLoading(false);
    }
    if (cachedCategories) {
      setCategories(cachedCategories);
      setLoadingCategories(false);
    }
    if (cachedSortOrder) {
      setSortOrder(cachedSortOrder);
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`${apiUrl}/companies/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const companiesList: Company[] = Array.isArray(data) ? data : (data.companies || []);
        setCompanies(companiesList);
        setFilteredCompanies(companiesList);
        setTotalCount(companiesList.length);
        setCache('swr_companies', companiesList);
        setCache('swr_total_count', companiesList.length);
      } catch (e: any) {
        if (!cachedCompanies) setError(e.message);
      } finally {
        setLoading(false);
      }

      try {
        const res = await fetch(`${apiUrl}/categories/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: Category[] = await res.json();
        setCategories(data);
        setCache('swr_categories', data);
      } catch (e: any) {
        console.error("Failed to fetch categories:", e);
      } finally {
        setLoadingCategories(false);
      }

      try {
        const res = await fetch(`${apiUrl}/settings`);
        if (res.ok) {
          const settings = await res.json();
          const order = settings.sort_order || 'random';
          setSortOrder(order);
          setCache('swr_sort_order', order);
        }
      } catch (e) {
        console.error("Failed to fetch settings:", e);
      }
    };

    fetchData();
  }, [apiUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("favorites");
    if (stored) {
      try { setFavorites(JSON.parse(stored)); } catch { setFavorites([]); }
    }
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        window.localStorage.setItem("favorites", JSON.stringify(next));
      }
      return next;
    });
  };

  // Load Google Maps API script with delay
  useEffect(() => {
    if (!googleMapsKey || typeof window === "undefined") return;
    if (window.google?.maps) {
      setMapsReady(true);
      return;
    }

    const delayTimer = setTimeout(() => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapsReady(true);
      script.onerror = () => console.error("Failed to load Google Maps API");
      document.head.appendChild(script);
    }, 2000);

    return () => clearTimeout(delayTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort companies
  useEffect(() => {
    const sorted = [...filteredWithBounds].sort((a, b) => {
      if (a.is_promoted && !b.is_promoted) return -1;
      if (!a.is_promoted && b.is_promoted) return 1;
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      return a.name.localeCompare(b.name, "pl");
    });

    setFilteredCompanies(sorted);
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, searchQuery, selectedCanton, selectedCategory, minRating, mapBounds, mapsReady]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));

  const promotedCompanies = filteredCompanies.filter(c => c.is_promoted);
  const regularCompanies = filteredCompanies.filter(c => !c.is_promoted);

  if (sortOrder === 'newest') {
    promotedCompanies.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    regularCompanies.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } else if (sortOrder === 'alphabetical') {
    promotedCompanies.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    regularCompanies.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  } else if (sortOrder === 'random') {
    for (let i = promotedCompanies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [promotedCompanies[i], promotedCompanies[j]] = [promotedCompanies[j], promotedCompanies[i]];
    }
    for (let i = regularCompanies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regularCompanies[i], regularCompanies[j]] = [regularCompanies[j], regularCompanies[i]];
    }
  }

  const sortedCompanies = [...promotedCompanies, ...regularCompanies];
  const paginatedCompanies = sortedCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div>
      {/* HERO — Hays-style navy with pattern + red accent */}
      <section className="relative bg-[#0D2240] text-white overflow-hidden">
        <div className="absolute inset-0 hays-pattern opacity-100 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] hays-red-glow pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr] items-center">
            <div className="space-y-6">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] tracking-tight">
                Znajdź <span className="text-[#E1002A]">sprawdzone</span> polskie firmy w&nbsp;Szwajcarii
              </h1>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-xl">
                {totalCount !== null && (
                  <>
                    <span className="font-semibold text-white">{totalCount}</span> firm w bazie.{" "}
                  </>
                )}
                Przeglądaj na mapie, filtruj po branży i znajdź to, czego szukasz.
              </p>
              {/* Search bar — Hays style */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = document.getElementById("oferty");
                  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="max-w-[600px] bg-white/10 border border-white/20 rounded backdrop-blur-md flex flex-col sm:flex-row overflow-hidden"
              >
                <div className="flex-1 relative flex items-center">
                  <svg className="w-5 h-5 text-white/50 ml-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Czego szukasz? Branża, miasto, nazwa firmy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-[0.95rem] text-white placeholder:text-white/50 min-w-0"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#E1002A] hover:bg-[#B8001F] text-white px-7 py-4 font-medium text-[0.95rem] transition-colors whitespace-nowrap"
                >
                  Szukaj firm
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <Link
                  href="/dodaj"
                  onClick={(e) => { e.preventDefault(); goToAdd(); }}
                  className="text-white hover:text-[#E1002A] font-medium transition-colors inline-flex items-center gap-1"
                >
                  + Dodaj firmę za darmo
                </Link>
              </div>
            </div>

            {/* MAP */}
            <div
              id="mapa"
              className="relative aspect-square sm:h-[420px] sm:aspect-auto overflow-hidden rounded-md border border-white/10 shadow-2xl bg-white"
            >
              <GoogleMap
                companies={filteredWithBounds}
                onBoundsChange={setMapBounds}
                onCompanyClick={goToCompany}
                isMobile={isMobile}
                mapsReady={mapsReady}
              />
            </div>
          </div>
        </div>
      </section>

      {/* COMPANY LIST */}
      <section id="oferty" className="bg-[#F5F6F8] py-12 lg:py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        <Filters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCanton={selectedCanton}
          setSelectedCanton={setSelectedCanton}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          categories={categories}
          loadingCategories={loadingCategories}
          isCategoryDropdownOpen={isCategoryDropdownOpen}
          setIsCategoryDropdownOpen={setIsCategoryDropdownOpen}
          totalResults={filteredCompanies.length}
          companies={companies}
          loading={loading}
        />

          {loading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-md border border-[#E0E3E8] bg-white animate-pulse"
                >
                  <div className="relative h-48 bg-slate-200" />
                  <div className="flex flex-1 flex-col p-5 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="space-y-2 pt-2">
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-4/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-md border border-[#E0E3E8]">
              <div className="bg-[#FFF0F3] p-4 rounded-full mb-4">
                <svg className="w-10 h-10 text-[#E1002A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-[#0D2240]">Nie znaleziono polskich firm</h3>
              <p className="text-[#555] mt-2 max-w-xs">Zmień filtry lub spróbuj innego wyszukiwania.</p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                className="mt-6 font-semibold text-[#E1002A] hover:underline"
              >
                Wyczyść wszystkie filtry
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedCompanies.map((item) => {
                  const categoryName = categories.find(c => c.id === item.category_id)?.name || item.category || "Inne";
                  return (
                    <CompanyCard
                      key={item.id}
                      company={item}
                      onNavigate={goToCompany}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.includes(item.id)}
                      resolveImage={resolveImage}
                      trackImpression={trackImpression}
                      categoryName={categoryName}
                    />
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-white border-t border-[#E0E3E8]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14 lg:py-20">
          <div className="relative overflow-hidden rounded-md bg-[#0D2240] px-8 py-12 lg:px-12 lg:py-14">
            <div className="absolute inset-0 hays-pattern pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-80 h-80 hays-red-glow pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              <div className="space-y-3 max-w-2xl">
                <span className="hays-red-line mx-auto lg:mx-0" />
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                  Masz firmę w Szwajcarii?
                </h2>
                <p className="text-base sm:text-lg text-white/70">
                  Dodaj się do katalogu <span className="font-semibold text-white">za darmo</span> i dotrzyj do tysięcy Polaków szukających usług.
                </p>
              </div>
              <Link
                href="/dodaj"
                onClick={(e) => { e.preventDefault(); goToAdd(); }}
                className="btn-hays whitespace-nowrap px-7 py-4 text-base"
              >
                + Dodaj firmę za darmo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
