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
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">
          Strona główna
        </Link>
        <span>/</span>
        <Link href="/konto" className="hover:text-primary">
          Moje konto
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Moje ogłoszenia</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Moje ogłoszenia</h1>
        <Link
          href="/dodaj"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Dodaj nowe
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-600 mb-4">Nie masz jeszcze żadnych ogłoszeń.</p>
          <Link
            href="/dodaj"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Dodaj pierwsze ogłoszenie
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {company.city}, {company.canton}
                  </p>
                  <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                    {company.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${company.is_active && company.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                        }`}
                    >
                      {company.is_active && company.status === "published"
                        ? "Opublikowane"
                        : "Szkic"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/firma/${company.slug}`}
                    target="_blank"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Zobacz
                  </Link>
                  <Link
                    href={`/konto/edytuj/${company.id}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
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
  );
}

