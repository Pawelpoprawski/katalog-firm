"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from 'react-hot-toast';

type Company = {
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
    last_confirmed_at?: string;  // ISO datetime string
};

type Review = {
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

type Category = {
    id: number;
    name: string;
    slug: string;
    description: string;
};

export default function AdminPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '', emoji: '🏢' });
    const [loading, setLoading] = useState(true);
    const [deletingCompany, setDeletingCompany] = useState<number | null>(null);
    const [deletingReview, setDeletingReview] = useState<number | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<number | null>(null);
    const [blockingIP, setBlockingIP] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    const [updatingPromotion, setUpdatingPromotion] = useState<number | null>(null);
    const [updatingCategory, setUpdatingCategory] = useState<number | null>(null);
    const [updatingEmail, setUpdatingEmail] = useState<number | null>(null);
    const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
    const [tempEmail, setTempEmail] = useState("");
    const [newsletterCount, setNewsletterCount] = useState(5);
    const [savingNewsletter, setSavingNewsletter] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'random' | 'alphabetical'>('random');
    const [savingSortOrder, setSavingSortOrder] = useState(false);
    const [adminSortBy, setAdminSortBy] = useState<'name' | 'confirmed' | 'created'>('created');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Admin authentication state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [adminPassword, setAdminPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [passwordInput, setPasswordInput] = useState("");

    // Helper to get auth headers
    const getAuthHeaders = () => ({
        "Authorization": `Bearer ${adminPassword}`,
        "Content-Type": "application/json"
    });

    // Check if already logged in (from sessionStorage)
    useEffect(() => {
        const savedPassword = sessionStorage.getItem("adminPassword");
        if (savedPassword) {
            setAdminPassword(savedPassword);
            setIsLoggedIn(true);
        } else {
            setLoading(false);
        }
    }, []);

    // Login function
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");

        try {
            const res = await fetch(`${apiUrl}/admin/stats`, {
                headers: { "Authorization": `Bearer ${passwordInput}` }
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

    // Logout function
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
                const [companiesRes, reviewsRes, statsRes, categoriesRes, settingsRes] = await Promise.all([
                    fetch(`${apiUrl}/admin/companies`, { headers }),
                    fetch(`${apiUrl}/admin/reviews`, { headers }),
                    fetch(`${apiUrl}/admin/stats`, { headers }),
                    fetch(`${apiUrl}/admin/categories`, { headers }),
                    fetch(`${apiUrl}/admin/settings`, { headers })
                ]);

                if (companiesRes.ok && statsRes.ok && reviewsRes.ok && categoriesRes.ok) {
                    setCompanies(await companiesRes.json());
                    setStats(await statsRes.json());
                    setReviews(await reviewsRes.json());
                    setCategories(await categoriesRes.json());
                }

                // Load settings separately (may not exist yet)
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    setNewsletterCount(settingsData.newsletter_count || 5);
                    setSortOrder(settingsData.sort_order || 'newest');
                }
            } catch (e) {
                console.error("Failed to fetch admin data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [apiUrl, isLoggedIn, adminPassword]);

    const copyLink = (token: string) => {
        const link = `${window.location.origin}/edycja/${token}`;
        navigator.clipboard.writeText(link);
        alert("Skopiowano link do schowka: " + link);
    };

    const togglePromotion = async (company: Company) => {
        setUpdatingPromotion(company.id);
        const originalCompanies = companies;
        // Optimistic update
        setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_promoted: !c.is_promoted } : c));

        try {
            const res = await fetch(`${apiUrl}/admin/companies/${company.id}/promote`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_promoted: !company.is_promoted })
            });
            if (res.ok) {
                toast.success(company.is_promoted ? "Promocja wyłączona" : "Promocja włączona");
            } else {
                setCompanies(originalCompanies); // Rollback
                toast.error("Błąd podczas zmiany promocji");
            }
        } catch (e) {
            setCompanies(originalCompanies); // Rollback
            console.error("Failed to toggle promotion", e);
            toast.error("Błąd połączenia");
        } finally {
            setUpdatingPromotion(null);
        }
    };

    const toggleStatus = async (company: Company) => {
        const newStatus = company.status === "draft" ? "published" : "draft";
        setUpdatingStatus(company.id);
        const originalCompanies = companies;
        // Optimistic update
        setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: newStatus } : c));

        try {
            const res = await fetch(`${apiUrl}/admin/companies/${company.id}/status`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                toast.success(`Status zmieniony: ${newStatus === "published" ? "✓ Opublikowano" : "⏳ Szkic"}`);
            } else {
                setCompanies(originalCompanies); // Rollback
                toast.error("Błąd podczas zmiany statusu");
            }
        } catch (e) {
            setCompanies(originalCompanies); // Rollback
            console.error("Failed to toggle status", e);
            toast.error("Błąd połączenia");
        } finally {
            setUpdatingStatus(null);
        }
    };

    const deleteReview = async (reviewId: number) => {
        setDeletingReview(reviewId);
        const originalReviews = reviews;
        // Optimistic update
        setReviews(prev => prev.filter(r => r.id !== reviewId));

        try {
            const res = await fetch(`${apiUrl}/admin/reviews/${reviewId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (res.ok) {
                toast.success("Recenzja usunięta");
            } else {
                setReviews(originalReviews); // Rollback
                toast.error("Błąd podczas usuwania recenzji");
            }
        } catch (e) {
            setReviews(originalReviews); // Rollback
            console.error("Failed to delete review", e);
            toast.error("Błąd połączenia: " + e);
        } finally {
            setDeletingReview(null);
        }
    };

    const blockIP = async (ipAddress: string) => {
        if (!ipAddress || ipAddress === "unknown") {
            toast.error("Brak IP do zablokowania");
            return;
        }

        setBlockingIP(ipAddress);

        try {
            const res = await fetch(`${apiUrl}/admin/ip-blacklist/add`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ ip_address: ipAddress })
            });
            if (res.ok) {
                toast.success(`IP ${ipAddress} został zablokowany 🚫`);
            } else {
                toast.error("Błąd podczas blokowania IP");
            }
        } catch (e) {
            console.error(e);
            toast.error("Błąd połączenia");
        } finally {
            setBlockingIP(null);
        }
    };

    const deleteCompany = async (companyId: number) => {
        setDeletingCompany(companyId);
        const originalCompanies = companies;
        // Optimistic update
        setCompanies(prev => prev.filter(c => c.id !== companyId));

        try {
            const res = await fetch(`${apiUrl}/admin/companies/${companyId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (res.ok) {
                toast.success("Firma usunięta");
            } else {
                setCompanies(originalCompanies); // Rollback
                toast.error("Błąd podczas usuwania firmy");
            }
        } catch (e) {
            setCompanies(originalCompanies); // Rollback
            console.error("Failed to delete company", e);
            toast.error("Błąd połączenia: " + e);
        } finally {
            setDeletingCompany(null);
        }
    };

    const exportEmailsCSV = () => {
        const emails = companies
            .map(c => c.email)
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

    const addCategory = async () => {
        if (!newCategory.name.trim() || !newCategory.slug.trim()) {
            toast.error("Nazwa i slug są wymagane");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}/admin/categories`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(newCategory)
            });
            if (res.ok) {
                const data = await res.json();
                setCategories(prev => [...prev, data.category]);
                setNewCategory({ name: '', slug: '', description: '', emoji: '🏢' });
                toast.success("Kategoria dodana!");
            } else {
                const err = await res.json();
                toast.error(err.detail || "Błąd podczas dodawania kategorii");
            }
        } catch (e) {
            console.error(e);
            toast.error("Błąd połączenia");
        }
    };

    const deleteCategoryHandler = async (categoryId: number) => {
        if (!confirm("Czy na pewno chcesz usunąć tę kategorię?")) return;

        setDeletingCategory(categoryId);
        const originalCategories = categories;
        setCategories(prev => prev.filter(c => c.id !== categoryId));

        try {
            const res = await fetch(`${apiUrl}/admin/categories/${categoryId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (res.ok) {
                toast.success("Kategoria usunięta!");
            } else {
                setCategories(originalCategories);
                toast.error("Błąd podczas usuwania kategorii");
            }
        } catch (e) {
            setCategories(originalCategories);
            console.error(e);
            toast.error("Błąd połączenia");
        } finally {
            setDeletingCategory(null);
        }
    };

    const saveNewsletterCount = async () => {
        setSavingNewsletter(true);
        try {
            const res = await fetch(`${apiUrl}/admin/settings/newsletter-count`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ count: newsletterCount })
            });
            if (res.ok) {
                toast.success(`Ustawiono ${newsletterCount} firm w newsletterze`);
            } else {
                toast.error("Błąd podczas zapisywania");
            }
        } catch (e) {
            toast.error("Błąd połączenia");
        } finally {
            setSavingNewsletter(false);
        }
    };

    const saveSortOrder = async () => {
        setSavingSortOrder(true);
        try {
            const res = await fetch(`${apiUrl}/admin/settings/sort-order`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ sort_order: sortOrder })
            });
            if (res.ok) {
                const labels = {
                    newest: 'Od najnowszych',
                    random: 'Losowo',
                    alphabetical: 'Alfabetycznie A-Z'
                };
                toast.success(`Sortowanie zmienione: ${labels[sortOrder]}`);
            } else {
                toast.error("Błąd podczas zapisywania");
            }
        } catch (e) {
            toast.error("Błąd połączenia");
        } finally {
            setSavingSortOrder(false);
        }
    };

    const updateEmail = async (company: Company, newEmail: string) => {
        setUpdatingEmail(company.id);
        setEditingEmailId(null);
        const originalCompanies = companies;

        try {
            const res = await fetch(`${apiUrl}/admin/companies/${company.id}`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ email: newEmail.trim() || null })
            });
            if (res.ok) {
                setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, email: newEmail.trim() || undefined } : c));
                toast.success(newEmail.trim() ? `Email zaktualizowany: ${newEmail}` : "Email usunięty");
            } else {
                toast.error("Błąd podczas aktualizacji emaila");
            }
        } catch (e) {
            console.error("Failed to update email", e);
            toast.error("Błąd połączenia");
        } finally {
            setUpdatingEmail(null);
        }
    };

    const updateCategory = async (company: Company, newCategoryId: number) => {
        setUpdatingCategory(company.id);
        const originalCompanies = companies;

        try {
            const res = await fetch(`${apiUrl}/admin/companies/${company.id}/category`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ category_id: newCategoryId })
            });
            if (res.ok) {
                setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, category_id: newCategoryId } : c));
                const catName = categories.find(c => c.id === newCategoryId)?.name || "";
                toast.success(`Kategoria zmieniona na: ${catName}`);
            } else {
                toast.error("Błąd podczas zmiany kategorii");
            }
        } catch (e) {
            console.error("Failed to update category", e);
            toast.error("Błąd połączenia");
        } finally {
            setUpdatingCategory(null);
        }
    };

    // Prepare chart data (last 30 days from history, or empty if no history)
    const chartData = (stats?.history || []).slice(-30).map(d => d.views + d.clicks);
    const maxVal = Math.max(...chartData, 1);
    const normalizedData = chartData.map(v => Math.round((v / maxVal) * 100));
    const daysLabels = (stats?.history || []).slice(-30).map(d => d.date.slice(5)); // MM-DD

    // Show login form if not logged in
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Administratora</h1>
                            <p className="text-slate-500 mt-1">Wprowadź hasło aby kontynuować</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Hasło</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    autoFocus
                                />
                            </div>

                            {loginError && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
                                    {loginError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                            >
                                Zaloguj
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Ładowanie panelu administratora...</div>;
    }

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1e293b',
                        color: '#fff',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
                    <header className="flex items-center justify-between">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Panel Administratora</h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={exportEmailsCSV}
                                className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Eksportuj Emaile (CSV)
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Wyloguj
                            </button>
                            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-primary">Wróć do strony głównej</Link>
                        </div>
                    </header>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <StatCard title="Firmy" value={stats?.total_companies || 0} icon="building" color="blue" />
                        <StatCard title="Wyświetlenia" value={stats?.total_views || 0} icon="eye" color="green" />
                        <StatCard title="Opinie" value={stats?.total_reviews || 0} icon="chat" color="orange" />
                    </div>

                    {/* Chart */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Aktywność (ostatnie 30 dni)</h3>
                        <div className="h-48 flex items-end gap-2 justify-between px-2">
                            {normalizedData.length > 0 ? normalizedData.map((h, i) => (
                                <div key={i} className="flex-1 min-w-[30px] max-w-[60px] bg-slate-100 dark:bg-slate-700 rounded-t-xl relative group overflow-hidden" style={{ height: '100%' }}>
                                    <div
                                        className="absolute bottom-0 inset-x-0 bg-primary group-hover:bg-primary-dark transition-all duration-500"
                                        style={{ height: `${Math.max(h, 5)}%` }}
                                    ></div>
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 group-hover:text-white z-10 whitespace-nowrap">
                                        {daysLabels[i]}
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-500 transition-opacity">
                                        {chartData[i]}
                                    </div>
                                </div>
                            )) : (
                                <div className="w-full text-center text-slate-400 self-center">Brak danych z ostatnich dni</div>
                            )}
                        </div>
                    </div>

                    {/* Companies Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lista Firm</h3>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Sortuj po:
                                </label>
                                <select
                                    value={adminSortBy}
                                    onChange={(e) => setAdminSortBy(e.target.value as 'name' | 'confirmed' | 'created')}
                                    className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                >
                                    <option value="created">Data utworzenia</option>
                                    <option value="confirmed">Data potwierdzenia</option>
                                    <option value="name">Nazwa alfabetycznie</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4">Firma</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Kategoria</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Promocja</th>
                                        <th className="px-6 py-4 text-center">Widoki</th>
                                        <th className="px-6 py-4">Utworzono/Potwierdzono</th>
                                        <th className="px-6 py-4 text-right">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {companies
                                        .slice()
                                        .sort((a, b) => {
                                            if (adminSortBy === 'name') {
                                                return a.name.localeCompare(b.name);
                                            } else if (adminSortBy === 'confirmed') {
                                                const dateA = a.last_confirmed_at ? new Date(a.last_confirmed_at).getTime() : 0;
                                                const dateB = b.last_confirmed_at ? new Date(b.last_confirmed_at).getTime() : 0;
                                                return dateA - dateB; // Oldest first
                                            } else { // created
                                                return (a.created_at || 0) - (b.created_at || 0); // Oldest first
                                            }
                                        })
                                        .map((c, idx) => (
                                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 text-center font-mono text-slate-400 font-semibold">#{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingEmailId === c.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="email"
                                                                value={tempEmail}
                                                                onChange={(e) => setTempEmail(e.target.value)}
                                                                className="text-xs px-2 py-1.5 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-primary/20 outline-none w-full"
                                                                autoFocus
                                                                placeholder="email@example.com"
                                                            />
                                                            <button
                                                                onClick={() => updateEmail(c, tempEmail)}
                                                                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                                                                disabled={updatingEmail === c.id}
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingEmailId(null); setTempEmail(""); }}
                                                                className="text-xs px-2 py-1 rounded bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white hover:bg-slate-400"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                                {c.email || <span className="italic text-slate-400">Brak emaila</span>}
                                                            </span>
                                                            <button
                                                                onClick={() => { setEditingEmailId(c.id); setTempEmail(c.email || ""); }}
                                                                className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:text-primary-dark transition-opacity"
                                                                title="Edytuj email"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={(c as any).category_id || ""}
                                                        onChange={(e) => updateCategory(c, parseInt(e.target.value))}
                                                        disabled={updatingCategory === c.id}
                                                        className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                                                    >
                                                        <option value="">Brak kategorii</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>
                                                                {cat.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleStatus(c)}
                                                        className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer ${c.status === 'published'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200'
                                                            }`}
                                                        title={c.status === 'published' ? 'Kliknij aby wycofać do szkicu' : 'Kliknij aby opublikować'}
                                                    >
                                                        {c.status === 'published' ? '✓ Opublikowane' : '⏳ Szkic'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => togglePromotion(c)}
                                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${c.is_promoted ? 'bg-yellow-400 border-yellow-500 text-white' : 'bg-white border-slate-300 hover:border-yellow-400'
                                                            }`}
                                                    >
                                                        {c.is_promoted && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">
                                                    {c.views}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                                                    {c.last_confirmed_at ? new Date(c.last_confirmed_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nigdy'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {c.edit_token && (
                                                            <>
                                                                <Link
                                                                    href={`/edycja/${c.edit_token}`}
                                                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                                                    title="Edytuj ogłoszenie (wymaga emaila)"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Edytuj
                                                                </Link>
                                                                <button
                                                                    onClick={() => copyLink(c.edit_token!)}
                                                                    className="text-xs font-bold text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
                                                                    title="Kopiuj link do edycji"
                                                                >
                                                                    Link
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => deleteCompany(c.id)}
                                                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                                            title="Usuń firmę"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            X
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        {companies.length === 0 && (
                            <div className="p-10 text-center text-slate-500">Brak firm w bazie.</div>
                        )}
                    </div>

                    {/* Reviews Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recenzje ({reviews.length})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Firma</th>
                                        <th className="px-6 py-4">Ocena</th>
                                        <th className="px-6 py-4">Komentarz</th>
                                        <th className="px-6 py-4">IP Address</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4 text-right">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {reviews.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-500">#{r.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{r.company_name || `Firma ID: ${r.company_id}`}</div>
                                                <div className="text-xs text-slate-500">ID: {r.company_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <svg
                                                            key={i}
                                                            className={`w-4 h-4 ${i < r.rating ? 'text-yellow-400' : 'text-slate-300'}`}
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                    <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">{r.rating}/5</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-md">
                                                <div className="text-slate-600 dark:text-slate-400 line-clamp-2">{r.comment || "Brak komentarza"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-slate-600 dark:text-slate-400">{r.ip_address || "unknown"}</div>
                                                <div className="text-[10px] text-slate-400">User #{r.author_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    {r.created_at ? new Date(r.created_at * 1000).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {r.ip_address && r.ip_address !== "unknown" && (
                                                        <button
                                                            onClick={() => blockIP(r.ip_address!)}
                                                            className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                                            title="Zablokuj IP"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            Block
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteReview(r.id)}
                                                        className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                                                        title="Usuń recenzję"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Usuń
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {reviews.length === 0 && (
                            <div className="p-10 text-center text-slate-500">Brak recenzji w bazie.</div>
                        )}
                    </div>
                </div>

                {/* Categories Management Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">📂</span>
                            Zarządzanie Kategoriami
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Dodawaj lub usuwaj branże widoczne w filtrze i przy dodawaniu ogłoszeń</p>
                    </div>

                    {/* Add New Category Form */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">➕ Dodaj nową kategorię</h3>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Emoji</label>
                                <input
                                    type="text"
                                    value={newCategory.emoji}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, emoji: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base text-center"
                                    maxLength={4}
                                    placeholder="🏢"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa</label>
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                                    placeholder="np. IT & Software"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Opis</label>
                                <input
                                    type="text"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                                    placeholder="Krótki opis kategorii"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={addCategory}
                                    className="w-full px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                                >
                                    Dodaj
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div className="p-6">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">📋 Istniejące kategorie ({categories.length})</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group hover:border-primary transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{cat.description?.match(/^[\p{Emoji}]/u)?.[0] || '🏢'}</span>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{cat.name}</p>
                                            <p className="text-xs text-slate-500">{cat.slug}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteCategoryHandler(cat.id)}
                                        disabled={deletingCategory === cat.id}
                                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                                    >
                                        {deletingCategory === cat.id ? '...' : '✕'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {categories.length === 0 && (
                            <div className="p-10 text-center text-slate-500">Brak kategorii w bazie.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Newsletter Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        📧 Ustawienia Newslettera
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Konfiguracja endpointu /companies/random dla newslettera</p>
                </div>
                <div className="p-6 space-y-6">
                    {/* Sort Order */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                🔄 Kolejność wyświetlania ogłoszeń na stronie głównej
                            </label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'random' | 'alphabetical')}
                                className="w-full sm:w-64 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            >
                                <option value="newest">📅 Od najnowszych do najstarszych</option>
                                <option value="random">🎲 Losowo</option>
                                <option value="alphabetical">🔤 Alfabetycznie (A-Z)</option>
                            </select>
                        </div>
                        <button
                            onClick={saveSortOrder}
                            disabled={savingSortOrder}
                            className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {savingSortOrder ? 'Zapisuję...' : 'Zapisz'}
                        </button>
                    </div>

                    {/* Newsletter Count */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Liczba losowych firm w newsletterze
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={newsletterCount}
                                onChange={(e) => setNewsletterCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-full sm:w-32 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-center text-base focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            />
                        </div>
                        <button
                            onClick={saveNewsletterCount}
                            disabled={savingNewsletter}
                            className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {savingNewsletter ? 'Zapisuję...' : 'Zapisz'}
                        </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">🔗 Endpoint API:</p>
                        <code className="block text-xs bg-slate-200 dark:bg-slate-800 p-3 rounded-lg text-slate-800 dark:text-slate-200 break-all">
                            GET {apiUrl}/companies/random?count={newsletterCount}
                        </code>
                        <p className="text-xs text-slate-500 mt-2">
                            Każda firma ma zdjęcie dostępne pod: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">/companies/ID/photo</code>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: number, icon: string, color: string }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
                <div className="w-6 h-6 bg-current rounded-full opacity-20" />
            </div>
        </div>
    );
}
