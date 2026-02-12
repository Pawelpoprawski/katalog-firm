"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

type Props = { params: { slug: string } };

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

type Company = {
  id: number;
  name: string;
  slug?: string;
  description: string;
  city: string;
  canton: string;
  category_id?: number;
  rating?: number;
  img?: string;
};

export default function CategoryPage({ params }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCanton, setSelectedCanton] = useState<string>("");
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
        const found = categories.find((c) => c.slug === params.slug);
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

        // Filter by category_id
        const filtered = allCompanies.filter((c) => c.category_id === found.id);
        setCompanies(filtered);
        setFilteredCompanies(filtered);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.slug, apiUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
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

  // Get unique cantons and cities for filters
  const cantons = Array.from(new Set(companies.map((c) => c.canton).filter(Boolean))).sort();
  const cities = Array.from(new Set(companies.map((c) => c.city).filter(Boolean))).sort();

  // Filter and sort companies
  useEffect(() => {
    let filtered = [...companies];

    // Canton filter
    if (selectedCanton) {
      filtered = filtered.filter((c) => c.canton === selectedCanton);
    }

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
  }, [selectedCanton, selectedCity, minRating, sortBy, companies]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-32 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) return notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/" className="hover:text-primary">Strona główna</Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">{category.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          <p className="text-sm text-slate-600">
            {filteredCompanies.length > 0
              ? `Znaleziono ${filteredCompanies.length} ${filteredCompanies.length === 1 ? "firmę" : filteredCompanies.length < 5 ? "firmy" : "firm"}`
              : category.description || "Firmy polonijne w tej kategorii"}
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-primary hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Wróć
        </Link>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedCanton}
          onChange={(e) => setSelectedCanton(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Filtruj po kantonie"
        >
          <option value="">Wszystkie kantony</option>
          {cantons.map((canton) => (
            <option key={canton} value={canton}>
              {canton}
            </option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Sortuj"
        >
          <option value="rating">Najwyżej oceniane</option>
          <option value="name">A-Z</option>
          <option value="newest">Najnowsze</option>
        </select>

        {(selectedCanton || selectedCity || minRating > 0) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCanton("");
              setSelectedCity("");
              setMinRating(0);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Błąd ładowania: {error}. Spróbuj odświeżyć stronę.
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            {selectedCanton || selectedCity || minRating > 0 ? (
              <>
                Nie znaleziono firm dla wybranych filtrów.{" "}
                <button
                  onClick={() => {
                    setSelectedCanton("");
                    setSelectedCity("");
                    setMinRating(0);
                  }}
                  className="font-semibold text-primary hover:text-red-700 underline"
                >
                  Wyczyść filtry
                </button>
              </>
            ) : (
              <>
                Brak firm w tej kategorii.{" "}
                <Link href="/dodaj" className="font-semibold text-primary hover:text-red-700">
                  Dodaj firmę
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCompanies.map((item) => (
            <Link
              key={item.id}
              href={`/firma/${item.slug || item.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex gap-3">
                <div className="h-20 w-28 overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.img || "https://via.placeholder.com/112x80?text=Brak+zdjęcia"}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-primary">{category.name}</div>
                    {item.rating && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                        ★ {item.rating.toFixed(1)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(item.id);
                      }}
                      className="ml-auto inline-flex items-center justify-center rounded-full border border-transparent p-1 text-yellow-500 hover:border-yellow-500 hover:bg-yellow-50"
                      aria-label={favorites.includes(item.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={favorites.includes(item.id) ? "currentColor" : "none"} stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.945a1 1 0 00.95.69h4.147c.969 0 1.371 1.24.588 1.81l-3.357 2.44a1 1 0 00-.364 1.118l1.286 3.945c.3.921-.755 1.688-1.54 1.118l-3.357-2.44a1 1 0 00-1.176 0l-3.357 2.44c-.784.57-1.838-.197-1.539-1.118l1.285-3.945a1 1 0 00-.364-1.118L2.98 9.372c-.783-.57-.38-1.81.588-1.81h4.147a1 1 0 00.95-.69l1.286-3.945z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="text-base font-bold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-600">
                    {item.city}, {item.canton}
                    {item.rating && ` • Ocena ${item.rating.toFixed(1)}`}
                  </div>
                </div>
              </div>
              <p
                className="text-sm text-slate-700"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {item.description || "Brak opisu"}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Polska obsługa</span>
                {item.rating && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">Ocena {item.rating.toFixed(1)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

