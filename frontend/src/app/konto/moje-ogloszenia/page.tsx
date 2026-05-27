"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Company = {
  id: number;
  name: string;
  slug: string;
  description: string;
  city: string;
  canton: string;
  address?: string;
  category_id?: number;
  status?: string;
  is_active: boolean;
};

export default function MyListingsPage() {
  const [user, setUser] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);

      // Fetch user's companies
      fetch(`${apiUrl}/companies/`)
        .then((res) => res.json())
        .then((response) => {
          // Handle both old array format and new paginated format
          const data = Array.isArray(response) ? response : (response.companies || []);
          // Filter by owner_id (in production, backend should filter this)
          const userCompanies = data.filter((c: any) => c.owner_id === userData.id);
          setCompanies(userCompanies);
        })
        .catch((err) => {
          console.error("Failed to fetch companies:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch {
      router.push("/login");
    }
  }, [router, apiUrl]);

  if (loading) {
    return (
      <div className="bg-[#F5F6F8] min-h-[60vh] py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F6F8] min-h-[80vh] py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-[#555]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#E1002A] transition-colors">
            Strona główna
          </Link>
          <span className="text-[#888]">/</span>
          <Link href="/konto" className="hover:text-[#E1002A] transition-colors">
            Moje konto
          </Link>
          <span className="text-[#888]">/</span>
          <span className="font-semibold text-[#0D2240]">Moje ogłoszenia</span>
        </nav>

        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <span className="hays-red-line" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">Moje ogłoszenia</h1>
          </div>
          <Link href="/dodaj" className="btn-hays !py-2.5 !px-5 text-sm">
            + Dodaj nowe
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-[#E0E3E8] bg-white p-10 text-center">
            <p className="text-[#555] mb-5">Nie masz jeszcze żadnych ogłoszeń.</p>
            <Link href="/dodaj" className="btn-hays">
              Dodaj pierwsze ogłoszenie
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="hays-job-card rounded-md border border-[#E0E3E8] bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-[#0D2240]">{company.name}</h3>
                    {(company.city || company.canton || company.address) && (
                      <p className="text-sm text-[#555] mt-1 inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {[company.city, company.canton].filter(Boolean).join(", ") || company.address}
                      </p>
                    )}
                    <p className="text-sm text-[#555] mt-2 line-clamp-2 leading-relaxed">
                      {company.description?.replace(/<[^>]*>/g, "")}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          company.is_active && company.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-[#C5A253]/10 text-[#C5A253]"
                        }`}
                      >
                        {company.is_active && company.status === "published" ? "Opublikowane" : "Szkic"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/firma/${company.slug}`}
                      target="_blank"
                      className="rounded border border-[#E0E3E8] px-3 py-1.5 text-sm font-semibold text-[#0D2240] hover:border-[#E1002A] hover:text-[#E1002A] transition-colors"
                    >
                      Zobacz
                    </Link>
                    <Link
                      href={`/konto/edytuj/${company.id}`}
                      className="rounded bg-[#E1002A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#B8001F] transition-colors"
                    >
                      Edytuj
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

