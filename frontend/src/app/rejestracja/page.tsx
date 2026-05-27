"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Błąd rejestracji");
      }

      const user = await res.json();
      // Store user in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(user));
      }
      router.push("/konto");
    } catch (err: any) {
      setError(err.message || "Nie udało się zarejestrować");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F5F6F8] min-h-[80vh] py-12">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <nav className="flex items-center gap-2 text-sm text-[#555] mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#E1002A] transition-colors">
            Strona główna
          </Link>
          <span className="text-[#888]">/</span>
          <span className="font-semibold text-[#0D2240]">Rejestracja</span>
        </nav>

        <div className="rounded-md border border-[#E0E3E8] bg-white p-8">
          <div className="space-y-2 mb-6">
            <span className="hays-red-line" />
            <h1 className="font-display text-2xl font-bold text-[#0D2240]">Utwórz konto</h1>
            <p className="text-sm text-[#555]">Załóż konto, aby zarządzać firmami w katalogu.</p>
          </div>

          {error && (
            <div className="mb-4 rounded border-l-4 border-[#E1002A] bg-[#FFF0F3] p-3 text-sm text-[#B8001F]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-[#0D2240] uppercase tracking-wider mb-1.5">
                Imię i nazwisko <span className="text-[#888] font-normal lowercase tracking-normal">(opcjonalnie)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#0D2240] uppercase tracking-wider mb-1.5">
                Email <span className="text-[#E1002A]">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#0D2240] uppercase tracking-wider mb-1.5">
                Hasło <span className="text-[#E1002A]">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded border border-[#E0E3E8] px-3 py-2.5 text-sm focus:border-[#E1002A] focus:outline-none focus:ring-2 focus:ring-[#E1002A]/10 transition-all"
              />
              <p className="mt-1.5 text-xs text-[#888]">Minimum 6 znaków</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-hays disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Rejestracja..." : "Utwórz konto"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E0E3E8] text-center text-sm text-[#555]">
            Masz już konto?{" "}
            <Link href="/login" className="font-semibold text-[#E1002A] hover:underline">
              Zaloguj się
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

