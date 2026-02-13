"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  offer?: string;
  phone?: string;
  whatsapp?: string;
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

type Props = {
  company: Company;
  slug: string;
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


import { useFavorites } from "../../../hooks/useFavorites";

export default function CompanyPageClient({ company: initialCompany, slug }: Props) {
  const [company, setCompany] = useState<Company>(initialCompany);
  const { favorites, toggleFavorite, isLoaded } = useFavorites();
  const [reviews, setReviews] = useState<Array<{ id: number; author: string; rating: number; comment: string; created_at?: number }>>([]);

  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest">("newest");

  // Analytics: Track view on mount
  useEffect(() => {
    const trackView = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/companies/${company.id}/view`, { method: "POST" });
      } catch (err) {
        console.error("View tracking failed", err);
      }
    };
    if (company.id) trackView();
  }, [company.id]);

  const handleTrackClick = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/companies/${company.id}/click`, { method: "POST" });
    } catch (err) {
      console.error("Click click tracking failed", err);
    }
  };
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const COMMENT_LIMIT = 500;

  useEffect(() => {
    if (!company) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      setLoadError("");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
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
            data.map((r: { id?: number; author_id?: string; rating?: number; comment?: string; created_at?: number }, idx: number) => ({
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

  if (!company) {
    return <div className="mx-auto max-w-5xl px-4 py-10">Ładowanie...</div>;
  }

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
      const timeoutId = setTimeout(() => controller.abort(), 10000);
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

      // Refresh company data to get updated rating
      try {
        const companyRes = await fetch(`${apiUrl}/companies/by-slug/${slug}`);
        if (companyRes.ok) {
          const updatedCompany = await companyRes.json();
          setCompany(updatedCompany);
        }
      } catch (e) {
        console.error("Failed to refresh company rating:", e);
        // Fallback: calculate rating locally
        const allRatings = [
          ...reviews.map(r => r.rating),
          rating
        ];
        const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        setCompany({ ...company, rating: Math.round(avgRating * 10) / 10 });
      }

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

  // Structured Data (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    description: company.short_description || company.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address || "",
      addressLocality: company.city,
      addressRegion: company.canton,
      postalCode: company.postal_code || "",
      addressCountry: company.country || "CH"
    },
    telephone: company.phone,
    email: company.email,
    url: company.website,
    image: company.img,
    areaServed: {
      "@type": "Country",
      name: "Switzerland"
    },
    ...(company.facebook || company.instagram ? {
      sameAs: [
        ...(company.facebook ? [company.facebook] : []),
        ...(company.instagram ? [company.instagram] : [])
      ]
    } : {})
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 sm:px-6">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-semibold">Wróć do listy usług</span>
        </Link>

        {/* Top row: Logo + Contact side by side on desktop */}
        <div className="grid gap-8 md:grid-cols-[1.2fr,1fr]">
          <div
            className="h-64 md:h-80 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
            onClick={() => {
              const images = [company.img, ...(company.photos || [])].filter(Boolean) as string[];
              if (images.length > 0) {
                setLightboxImage(images[0]);
                setLightboxIndex(0);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.img || "/default-company.png"}
              alt={company.name}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Kontakt</h2>
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Udostępnij firmę"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              {company.email && <div>Email: <a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a></div>}
              {company.phone && <div>Telefon: <a href={`tel:${company.phone}`} className="text-primary hover:underline">{company.phone}</a></div>}
              {company.whatsapp && <div>WhatsApp: <a href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{company.whatsapp}</a></div>}
              {company.website && <div>Strona: <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={handleTrackClick}>{company.website}</a></div>}
              {company.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline block"
                >
                  📍 Adres: {company.address}
                </a>
              )}
            </div>

            {/* Social Media Icons */}
            {(company.facebook || company.instagram) && (
              <div className="flex gap-3 pt-2">
                {company.facebook && (
                  <a
                    href={company.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      // Try to open in FB app on mobile  
                      if (company.facebook) {
                        const fbUrl = company.facebook.replace('https://www.facebook.com/', 'fb://profile/');
                        window.location.href = fbUrl;
                        // Fallback to web if app not installed
                        setTimeout(() => { window.open(company.facebook, '_blank'); }, 500);
                      }
                      e.preventDefault();
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                  </a>
                )}
                {company.instagram && (
                  <a
                    href={company.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      // Try to open in Instagram app on mobile
                      if (company.instagram) {
                        const username = company.instagram.split('/').filter(Boolean).pop();
                        const igUrl = `instagram://user?username=${username}`;
                        window.location.href = igUrl;
                        // Fallback to web if app not installed
                        setTimeout(() => { window.open(company.instagram, '_blank'); }, 500);
                      }
                      e.preventDefault();
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white hover:opacity-90 transition-opacity"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                )}
              </div>
            )}

            {/* Quick WhatsApp button */}
            {company.whatsapp && (
              <a
                href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-green-500 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                Napisz na WhatsApp
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

        {/* Full-width section: Company info, description, gallery */}
        <div className="space-y-4">
          {/* Company Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-1">
                {(company.city || company.canton || company.address) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address || `${company.city}, ${company.canton}, Switzerland`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    📍 {[company.city, company.canton].filter(Boolean).join(", ") || company.address}
                  </a>
                )}
                {company.category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {company.category}
                  </span>
                )}
                {company.rating && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                    ★ {company.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div
            className="prose prose-slate prose-sm max-w-none text-base text-slate-700"
            dangerouslySetInnerHTML={{ __html: company.description || "Brak opisu" }}
          />

          {/* Offer */}
          {company.offer && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Oferta</h3>
              <div
                className="prose prose-slate prose-sm max-w-none text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: company.offer || "" }}
              />
            </div>
          )}

          {/* Photo Gallery */}
          {company.photos && company.photos.length > 0 && (() => {
            const galleryPhotos = company.photos.filter(p => p !== company.img);
            const allImages = [company.img, ...galleryPhotos].filter(Boolean) as string[];

            if (galleryPhotos.length === 0) return null;

            return (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Galeria zdjęć ({allImages.length})</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {galleryPhotos.map((src, idx) => {
                    const imageIndex = company.img ? idx + 1 : idx;
                    return (
                      <div
                        key={idx}
                        className="h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                        onClick={() => {
                          setLightboxImage(allImages[imageIndex]);
                          setLightboxIndex(imageIndex);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`${company.name} zdjęcie ${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Reviews section */}
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recenzje</h2>

          <div className="grid gap-4 md:grid-cols-[1fr,1.2fr]">
            <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900">Napisz recenzję</div>
                <div className="text-sm text-slate-500">Podziel się swoją opinią o tej firmie.</div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Twoja ocena</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <svg
                          className={`h-8 w-8 ${star <= rating ? "text-yellow-400 fill-current" : "text-slate-200 fill-current"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Komentarz</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={COMMENT_LIMIT}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Opisz swoje doświadczenia..."
                  />
                  <div className="flex justify-end">
                    <span className={`text-xs font-bold ${comment.length >= COMMENT_LIMIT ? "text-red-500" : "text-slate-400"}`}>
                      {comment.length} / {COMMENT_LIMIT}
                    </span>
                  </div>
                </div>
              </div>

              {errorMsg && <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-100">{errorMsg}</div>}
              {status === "success" && <div className="rounded-lg bg-green-50 p-3 text-xs font-bold text-green-600 border border-green-100">Dziękujemy za recenzję!</div>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "loading" || !comment.trim()}
                className="w-full rounded-xl bg-slate-900 text-white font-bold py-3 hover:bg-slate-800 transition-all disabled:opacity-50 hover:shadow-lg disabled:hover:shadow-none"
              >
                {status === "loading" ? "Wysyłanie..." : "Opublikuj recenzję"}
              </button>
            </div>

            <div className="space-y-3">
              {loadingReviews && (
                <div className="text-sm text-slate-600">Ładowanie recenzji...</div>
              )}
              {!loadingReviews && reviews.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Brak recenzji. Bądź pierwszą osobą, która doda opinię.
                </div>
              )}
              {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {loadError}
                </div>
              )}
              {!loadingReviews && reviews.map((r) => {
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

                const initial = r.author.charAt(0).toUpperCase();
                const colors = ["bg-blue-100 text-blue-600", "bg-green-100 text-green-600", "bg-yellow-100 text-yellow-600", "bg-purple-100 text-purple-600", "bg-pink-100 text-pink-600"];
                const colorClass = colors[(r.id || 0) % colors.length];

                return (
                  <div key={r.id} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${colorClass}`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{r.author}</div>
                            {r.created_at && (
                              <div className="text-xs text-slate-400">{formatDate(r.created_at)}</div>
                            )}
                          </div>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-slate-200 fill-current"}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.comment}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal - simplified */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Skontaktuj się z {company.name}
            </h3>
            {contactStatus === "sent" ? (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-green-900 mb-1">Wiadomość wysłana!</p>
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
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Twoje imię"
                  required
                />
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Twój e-mail"
                  required
                />
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Wiadomość"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Wyślij
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Share Modal - simplified */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Udostępnij firmę</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href : ""}
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {shareCopied ? "Skopiowano!" : "Kopiuj"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox dla zdjęć */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white z-10"
            aria-label="Zamknij"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {(() => {
            const allImages = [company.img, ...(company.photos || [])].filter(Boolean) as string[];
            const currentIndex = allImages.indexOf(lightboxImage);

            return (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage(allImages[currentIndex - 1]);
                      setLightboxIndex(currentIndex - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white z-10"
                    aria-label="Poprzednie zdjęcie"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxImage}
                  alt={`${company.name} - zdjęcie ${currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />

                {currentIndex < allImages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage(allImages[currentIndex + 1]);
                      setLightboxIndex(currentIndex + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white z-10"
                    aria-label="Następne zdjęcie"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                  {currentIndex + 1} / {allImages.length}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}

