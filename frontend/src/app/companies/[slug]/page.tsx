"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

type Props = { params: { slug: string } };

type Company = {
  id: number;
  name: string;
  description: string;
  offer?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  address?: string;
  city: string;
  canton: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  tags?: string;
  is_verified: boolean;
  is_active: boolean;
  owner_id: number;
  category_id?: number;
  category?: string;
  rating?: number;
  img?: string;
  photos?: string[] | null;
};

const CANTON_COORDS: Record<string, { lat: number; lng: number }> = {
  ZH: { lat: 47.3769, lng: 8.5417 },
  BE: { lat: 46.948, lng: 7.447 },
  GE: { lat: 46.2044, lng: 6.1432 },
  LU: { lat: 47.0502, lng: 8.3093 },
  BS: { lat: 47.5596, lng: 7.5886 },
  ZG: { lat: 47.1662, lng: 8.5155 },
  VD: { lat: 46.5197, lng: 6.6323 }
};

const DEFAULT_COORDS = { lat: 46.8, lng: 8.2 };

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function CompanyPage({ params }: Props) {
  // All hooks must be called before any conditional returns
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Array<{ id: number; author: string; rating: number; comment: string; created_at?: number }>>([]);
  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest">("newest");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const COMMENT_LIMIT = 500;
  
  // Try to parse slug as ID (number)
  const companyId = parseInt(params.slug, 10);
  
  // Fetch company
  useEffect(() => {
    if (isNaN(companyId)) {
      setLoading(false);
      return;
    }
    
    const fetchCompany = async () => {
      try {
        const res = await fetch(`${apiUrl}/companies/`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const companies: Company[] = await res.json();
        const found = companies.find((c) => c.id === companyId);
        if (found) {
          setCompany(found);
        }
      } catch (e) {
        console.error("Failed to fetch company:", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompany();
  }, [companyId, apiUrl]);

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

  useEffect(() => {
    if (!company) return;
    
    const fetchReviews = async () => {
      setLoadingReviews(true);
      setLoadError("");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const res = await fetch(`${apiUrl}/reviews/?company_id=${company.id ?? ""}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Błąd ${res.status}: ${text || "Backend nie odpowiada"}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setReviews(
            data.map((r: any, idx: number) => ({
              id: r.id ?? idx,
              author: r.author_id ? `Użytkownik #${r.author_id}` : "Anonim",
              rating: r.rating ?? 0,
              comment: r.comment ?? "",
              created_at: r.created_at
            }))
          );
        } else {
          setLoadError("Backend zwrócił nieprawidłowy format danych.");
        }
      } catch (err: any) {
        console.error("[Frontend] GET /reviews/ error:", err);
        if (err.name === "AbortError") {
          setLoadError("Timeout: Backend nie odpowiada (sprawdź czy działa na :8000).");
        } else {
          setLoadError(err.message || "Nie udało się pobrać recenzji. Sprawdź czy backend działa.");
        }
      } finally {
        setLoadingReviews(false);
      }
    };
    if (company) {
      fetchReviews();
    }
  }, [apiUrl, company]);

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-2xl bg-slate-200" />
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
        </div>
      </div>
    );
  }
  
  if (!company) return notFound();

  const cantonCoords = CANTON_COORDS[company.canton as keyof typeof CANTON_COORDS] || DEFAULT_COORDS;
  const delta = 0.5;
  const companyMapBbox = `${cantonCoords.lng - delta},${cantonCoords.lat - delta},${cantonCoords.lng + delta},${cantonCoords.lat + delta}`;
  const companyMapMarker = `${cantonCoords.lat},${cantonCoords.lng}`;

  const handleSubmit = async () => {
    if (!comment.trim() || rating < 1 || rating > 5) {
      setErrorMsg("Podaj ocenę 1-5 i komentarz.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const body = { rating, comment, company_id: company.id };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(`${apiUrl}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Błąd ${res.status}: ${text || "Backend nie odpowiada"}`);
      }
      const data = JSON.parse(text);
      setReviews((prev) => [
        {
          id: data.id ?? Date.now(),
          author: `Użytkownik #${data.author_id ?? "demo"}`,
          rating,
          comment,
          created_at: data.created_at
        },
        ...prev
      ]);
      setComment("");
      setRating(5);
      setStatus("success");
    } catch (err: any) {
      console.error("[Frontend] POST /reviews/ error:", err);
      setStatus("error");
      if (err.name === "AbortError") {
        setErrorMsg("Timeout: Backend nie odpowiada. Upewnij się, że backend działa na http://127.0.0.1:8000");
      } else {
        setErrorMsg(err.message || "Nie udało się dodać recenzji. Sprawdź konsolę (F12) i czy backend działa.");
      }
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-primary">Strona główna</Link>
          <span>/</span>
          {company.category && (
            <>
              <Link href={`/categories/${company.category.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`} className="hover:text-primary">
                {company.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="font-semibold text-slate-900">{company.name}</span>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.5fr,1fr]">
          <div className="space-y-4">
            <div className="h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img 
                src={company.img || "https://via.placeholder.com/600x400?text=Brak+zdjęcia"} 
                alt={company.name} 
                className="h-full w-full object-cover" 
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>
                {company.city}, {company.canton}
              </span>
              {company.rating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                  ★ {company.rating.toFixed(1)}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(company.id);
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-[11px] font-semibold text-yellow-500 hover:border-yellow-500 hover:bg-yellow-50"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill={favorites.includes(company.id) ? "currentColor" : "none"} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.945a1 1 0 00.95.69h4.147c.969 0 1.371 1.24.588 1.81l-3.357 2.44a1 1 0 00-.364 1.118l1.286 3.945c.3.921-.755 1.688-1.54 1.118l-3.357-2.44a1 1 0 00-1.176 0l-3.357 2.44c-.784.57-1.838-.197-1.539-1.118l1.285-3.945a1 1 0 00-.364-1.118L2.98 9.372c-.783-.57-.38-1.81.588-1.81h4.147a1 1 0 00.95-.69l1.286-3.945z"
                  />
                </svg>
                {favorites.includes(company.id) ? "Ulubiona" : "Dodaj do ulubionych"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0h12v3H6v-3z" />
                </svg>
                Drukuj
              </button>
            </div>
            <p className="text-base text-slate-700">{company.description || "Brak opisu"}</p>
            {company.offer && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Oferta</h3>
                <p className="text-sm text-slate-700">{company.offer}</p>
              </div>
            )}
            {company.photos && company.photos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Galeria zdjęć</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {company.photos.map((src, idx) => (
                    <div key={idx} className="h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={src}
                        alt={`${company.name} zdjęcie ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">Polska obsługa</span>
              {company.is_verified && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">Zweryfikowana</span>
              )}
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Kontakt</h2>
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Udostępnij firmę"
                title="Udostępnij"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              {company.email && <div>Email: <a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a></div>}
              {company.phone && <div>Telefon: <a href={`tel:${company.phone}`} className="text-primary hover:underline">{company.phone}</a></div>}
              {company.website && <div>Strona: <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{company.website}</a></div>}
              {company.address && <div>Adres: {company.address}</div>}
              <div>{company.city}, {company.canton} {company.postal_code && company.postal_code}</div>
              {(company.facebook || company.instagram) && (
                <div className="flex gap-2 pt-2">
                  {company.facebook && (
                    <a 
                      href={company.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
                        <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.97 3.65 9.09 8.42 9.93v-7.02H7.9v-2.91h2.38v-2.22c0-2.35 1.4-3.65 3.54-3.65 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.92h2.59l-.41 2.91h-2.18V22c4.77-.84 8.42-4.96 8.42-9.93z"/>
                      </svg>
                      Facebook
                    </a>
                  )}
                  {company.instagram && (
                    <a 
                      href={company.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="#E1306C">
                        <path d="M7.75 2h8.5C19.55 2 22 4.45 22 7.75v8.5C22 19.55 19.55 22 16.25 22h-8.5C4.45 22 2 19.55 2 16.25v-8.5C2 4.45 4.45 2 7.75 2zm0 2C5.68 4 4 5.68 4 7.75v8.5C4 18.32 5.68 20 7.75 20h8.5C18.32 20 20 18.32 20 16.25v-8.5C20 5.68 18.32 4 16.25 4h-8.5z"/>
                        <path d="M12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17 6.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Skontaktuj się
            </button>
            
            {/* Quick contact buttons */}
            {company.phone && (
              <a
                href={`tel:${company.phone}`}
                className="flex items-center justify-center gap-2 w-full rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Zadzwoń
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}?subject=Zapytanie dotyczące ${encodeURIComponent(company.name)}`}
                className="flex items-center justify-center gap-2 w-full rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Wyślij e-mail
              </a>
            )}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mapa lokalizacji
              </div>
              <div className="h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {googleMapsKey ? (
                  <iframe
                    title={`Mapa lokalizacji ${company.name}`}
                    src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(company.address || `${company.city}, ${company.canton}, Switzerland`)}&zoom=12&maptype=roadmap`}
                    className="h-full w-full"
                    loading="lazy"
                    aria-label={`Mapa lokalizacji firmy ${company.name}`}
                  />
                ) : mapboxToken ? (
                  <iframe
                    title={`Mapa lokalizacji ${company.name}`}
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12.html?title=false&access_token=${mapboxToken}#12/${cantonCoords.lat}/${cantonCoords.lng}`}
                    className="h-full w-full"
                    loading="lazy"
                    aria-label={`Mapa lokalizacji firmy ${company.name}`}
                  />
                ) : (
                  <iframe
                    title={`Mapa lokalizacji ${company.name}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${companyMapBbox}&layer=mapnik&marker=${companyMapMarker}`}
                    className="h-full w-full"
                    loading="lazy"
                    aria-label={`Mapa lokalizacji firmy ${company.name}`}
                  />
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recenzje</h2>
            <span className="text-xs text-slate-500">Recenzje</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr,1.2fr]">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Dodaj recenzję</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Sortuj:</span>
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as "newest" | "oldest" | "highest")}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] focus:border-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <option value="newest">Najnowsze</option>
                    <option value="oldest">Najstarsze</option>
                    <option value="highest">Najwyżej ocenione</option>
                  </select>
                </div>
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Ocena (1-5)</span>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Komentarz</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={COMMENT_LIMIT}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  placeholder="Jak przebiegła współpraca? Co było na plus?"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Podaj szczegóły współpracy.</span>
                  <span>{comment.length} / {COMMENT_LIMIT}</span>
                </div>
              </label>
              {errorMsg && <div className="text-xs text-red-500">{errorMsg}</div>}
              {status === "success" && <div className="text-xs text-green-600">Dziękujemy za recenzję!</div>}
              {status === "error" && !errorMsg && <div className="text-xs text-red-500">Nie udało się dodać recenzji.</div>}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "loading" || !comment.trim()}
                className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "loading" ? "Wysyłanie..." : "Dodaj recenzję"}
              </button>
            </div>

            <div className="space-y-3">
              {loadingReviews && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                        <div className="h-4 w-10 rounded-full bg-slate-200" />
                      </div>
                      <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}
              {!loadingReviews && reviews.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Brak recenzji. Bądź pierwszą osobą, która doda opinię.
                </div>
              )}
              {loadError && !loadingReviews && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {loadError}
                </div>
              )}
              {!loadingReviews &&
                [...reviews].sort((a, b) => {
                  if (reviewSort === "highest") {
                    return (b.rating || 0) - (a.rating || 0);
                  }
                  const at = a.created_at ?? 0;
                  const bt = b.created_at ?? 0;
                  if (reviewSort === "newest") {
                    return bt - at;
                  }
                  return at - bt;
                }).map((r) => {
                  const formatDate = (timestamp?: number) => {
                    if (!timestamp) return "";
                    const date = new Date(timestamp * 1000);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) return "Dzisiaj";
                    if (diffDays === 1) return "Wczoraj";
                    if (diffDays < 7) return `${diffDays} dni temu`;
                    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tygodni temu`;
                    if (diffDays < 365) return `${Math.floor(diffDays / 30)} miesięcy temu`;
                    return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
                  };
                  
                  return (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{r.author}</div>
                    {r.created_at && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(r.created_at)}</div>
                    )}
                  </div>
                        <div className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          ★ {r.rating}
                        </div>
                      </div>
                <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const reason = prompt("Dlaczego zgłaszasz tę recenzję?");
                        if (!reason) return;
                        await fetch(`${apiUrl}/reports/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ review_id: r.id, reason })
                        });
                        alert("Dziękujemy za zgłoszenie. Zostanie ono przeanalizowane.");
                      } catch (e) {
                        alert("Nie udało się zgłosić recenzji. Spróbuj ponownie później.");
                      }
                    }}
                    className="text-[11px] font-medium text-slate-500 hover:text-red-600"
                  >
                    Zgłoś recenzję
                  </button>
                </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowShareModal(false);
            setShareCopied(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="share-modal-title" className="text-lg font-semibold text-slate-900">
                Udostępnij firmę
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareCopied(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Zamknij"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Link do udostępnienia</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? window.location.href : ""}
                    className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== "undefined") {
                        await navigator.clipboard.writeText(window.location.href);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {shareCopied ? "Skopiowano!" : "Kopiuj"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.97 3.65 9.09 8.42 9.93v-7.02H7.9v-2.91h2.38v-2.22c0-2.35 1.4-3.65 3.54-3.65 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.92h2.59l-.41 2.91h-2.18V22c4.77-.84 8.42-4.96 8.42-9.93z"/>
                  </svg>
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(company.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                  Twitter
                </a>
                {typeof window !== "undefined" && navigator.share && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: company.name,
                          text: company.description,
                          url: window.location.href,
                        });
                      } catch (e) {
                        // User cancelled or error
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Udostępnij
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowContactModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="contact-modal-title" className="text-lg font-semibold text-slate-900">
                Skontaktuj się z {company.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Zamknij"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {contactStatus === "sent" ? (
              <div className="text-center py-6">
                <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-green-900 mb-1">Wiadomość wysłana!</p>
                <p className="text-xs text-slate-600 mb-4">Firma skontaktuje się z Tobą wkrótce.</p>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactStatus("idle");
                    setContactForm({ name: "", email: "", message: "" });
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Zamknij
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (company.email) {
                    window.location.href = `mailto:${company.email}?subject=Zapytanie dotyczące ${encodeURIComponent(company.name)}&body=${encodeURIComponent(`Imię: ${contactForm.name}\nEmail: ${contactForm.email}\n\nWiadomość:\n${contactForm.message}`)}`;
                    setContactStatus("sent");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Twoje imię
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Jan Kowalski"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Twój e-mail
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="jan@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Wiadomość
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Napisz swoją wiadomość..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={!contactForm.name || !contactForm.email || !contactForm.message}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Wyślij
                  </button>
                </div>
                {company.email && (
                  <p className="text-xs text-slate-500 text-center">
                    Wiadomość zostanie wysłana na adres: {company.email}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

