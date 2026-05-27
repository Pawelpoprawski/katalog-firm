"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { Company, Category } from "@/types";
import { resolveImageUrl } from "@/lib/utils";
export default function CategoryPageClient({ categorySlug }: { categorySlug: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "name" | "newest">("rating");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const catsRes = await fetch(`${apiUrl}/categories/`);
        if (!catsRes.ok) throw new Error(`HTTP error! status: ${catsRes.status}`);
        const categories: Category[] = await catsRes.json();
        const found = categories.find((c) => c.slug === categorySlug);
        if (!found) {
          setLoading(false);
          return;
        }
        setCategory(found);

        // Fetch companies
        const companiesRes = await fetch(`${apiUrl}/companies/`);
        if (!companiesRes.ok) throw new Error(`HTTP error! status: ${companiesRes.status}`);
        const companiesData = await companiesRes.json();
        // Handle both old array format and new paginated format
        const allCompanies: Company[] = Array.isArray(companiesData) ? companiesData : (companiesData.companies || []);

        // Filter by category_id - also check if company is active
        const filtered = allCompanies.filter((c) => {
          // Match category_id
          const matchesCategory = c.category_id === found.id;
          // Also check if company is active (if field exists)
          const isActive = (c as any).is_active !== false;
          return matchesCategory && isActive;
        });

        setCompanies(filtered);
        setFilteredCompanies(filtered);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categorySlug, apiUrl]);

  // Get unique cities for filters
  const cities = Array.from(new Set(companies.map((c) => c.city).filter(Boolean))).sort();

  // Filter and sort companies
  useEffect(() => {
    let filtered = [...companies];

    // City filter
    if (selectedCity) {
      filtered = filtered.filter((c) => c.city === selectedCity);
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter((c) => (c.rating || 0) >= minRating);
    }

    // Sort
    filtered.sort((a, b) => {
      // Promoted first
      if (a.is_promoted && !b.is_promoted) return -1;
      if (!a.is_promoted && b.is_promoted) return 1;

      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name, "pl");
      } else {
        // newest - use ID as proxy
        return b.id - a.id;
      }
    });

    setFilteredCompanies(filtered);
  }, [selectedCity, minRating, sortBy, companies]);

  if (loading) {
    return (
      <div className="bg-[#F5F6F8] min-h-[80vh] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-32 rounded-md bg-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) return notFound();

  return (
    <div className="bg-[#F5F6F8] min-h-[80vh] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-[#555]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#E1002A] transition-colors">
            Strona główna
          </Link>
          <span className="text-[#888]">/</span>
          <Link href="/" className="hover:text-[#E1002A] transition-colors">
            Kategorie
          </Link>
          <span className="text-[#888]">/</span>
          <span className="font-semibold text-[#0D2240]">{category.name}</span>
        </nav>

        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <span className="hays-red-line" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">{category.name}</h1>
            <p className="text-sm text-[#555]">
              {filteredCompanies.length > 0
                ? <><strong className="text-[#E1002A]">{filteredCompanies.length}</strong> {filteredCompanies.length === 1 ? "firma" : filteredCompanies.length < 5 ? "firmy" : "firm"} w kategorii</>
                : category.description || "Firmy polonijne w tej kategorii"}
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-[#E1002A] hover:underline inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Wróć do katalogu
          </Link>
        </div>

        {/* Filtry */}
        <div className="bg-white border border-[#E0E3E8] rounded-md p-4 flex flex-wrap gap-3">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded border border-[#E0E3E8] bg-white px-3 py-2 text-sm text-[#0D2240] focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
            aria-label="Filtruj po mieście"
          >
            <option value="">Wszystkie miasta</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="rounded border border-[#E0E3E8] bg-white px-3 py-2 text-sm text-[#0D2240] focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
            aria-label="Filtruj po ocenie"
          >
            <option value={0}>Wszystkie oceny</option>
            <option value={4}>Ocena 4+</option>
            <option value={4.5}>Ocena 4.5+</option>
            <option value={5}>Tylko 5 gwiazdek</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "rating" | "name" | "newest")}
            className="rounded border border-[#E0E3E8] bg-white px-3 py-2 text-sm text-[#0D2240] focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
            aria-label="Sortuj"
          >
            <option value="rating">Najwyżej oceniane</option>
            <option value="name">A-Z</option>
            <option value="newest">Najnowsze</option>
          </select>

          {(selectedCity || minRating > 0) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCity("");
                setMinRating(0);
              }}
              className="rounded border border-[#E0E3E8] bg-white px-3 py-2 text-sm text-[#555] hover:border-[#E1002A] hover:text-[#E1002A] transition-colors"
            >
              Wyczyść filtry
            </button>
          )}
        </div>

        {error ? (
          <div className="rounded border-l-4 border-[#E1002A] bg-[#FFF0F3] p-5 text-sm text-[#B8001F]">
            Błąd ładowania: {error}. Spróbuj odświeżyć stronę.
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-[#E0E3E8] bg-white p-10 text-sm text-[#555] text-center">
            {selectedCity || minRating > 0 ? (
              <>
                Nie znaleziono firm dla wybranych filtrów.{" "}
                <button
                  onClick={() => {
                    setSelectedCity("");
                    setMinRating(0);
                  }}
                  className="font-semibold text-[#E1002A] hover:underline"
                >
                  Wyczyść filtry
                </button>
              </>
            ) : (
              <>
                Brak firm w tej kategorii.{" "}
                <Link href="/dodaj" className="font-semibold text-[#E1002A] hover:underline">
                  Dodaj firmę za darmo!
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCompanies.map((item) => (
              <Link
                key={item.id}
                href={`/firma/${item.slug || item.id}`}
                className={`hays-job-card flex flex-col gap-3 rounded-md border bg-white p-5 transition-all no-underline ${item.is_promoted ? "border-[#C5A253] ring-1 ring-[#C5A253]/30" : "border-[#E0E3E8]"}`}
              >
                <div className="flex gap-3">
                  <div className="h-20 w-28 overflow-hidden rounded border border-[#E0E3E8] bg-[#F5F6F8] flex-shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(item.img, apiUrl)}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#E1002A] uppercase tracking-wider">
                        {category.name}
                      </span>
                      {item.is_promoted && (
                        <span className="rounded bg-[#C5A253] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Promowana
                        </span>
                      )}
                      {item.rating && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#C5A253]/10 px-2 py-0.5 text-[10px] font-semibold text-[#C5A253]">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                            <path d="M10 1l2.928 5.93 6.542.95-4.735 4.616 1.118 6.52L10 16l-5.853 3.016 1.118-6.52L.53 7.88l6.542-.95z" />
                          </svg>
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="font-display text-base font-bold text-[#0D2240] line-clamp-1">{item.name}</div>
                    <div className="text-xs text-[#555] inline-flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {[item.city, item.canton].filter(Boolean).join(", ") || item.address || ""}
                    </div>
                  </div>
                </div>
                <p
                  className="text-sm text-[#555] leading-relaxed"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {item.description?.replace(/<[^>]*>/g, "") || "Brak opisu"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
