"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavorites } from "../../hooks/useFavorites";

type Company = {
    id: number;
    name: string;
    slug: string;
    description: string;
    city: string;
    canton: string;
    category_id?: number;
    rating?: number;
    img?: string;
    is_promoted?: boolean;
};

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
        return <div className="p-10 text-center text-slate-500">Ładowanie...</div>;
    }

    const favoriteCompanies = companies.filter(c => favorites.includes(c.id));

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
            <nav className="flex items-center gap-2 text-sm text-slate-600">
                <Link href="/" className="hover:text-primary">Strona główna</Link>
                <span>/</span>
                <span className="font-semibold text-slate-900">Ulubione</span>
            </nav>

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Twoje Ulubione Firmy</h1>
                <span className="text-sm text-slate-500">{favoriteCompanies.length} zapisanych</span>
            </div>

            {favoriteCompanies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <p className="text-slate-600 mb-4">Nie masz jeszcze żadnych ulubionych firm.</p>
                    <Link href="/" className="inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold text-white hover:bg-primary-dark">
                        Przeglądaj firmy
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {favoriteCompanies.map((item) => (
                        <Link
                            key={item.id}
                            href={`/firma/${item.slug || item.id}`}
                            className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${item.is_promoted ? "border-yellow-400 ring-1 ring-yellow-400 shadow-md bg-yellow-50/30" : "border-slate-200 hover:border-primary/40"
                                }`}
                        >
                            <div className="flex gap-3">
                                <div className="h-20 w-28 overflow-hidden rounded-xl bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.img || "https://via.placeholder.com/112x80?text=Brak+zdjęcia"}
                                        alt={item.name}
                                        className="h-full w-full object-contain"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        {item.is_promoted && (
                                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800 border border-yellow-200">
                                                PROMOWANA
                                            </span>
                                        )}
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
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="text-base font-bold text-slate-900">{item.name}</div>
                                    {(item.city || item.canton || item.address) && (
                                      <div className="text-sm text-slate-600">
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
    );
}
