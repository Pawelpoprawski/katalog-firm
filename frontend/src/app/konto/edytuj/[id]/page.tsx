"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Company = {
  id: number;
  name: string;
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
  category_id?: number;
  status?: string;
  is_active: boolean;
};

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

      // Fetch categories
      fetch(`${apiUrl}/categories/`)
        .then((res) => res.json())
        .then(setCategories);

      // Fetch company
      fetch(`${apiUrl}/companies/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          // Check if user owns this company
          if (data.owner_id !== userData.id) {
            router.push("/konto/moje-ogloszenia");
            return;
          }
          setCompany(data);
        })
        .catch((err) => {
          console.error("Failed to fetch company:", err);
          setError("Nie udało się załadować ogłoszenia");
        })
        .finally(() => {
          setLoading(false);
        });
    } catch {
      router.push("/login");
    }
  }, [params.id, router, apiUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;

    setSaving(true);
    setError("");

    const validatePhone = (phone: string): boolean => {
      // Accept Swiss (+41), local (0), and Polish (+48) numbers
      const phoneRegex = /^(\+41|0|\+48)[1-9]\d{1,12}$/;
      const cleaned = phone.replace(/[\s-]/g, "");
      return phoneRegex.test(cleaned);
    };

    try {
      if (company.phone && !validatePhone(company.phone)) {
        throw new Error("Nieprawidłowy format telefonu. Użyj formatu: +41 lub +48");
      }
      if (company.whatsapp && !validatePhone(company.whatsapp)) {
        throw new Error("Nieprawidłowy format telefonu (WhatsApp). Użyj formatu: +41 lub +48");
      }

      const res = await fetch(`${apiUrl}/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...company,
          category_id: company.category_id || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Błąd zapisu");
      }

      router.push("/konto/moje-ogloszenia");
    } catch (err: any) {
      setError(err.message || "Nie udało się zapisać zmian");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Ogłoszenie nie znalezione"}
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
        <Link href="/konto/moje-ogloszenia" className="hover:text-primary">
          Moje ogłoszenia
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Edytuj</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">Edytuj ogłoszenie</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Nazwa firmy *
          </label>
          <input
            type="text"
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Kategoria
          </label>
          <select
            value={company.category_id || ""}
            onChange={(e) => setCompany({ ...company, category_id: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Krótki opis (dla kart)
          </label>
          <input
            type="text"
            value={company.short_description || ""}
            onChange={(e) => setCompany({ ...company, short_description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Opis *
          </label>
          <textarea
            value={company.description}
            onChange={(e) => setCompany({ ...company, description: e.target.value })}
            required
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">
              Miasto *
            </label>
            <input
              type="text"
              value={company.city}
              onChange={(e) => setCompany({ ...company, city: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">
              Kanton *
            </label>
            <input
              type="text"
              value={company.canton}
              onChange={(e) => setCompany({ ...company, canton: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Telefon / WhatsApp
          </label>
          <input
            type="tel"
            value={company.phone || ""}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="+41 79 123 45 67 lub +48 600 123 456"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            WhatsApp
          </label>
          <input
            type="tel"
            value={company.whatsapp || ""}
            onChange={(e) => setCompany({ ...company, whatsapp: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="+41 79 123 45 67 lub +48 600 123 456"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Email
          </label>
          <input
            type="email"
            value={company.email || ""}
            onChange={(e) => setCompany({ ...company, email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Strona WWW
          </label>
          <input
            type="url"
            value={company.website || ""}
            onChange={(e) => setCompany({ ...company, website: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Status
          </label>
          <select
            value={company.status || "published"}
            onChange={(e) => setCompany({ ...company, status: e.target.value, is_active: e.target.value === "published" })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="published">Opublikowane</option>
            <option value="draft">Szkic</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/konto/moje-ogloszenia"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center"
          >
            Anuluj
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </form>
    </div>
  );
}

