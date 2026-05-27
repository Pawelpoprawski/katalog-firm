"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Category } from "@/types";
import AdminStats from "./components/AdminStats";
import AdminCompanies from "./components/AdminCompanies";
import AdminReviews from "./components/AdminReviews";
import AdminCategories from "./components/AdminCategories";
import AdminAiSearches from "./components/AdminAiSearches";
import AdminSettings from "./components/AdminSettings";

type AdminCompany = {
  id: number;
  name: string;
  email?: string;
  slug: string;
  views: number;
  clicks: number;
  edit_token?: string;
  status: string;
  created_at: number;
  is_promoted?: boolean;
  category_id?: number;
  last_confirmed_at?: string;
  last_confirmation_request_at?: string;
};

type AdminReview = {
  id: number;
  company_id: number;
  company_name?: string;
  author_id: number;
  rating: number;
  comment: string;
  created_at: number;
  ip_address?: string;
};

type Stats = {
  total_companies: number;
  total_reviews: number;
  total_views: number;
  total_clicks: number;
  history: Array<{ date: string; views: number; clicks: number }>;
};

type AnalyticsDay = {
  date: string;
  views: number;
  unique_ips: number;
  new_companies: number;
  new_reviews: number;
  confirmation_emails_sent: number;
  confirmations_received: number;
  ai_searches: number;
  ai_searches_blocked: number;
};

export default function AdminPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDay[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterCount, setNewsletterCount] = useState(5);
  const [sortOrder, setSortOrder] = useState<"newest" | "random" | "alphabetical">("random");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const getAuthHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${adminPassword}`,
      "Content-Type": "application/json",
    }),
    [adminPassword]
  );

  useEffect(() => {
    const savedPassword = sessionStorage.getItem("adminPassword");
    if (savedPassword) {
      setAdminPassword(savedPassword);
      setIsLoggedIn(true);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch(`${apiUrl}/admin/stats`, {
        headers: { Authorization: `Bearer ${passwordInput}` },
      });
      if (res.ok) {
        setAdminPassword(passwordInput);
        setIsLoggedIn(true);
        sessionStorage.setItem("adminPassword", passwordInput);
      } else if (res.status === 401) {
        setLoginError("Nieprawidłowe hasło");
      } else {
        setLoginError("Błąd połączenia z serwerem");
      }
    } catch (e) {
      setLoginError("Błąd połączenia z serwerem");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdminPassword("");
    sessionStorage.removeItem("adminPassword");
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();
        const [companiesRes, reviewsRes, statsRes, categoriesRes, settingsRes, analyticsRes] = await Promise.all([
          fetch(`${apiUrl}/admin/companies`, { headers }),
          fetch(`${apiUrl}/admin/reviews`, { headers }),
          fetch(`${apiUrl}/admin/stats`, { headers }),
          fetch(`${apiUrl}/admin/categories`, { headers }),
          fetch(`${apiUrl}/admin/settings`, { headers }),
          fetch(`${apiUrl}/admin/analytics?days=30`, { headers }),
        ]);

        if (companiesRes.ok && statsRes.ok && reviewsRes.ok && categoriesRes.ok) {
          setCompanies(await companiesRes.json());
          setStats(await statsRes.json());
          setReviews(await reviewsRes.json());
          setCategories(await categoriesRes.json());
        }
        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setNewsletterCount(settingsData.newsletter_count || 5);
          setSortOrder(settingsData.sort_order || "newest");
        }
      } catch (e) {
        console.error("Failed to fetch admin data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, isLoggedIn, adminPassword, getAuthHeaders]);

  const exportEmailsCSV = () => {
    const emails = companies
      .map((c) => c.email)
      .filter(Boolean)
      .join(";");
    const blob = new Blob([emails], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "emails_kontaktowe.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#E0E3E8] rounded-md p-8 space-y-6">
            <div className="space-y-3">
              <span className="hays-red-line" />
              <h1 className="font-display text-2xl font-bold text-[#0D2240]">Panel administratora</h1>
              <p className="text-sm text-[#555]">Wprowadź hasło, aby kontynuować.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0D2240] uppercase tracking-wider mb-1.5">Hasło</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded border border-[#E0E3E8] bg-white text-[#0D2240] text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 transition-all outline-none"
                  autoFocus
                />
              </div>
              {loginError && (
                <div className="p-3 rounded border-l-4 border-[#E1002A] bg-[#FFF0F3] text-[#B8001F] text-sm font-medium">
                  {loginError}
                </div>
              )}
              <button type="submit" className="w-full btn-hays">
                Zaloguj
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] text-[#555]">Ładowanie panelu administratora...</div>;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: "#1e293b", color: "#fff" },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      <div className="min-h-screen bg-[#F5F6F8] pb-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
          <header className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <span className="hays-red-line" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0D2240]">Panel administratora</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportEmailsCSV}
                className="px-4 py-2 rounded bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Eksport e-maili (CSV)
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded border border-[#E0E3E8] bg-white text-[#555] font-semibold text-sm hover:border-[#E1002A] hover:text-[#E1002A] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Wyloguj
              </button>
              <Link href="/" className="text-sm font-semibold text-[#555] hover:text-[#E1002A] transition-colors">
                ← Strona główna
              </Link>
            </div>
          </header>

          <AdminStats stats={stats} analytics={analytics} />

          <AdminCompanies
            companies={companies}
            setCompanies={setCompanies}
            categories={categories}
            apiUrl={apiUrl}
            getAuthHeaders={getAuthHeaders}
          />

          <AdminReviews reviews={reviews} setReviews={setReviews} apiUrl={apiUrl} getAuthHeaders={getAuthHeaders} />

          <AdminAiSearches apiUrl={apiUrl} getAuthHeaders={getAuthHeaders} />
        </div>

        <AdminCategories categories={categories} setCategories={setCategories} apiUrl={apiUrl} getAuthHeaders={getAuthHeaders} />

        <AdminSettings
          newsletterCount={newsletterCount}
          setNewsletterCount={setNewsletterCount}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          apiUrl={apiUrl}
          getAuthHeaders={getAuthHeaders}
        />
      </div>
    </>
  );
}
