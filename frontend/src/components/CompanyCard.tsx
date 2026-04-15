"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  onNavigate: (slug?: string, id?: number) => void;
  onToggleFavorite: (id: number) => void;
  isFavorite: boolean;
  resolveImage: (img?: string) => string;
  trackImpression: (id: number) => void;
  categoryName: string;
}

export default function CompanyCard({
  company,
  onNavigate,
  onToggleFavorite,
  isFavorite,
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
      className={`group flex flex-col overflow-hidden rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow ${
        company.is_promoted
          ? "border-yellow-400 ring-1 ring-yellow-400/50"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="relative h-36 sm:h-48 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImage(company.img)}
          alt={company.name}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {company.is_promoted && (
            <span className="bg-yellow-400 text-yellow-900 py-1 px-2 rounded-md text-[9px] font-bold uppercase">
              Promowana
            </span>
          )}
          <span className="bg-white/90 py-1 px-2 rounded-md text-[9px] font-semibold text-slate-700 uppercase">
            {categoryName}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5 space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
            {company.name}
          </h3>
          {company.rating && (
            <div className="flex items-center gap-0.5 shrink-0 text-green-600 font-bold text-xs sm:text-sm">
              ★ {company.rating.toFixed(1)}
            </div>
          )}
        </div>
        {(company.city || company.canton) && (
          <div className="text-xs sm:text-sm text-slate-500">
            {[company.city, company.canton].filter(Boolean).join(", ")}
          </div>
        )}
        <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
          {company.short_description ||
            (company.description || "").replace(/<[^>]*>/g, "") ||
            ""}
        </p>
        {(company.views ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-auto pt-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {company.views}
          </div>
        )}
      </div>
    </Link>
  );
}
