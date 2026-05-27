"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Company } from "@/types";
import { resolveImageUrl } from "@/lib/utils";

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

function formatDescriptionHtml(text: string): string {
  if (/<(p|ul|ol|div|h[1-6]|br)\b/i.test(text)) {
    return text;
  }
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return paragraphs || text;
}


export default function CompanyPageClient({ company: initialCompany, slug }: Props) {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [reviews, setReviews] = useState<Array<{ id: number; author: string; rating: number; comment: string; created_at?: number }>>([]);
  const [relatedCompanies, setRelatedCompanies] = useState<Company[]>([]);
  const [relatedCategoryName, setRelatedCategoryName] = useState<string>("");
  const [relatedCategorySlug, setRelatedCategorySlug] = useState<string>("");

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

  // Fetch related companies (same category, excluding current)
  useEffect(() => {
    if (!company?.category_id) return;

    const fetchRelated = async () => {
      try {
        const [companiesRes, categoriesRes] = await Promise.all([
          fetch(`${apiUrl}/companies/`),
          fetch(`${apiUrl}/categories/`),
        ]);
        if (!companiesRes.ok) return;

        const companiesData = await companiesRes.json();
        const all: Company[] = Array.isArray(companiesData)
          ? companiesData
          : companiesData.companies || [];

        const sameCategory = all.filter(
          (c) => c.category_id === company.category_id && c.id !== company.id
        );

        // shuffle (Fisher-Yates) and take up to 6
        for (let i = sameCategory.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sameCategory[i], sameCategory[j]] = [sameCategory[j], sameCategory[i]];
        }
        setRelatedCompanies(sameCategory.slice(0, 6));

        if (categoriesRes.ok) {
          const cats: Array<{ id: number; name: string; slug: string }> = await categoriesRes.json();
          const cat = cats.find((c) => c.id === company.category_id);
          setRelatedCategoryName(cat?.name || company.category || "");
          setRelatedCategorySlug(cat?.slug || "");
        } else {
          setRelatedCategoryName(company.category || "");
        }
      } catch (err) {
        console.error("Failed to fetch related companies:", err);
      }
    };

    fetchRelated();
  }, [apiUrl, company?.id, company?.category_id, company?.category]);

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

      <div className="bg-[#F5F6F8] py-8 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#555] hover:text-[#E1002A] transition-colors group text-sm font-medium"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Wróć do listy firm
          </Link>

          {/* Top row: Image + Contact sidebar */}
          <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
            <div
              className="h-64 md:h-80 overflow-hidden rounded-md border border-[#E0E3E8] bg-white cursor-pointer hover:opacity-95 transition-opacity flex items-center justify-center"
              onClick={() => {
                const images = [company.img, ...(company.photos || [])].filter(Boolean).map(s => resolveImageUrl(s, apiUrl));
                if (images.length > 0) {
                  setLightboxImage(images[0]);
                  setLightboxIndex(0);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageUrl(company.img, apiUrl)}
                alt={company.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>

            <aside className="space-y-4 rounded-md border border-[#E0E3E8] bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
                <h2 className="font-display text-lg font-bold text-[#0D2240] flex items-center gap-2">
                  <span className="hays-red-line !w-1 !h-5 !mb-0" />
                  Kontakt
                </h2>
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded p-2 text-[#888] hover:bg-[#F5F6F8] hover:text-[#E1002A] transition-colors"
                aria-label="Udostępnij firmę"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {company.email && (
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#888] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${company.email}`} className="text-[#0D2240] hover:text-[#E1002A] break-all transition-colors">
                    {company.email}
                  </a>
                </div>
              )}
              {company.phone && (
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#888] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${company.phone}`} className="text-[#0D2240] hover:text-[#E1002A] transition-colors">
                    {company.phone}
                  </a>
                </div>
              )}
              {company.whatsapp && (
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#25D366] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487 2.981 1.287 2.981.858 3.518.804.537-.054 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785a9.873 9.873 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.825 9.825 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                  </svg>
                  <a href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-[#0D2240] hover:text-[#E1002A] transition-colors">
                    {company.whatsapp}
                  </a>
                </div>
              )}
              {company.website && (
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#888] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#0D2240] hover:text-[#E1002A] break-all transition-colors" onClick={handleTrackClick}>
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#E1002A] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0D2240] hover:text-[#E1002A] transition-colors"
                  >
                    {company.address}
                  </a>
                </div>
              )}
            </div>

            {/* Social Media Icons */}
            {(company.facebook || company.instagram) && (
              <div className="flex gap-3 pt-2">
                {company.facebook && company.facebook !== "-" && (
                  <a
                    href={company.facebook}
                    onClick={(e) => { e.preventDefault(); window.location.href = company.facebook!; }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                  </a>
                )}
                {company.instagram && company.instagram !== "-" && (
                  <a
                    href={company.instagram}
                    onClick={(e) => { e.preventDefault(); window.location.href = company.instagram!; }}
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
                className="flex items-center justify-center gap-2 w-full rounded bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1ea854] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                Napisz na WhatsApp
              </a>
            )}
            <div className="space-y-2 pt-2 border-t border-[#E0E3E8]">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888]">
                Mapa lokalizacji
              </div>
              <div className="h-40 overflow-hidden rounded border border-[#E0E3E8] bg-[#F5F6F8]">
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
          <div className="rounded-md border border-[#E0E3E8] bg-white p-6 sm:p-8 space-y-6">
            {/* Company Header */}
            <div className="space-y-3 border-b border-[#E0E3E8] pb-5">
              <span className="hays-red-line" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">{company.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {(company.city || company.canton || company.address) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address || `${company.city}, ${company.canton}, Switzerland`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#555] hover:text-[#E1002A] transition-colors inline-flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {[company.city, company.canton].filter(Boolean).join(", ") || company.address}
                  </a>
                )}
                {company.category && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#FFF0F3] px-2.5 py-1 text-[11px] font-semibold text-[#E1002A] uppercase tracking-wider">
                    {company.category}
                  </span>
                )}
                {company.rating && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#C5A253]/10 px-2.5 py-1 text-[11px] font-semibold text-[#C5A253]">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                      <path d="M10 1l2.928 5.93 6.542.95-4.735 4.616 1.118 6.52L10 16l-5.853 3.016 1.118-6.52L.53 7.88l6.542-.95z" />
                    </svg>
                    {company.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div
              className="company-description max-w-none text-base text-[#1A1A1A] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: company.description ? formatDescriptionHtml(company.description) : "Brak opisu" }}
            />

            {/* Offer */}
            {company.offer && (
              <div className="rounded-md border-l-4 border-[#E1002A] bg-[#FFF0F3]/40 p-5">
                <h3 className="font-display text-sm font-bold text-[#0D2240] mb-3 uppercase tracking-wider">Oferta</h3>
                <div
                  className="company-description max-w-none text-sm text-[#1A1A1A] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: company.offer ? formatDescriptionHtml(company.offer) : "" }}
                />
              </div>
            )}

            {/* Photo Gallery */}
            {company.photos && company.photos.length > 0 && (() => {
              const galleryPhotos = company.photos.filter(p => p !== company.img);
              const allImages = [company.img, ...galleryPhotos].filter(Boolean).map(s => resolveImageUrl(s, apiUrl));

              if (galleryPhotos.length === 0) return null;

              return (
                <div className="space-y-3 pt-2 border-t border-[#E0E3E8]">
                  <h3 className="font-display text-sm font-bold text-[#0D2240] uppercase tracking-wider">
                    Galeria zdjęć ({allImages.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {galleryPhotos.map((src, idx) => {
                      const imageIndex = company.img ? idx + 1 : idx;
                      return (
                        <div
                          key={idx}
                          className="h-28 overflow-hidden rounded border border-[#E0E3E8] bg-[#F5F6F8] cursor-pointer hover:border-[#E1002A] transition-colors flex items-center justify-center group"
                          onClick={() => {
                            setLightboxImage(allImages[imageIndex]);
                            setLightboxIndex(imageIndex);
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveImageUrl(src, apiUrl)}
                            alt={`${company.name} zdjęcie ${idx + 1}`}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
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
      </div>

      {/* Reviews section */}
      <div className="bg-white border-t border-[#E0E3E8]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 lg:py-14">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="hays-red-line" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">Recenzje</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr,1.2fr]">
              {/* Review form */}
              <div className="space-y-5 rounded-md border border-[#E0E3E8] bg-[#F5F6F8] p-6">
                <div className="space-y-1">
                  <div className="font-display text-lg font-bold text-[#0D2240]">Napisz recenzję</div>
                  <div className="text-sm text-[#555]">Podziel się swoją opinią o tej firmie.</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0D2240] uppercase tracking-wider">Twoja ocena</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <svg
                            className={`h-7 w-7 ${star <= rating ? "text-[#C5A253] fill-current" : "text-[#E0E3E8] fill-current"}`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 1l2.928 5.93 6.542.95-4.735 4.616 1.118 6.52L10 16l-5.853 3.016 1.118-6.52L.53 7.88l6.542-.95z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0D2240] uppercase tracking-wider">Komentarz</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      maxLength={COMMENT_LIMIT}
                      className="w-full rounded border border-[#E0E3E8] bg-white px-4 py-3 text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 outline-none transition-all placeholder:text-[#888]"
                      placeholder="Opisz swoje doświadczenia..."
                    />
                    <div className="flex justify-end">
                      <span className={`text-xs font-medium ${comment.length >= COMMENT_LIMIT ? "text-[#E1002A]" : "text-[#888]"}`}>
                        {comment.length} / {COMMENT_LIMIT}
                      </span>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded border-l-4 border-[#E1002A] bg-[#FFF0F3] p-3 text-xs font-medium text-[#B8001F]">
                    {errorMsg}
                  </div>
                )}
                {status === "success" && (
                  <div className="rounded border-l-4 border-[#10b981] bg-green-50 p-3 text-xs font-medium text-green-700">
                    Dziękujemy za recenzję!
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === "loading" || !comment.trim()}
                  className="w-full btn-hays disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Wysyłanie..." : "Opublikuj recenzję"}
                </button>
              </div>

              {/* Reviews list */}
              <div className="space-y-3">
                {loadingReviews && (
                  <div className="text-sm text-[#555]">Ładowanie recenzji...</div>
                )}
                {!loadingReviews && reviews.length === 0 && (
                  <div className="rounded-md border-2 border-dashed border-[#E0E3E8] bg-white p-6 text-sm text-[#555] text-center">
                    Brak recenzji. Bądź pierwszą osobą, która doda opinię.
                  </div>
                )}
                {loadError && (
                  <div className="rounded border-l-4 border-[#E1002A] bg-[#FFF0F3] p-3 text-xs text-[#B8001F]">
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

                  return (
                    <div key={r.id} className="hays-job-card rounded-md border border-[#E0E3E8] bg-white p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F3] font-bold text-[#E1002A]">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-display text-sm font-bold text-[#0D2240]">{r.author}</div>
                              {r.created_at && (
                                <div className="text-xs text-[#888]">{formatDate(r.created_at)}</div>
                              )}
                            </div>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`h-4 w-4 ${i < r.rating ? "text-[#C5A253] fill-current" : "text-[#E0E3E8] fill-current"}`} viewBox="0 0 20 20">
                                  <path d="M10 1l2.928 5.93 6.542.95-4.735 4.616 1.118 6.52L10 16l-5.853 3.016 1.118-6.52L.53 7.88l6.542-.95z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-[#555]">{r.comment}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related companies — same category */}
      {relatedCompanies.length > 0 && (
        <div className="bg-[#F5F6F8] border-t border-[#E0E3E8]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 lg:py-14">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
              <div className="space-y-2">
                <span className="hays-red-line" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">
                  Inne firmy z kategorii{relatedCategoryName ? " " : ""}
                  {relatedCategoryName && (
                    <span className="text-[#E1002A]">„{relatedCategoryName}”</span>
                  )}
                </h2>
              </div>
              {relatedCategorySlug && (
                <Link
                  href={`/kategoria/${relatedCategorySlug}`}
                  className="text-sm font-semibold text-[#E1002A] hover:underline inline-flex items-center gap-1"
                >
                  Zobacz wszystkie
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {relatedCompanies.map((rc) => (
                <Link
                  key={rc.id}
                  href={`/firma/${rc.slug || rc.id}`}
                  className="hays-job-card group flex flex-col rounded-md border border-[#E0E3E8] bg-white overflow-hidden no-underline transition-all"
                >
                  <div className="h-24 sm:h-28 bg-[#F5F6F8] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(rc.img, apiUrl)}
                      alt={rc.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 p-3 space-y-1">
                    <div className="font-display text-xs sm:text-sm font-bold text-[#0D2240] leading-tight line-clamp-2 group-hover:text-[#E1002A] transition-colors">
                      {rc.name}
                    </div>
                    {(rc.city || rc.canton) && (
                      <div className="text-[10px] sm:text-[11px] text-[#888] inline-flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {[rc.city, rc.canton].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal - simplified */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-[#E0E3E8] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2 mb-5">
              <span className="hays-red-line" />
              <h3 className="font-display text-lg font-bold text-[#0D2240]">
                Skontaktuj się z {company.name}
              </h3>
            </div>
            {contactStatus === "sent" ? (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-[#0D2240] mb-3">Wiadomość wysłana!</p>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactStatus("idle");
                    setContactForm({ name: "", email: "", message: "" });
                  }}
                  className="btn-hays"
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
                  className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 outline-none transition-all"
                  placeholder="Twoje imię"
                  required
                />
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 outline-none transition-all"
                  placeholder="Twój e-mail"
                  required
                />
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 outline-none transition-all"
                  placeholder="Wiadomość"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 rounded border border-[#E0E3E8] px-4 py-2.5 text-sm font-semibold text-[#555] hover:bg-[#F5F6F8] transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-hays !py-2.5"
                  >
                    Wyślij
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-[#E0E3E8] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-2">
                <span className="hays-red-line" />
                <h3 className="font-display text-lg font-bold text-[#0D2240]">Udostępnij firmę</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded hover:bg-[#F5F6F8] transition-colors">
                <svg className="w-5 h-5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">Facebook</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent((company.name || "") + " - " + (typeof window !== "undefined" ? window.location.href : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("Polecam: " + (company.name || ""))}&body=${encodeURIComponent((company.name || "") + "\n\n" + (typeof window !== "undefined" ? window.location.href : ""))}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-orange-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#EA4335] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">Email</span>
              </a>
              <button
                type="button"
                onClick={async () => {
                  if (typeof window !== "undefined") {
                    await navigator.clipboard.writeText(window.location.href);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${shareCopied ? 'bg-green-500' : 'bg-slate-700'}`}>
                  {shareCopied ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-600">{shareCopied ? "Skopiowano!" : "Kopiuj link"}</span>
              </button>
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
            const allImages = [company.img, ...(company.photos || [])].filter(Boolean).map(s => resolveImageUrl(s, apiUrl));
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
                  src={resolveImageUrl(lightboxImage, apiUrl)}
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

