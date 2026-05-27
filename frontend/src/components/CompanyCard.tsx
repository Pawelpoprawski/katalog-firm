"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  onNavigate: (slug?: string, id?: number) => void;
  resolveImage: (img?: string) => string;
  trackImpression: (id: number) => void;
  categoryName: string;
}

export default function CompanyCard({
  company,
  onNavigate,
  resolveImage,
  trackImpression,
  categoryName,
}: CompanyCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackImpression(company.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [company.id, trackImpression]);

  return (
    <Link
      ref={cardRef}
      href={`/firma/${company.slug || company.id}`}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(company.slug, company.id);
      }}
      className={`hays-job-card group relative flex flex-col overflow-hidden rounded-md border bg-white transition-all no-underline ${
        company.is_promoted
          ? "border-[#C5A253] ring-1 ring-[#C5A253]/30"
          : "border-[#E0E3E8]"
      }`}
    >
      <div className="relative h-40 sm:h-48 overflow-hidden bg-[#F5F6F8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImage(company.img)}
          alt={company.name}
          className="h-full w-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {company.is_promoted && (
            <span className="bg-[#C5A253] text-white py-1 px-2 rounded text-[9px] font-bold uppercase tracking-wider">
              Promowana
            </span>
          )}
          <span className="bg-white/95 backdrop-blur-sm py-1 px-2 rounded text-[9px] font-semibold text-[#0D2240] uppercase tracking-wider border border-[#E0E3E8]">
            {categoryName}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm sm:text-base font-bold text-[#0D2240] leading-snug line-clamp-2 group-hover:text-[#E1002A] transition-colors">
            {company.name}
          </h3>
          {company.rating ? (
            <div className="flex items-center gap-0.5 shrink-0 text-[#C5A253] font-bold text-xs sm:text-sm">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M10 1l2.928 5.93 6.542.95-4.735 4.616 1.118 6.52L10 16l-5.853 3.016 1.118-6.52L.53 7.88l6.542-.95z" />
              </svg>
              {company.rating.toFixed(1)}
            </div>
          ) : null}
        </div>

        {(company.city || company.canton) && (
          <div className="flex items-center gap-1 text-xs text-[#555]">
            <svg className="w-3.5 h-3.5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {[company.city, company.canton].filter(Boolean).join(", ")}
          </div>
        )}

        <p className="text-xs sm:text-sm text-[#555] line-clamp-2 leading-relaxed">
          {(() => {
            const desc = (company.short_description || "").trim() ||
              (company.description || "").replace(/<[^>]*>/g, "").trim();
            if (desc) return desc;
            // Fallback gdy brak opisu — generowany z kategorii + miasta dla spojnosci kart i SEO
            const bits: string[] = [];
            if (categoryName && categoryName !== "Inne") bits.push(categoryName);
            if (company.city) bits.push(company.city);
            return bits.length
              ? `Polska firma — ${bits.join(", ")}. Zobacz szczegóły, kontakt i opinie.`
              : "Polska firma w Szwajcarii. Zobacz szczegóły, kontakt i opinie.";
          })()}
        </p>

        <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#E0E3E8]">
          {(company.views ?? 0) > 0 ? (
            <div className="flex items-center gap-1 text-[11px] text-[#888]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {company.views}
            </div>
          ) : <span />}
          <span className="text-xs font-semibold text-[#E1002A] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Zobacz
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
