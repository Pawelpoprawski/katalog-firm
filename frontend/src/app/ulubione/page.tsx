"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavorites } from "../../hooks/useFavorites";
import { Company } from "@/types";
import { resolveImageUrl } from "@/lib/utils";

export default function FavoritesPage() {
    const { favorites, toggleFavorite, isLoaded } = useFavorites();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${apiUrl}/companies/`);
                if (res.ok) {
                    const data = await res.json();
                    // Handle both old array format and new paginated format
                    const all = Array.isArray(data) ? data : (data.companies || []);
                    setCompanies(all);
                }
            } catch (e) {
                console.error("Failed to fetch companies", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [apiUrl]);

    if (!isLoaded || loading) {
        return <div className="p-10 text-center text-[#555]">Ładowanie...</div>;
    }

    const favoriteCompanies = companies.filter(c => favorites.includes(c.id));

    return (
        <div className="bg-[#F5F6F8] min-h-[80vh] py-10">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
                <nav className="flex items-center gap-2 text-sm text-[#555]">
                    <Link href="/" className="hover:text-[#E1002A] transition-colors">Strona główna</Link>
                    <span className="text-[#888]">/</span>
                    <span className="font-semibold text-[#0D2240]">Ulubione</span>
                </nav>

                <div className="flex items-end justify-between flex-wrap gap-3">
                    <div className="space-y-2">
                        <span className="hays-red-line" />
                        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">Twoje ulubione firmy</h1>
                    </div>
                    <span className="text-sm text-[#555]"><strong className="text-[#E1002A]">{favoriteCompanies.length}</strong> zapisanych</span>
                </div>

                {favoriteCompanies.length === 0 ? (
                    <div className="rounded-md border-2 border-dashed border-[#E0E3E8] bg-white p-12 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#FFF0F3] flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-[#E1002A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <p className="text-[#555] mb-5">Nie masz jeszcze żadnych ulubionych firm.</p>
                        <Link href="/" className="btn-hays">
                            Przeglądaj firmy
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {favoriteCompanies.map((item) => (
                            <Link
                                key={item.id}
                                href={`/firma/${item.slug || item.id}`}
                                className={`hays-job-card flex flex-col gap-3 rounded-md border bg-white p-4 transition-all no-underline ${item.is_promoted ? "border-[#C5A253] ring-1 ring-[#C5A253]/30" : "border-[#E0E3E8]"}`}
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
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toggleFavorite(item.id);
                                                }}
                                                className="ml-auto inline-flex items-center justify-center rounded p-1 text-[#E1002A] hover:bg-[#FFF0F3] transition-colors"
                                                aria-label="Usuń z ulubionych"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="font-display text-base font-bold text-[#0D2240] line-clamp-1">{item.name}</div>
                                        {(item.city || item.canton || item.address) && (
                                            <div className="text-xs text-[#555] inline-flex items-center gap-1">
                                                <svg className="w-3 h-3 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {[item.city, item.canton].filter(Boolean).join(", ") || item.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
