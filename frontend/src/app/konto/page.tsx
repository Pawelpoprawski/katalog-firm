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

  useEffect(() => {
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
      <div className="bg-[#F5F6F8] min-h-[60vh] py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#F5F6F8] min-h-[60vh] py-10">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-md border border-[#E0E3E8] bg-white p-8 text-center">
            <div className="space-y-3 mb-5">
              <span className="hays-red-line mx-auto" />
              <h1 className="font-display text-2xl font-bold text-[#0D2240]">Panel użytkownika</h1>
            </div>
            <p className="text-[#555] mb-6">Musisz być zalogowany, aby uzyskać dostęp do panelu.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/login" className="btn-hays">
                Zaloguj się
              </Link>
              <Link href="/rejestracja" className="btn-hays-outline">
                Zarejestruj się
              </Link>
            </div>
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
          <span className="font-semibold text-[#0D2240]">Moje konto</span>
        </nav>

        <div className="rounded-md border border-[#E0E3E8] bg-white p-6 sm:p-8">
          <div className="space-y-3 mb-6">
            <span className="hays-red-line" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">Moje konto</h1>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-[#0D2240] uppercase tracking-wider">Email</label>
              <div className="mt-1 text-base text-[#1A1A1A]">{user.email}</div>
            </div>
            {user.full_name && (
              <div>
                <label className="text-xs font-bold text-[#0D2240] uppercase tracking-wider">Imię i nazwisko</label>
                <div className="mt-1 text-base text-[#1A1A1A]">{user.full_name}</div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-[#E0E3E8]">
            <h2 className="font-display text-lg font-bold text-[#0D2240] mb-4">Zarządzanie</h2>
            <div className="space-y-3">
              <Link
                href="/konto/moje-ogloszenia"
                className="hays-cat-card flex items-center justify-between rounded-md border border-[#E0E3E8] bg-white px-5 py-4 text-sm font-semibold text-[#0D2240] hover:border-[#E1002A] transition-colors no-underline"
              >
                Moje ogłoszenia
                <svg className="w-4 h-4 text-[#E1002A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("user");
                    router.push("/");
                  }
                }}
                className="w-full rounded-md border border-[#E1002A] bg-white px-5 py-4 text-sm font-semibold text-[#E1002A] hover:bg-[#FFF0F3] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Wyloguj się
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
