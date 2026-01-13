"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  email: string;
  full_name?: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    // Check if user is logged in (from localStorage or session)
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Panel użytkownika</h1>
          <p className="text-slate-600 mb-6">Musisz być zalogowany, aby uzyskać dostęp do panelu.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Zaloguj się
            </Link>
            <Link
              href="/rejestracja"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zarejestruj się
            </Link>
          </div>
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
        <span className="font-semibold text-slate-900">Moje konto</span>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Moje konto</h1>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <div className="mt-1 text-base text-slate-900">{user.email}</div>
          </div>
          {user.full_name && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Imię i nazwisko</label>
              <div className="mt-1 text-base text-slate-900">{user.full_name}</div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Zarządzanie</h2>
          <div className="space-y-3">
            <Link
              href="/konto/moje-ogloszenia"
              className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Moje ogłoszenia →
            </Link>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("user");
                  router.push("/");
                }
              }}
              className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Wyloguj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

