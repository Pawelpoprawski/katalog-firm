"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Category } from "@/types";

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
};

interface AdminCompaniesProps {
  companies: AdminCompany[];
  setCompanies: React.Dispatch<React.SetStateAction<AdminCompany[]>>;
  categories: Category[];
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function AdminCompanies({
  companies,
  setCompanies,
  categories,
  apiUrl,
  getAuthHeaders,
}: AdminCompaniesProps) {
  const [deletingCompany, setDeletingCompany] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [updatingPromotion, setUpdatingPromotion] = useState<number | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState<number | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState<number | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [tempEmail, setTempEmail] = useState("");
  const [adminSortBy, setAdminSortBy] = useState<"name" | "confirmed" | "created">("created");

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/edycja/${token}`;
    navigator.clipboard.writeText(link);
    alert("Skopiowano link do schowka: " + link);
  };

  const togglePromotion = async (company: AdminCompany) => {
    setUpdatingPromotion(company.id);
    const originalCompanies = companies;
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, is_promoted: !c.is_promoted } : c)));

    try {
      const res = await fetch(`${apiUrl}/admin/companies/${company.id}/promote`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_promoted: !company.is_promoted }),
      });
      if (res.ok) {
        toast.success(company.is_promoted ? "Promocja wyłączona" : "Promocja włączona");
      } else {
        setCompanies(originalCompanies);
        toast.error("Błąd podczas zmiany promocji");
      }
    } catch (e) {
      setCompanies(originalCompanies);
      console.error("Failed to toggle promotion", e);
      toast.error("Błąd połączenia");
    } finally {
      setUpdatingPromotion(null);
    }
  };

  const toggleStatus = async (company: AdminCompany) => {
    const newStatus = company.status === "draft" ? "published" : "draft";
    setUpdatingStatus(company.id);
    const originalCompanies = companies;
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c)));

    try {
      const res = await fetch(`${apiUrl}/admin/companies/${company.id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status zmieniony: ${newStatus === "published" ? "✓ Opublikowano" : "⏳ Szkic"}`);
      } else {
        setCompanies(originalCompanies);
        toast.error("Błąd podczas zmiany statusu");
      }
    } catch (e) {
      setCompanies(originalCompanies);
      console.error("Failed to toggle status", e);
      toast.error("Błąd połączenia");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteCompany = async (companyId: number) => {
    setDeletingCompany(companyId);
    const originalCompanies = companies;
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));

    try {
      const res = await fetch(`${apiUrl}/admin/companies/${companyId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Firma usunięta");
      } else {
        setCompanies(originalCompanies);
        toast.error("Błąd podczas usuwania firmy");
      }
    } catch (e) {
      setCompanies(originalCompanies);
      console.error("Failed to delete company", e);
      toast.error("Błąd połączenia: " + e);
    } finally {
      setDeletingCompany(null);
    }
  };

  const updateEmail = async (company: AdminCompany, newEmail: string) => {
    setUpdatingEmail(company.id);
    setEditingEmailId(null);

    try {
      const res = await fetch(`${apiUrl}/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newEmail.trim() || null }),
      });
      if (res.ok) {
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, email: newEmail.trim() || undefined } : c)));
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

  const updateCategory = async (company: AdminCompany, newCategoryId: number) => {
    setUpdatingCategory(company.id);

    try {
      const res = await fetch(`${apiUrl}/admin/companies/${company.id}/category`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ category_id: newCategoryId }),
      });
      if (res.ok) {
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, category_id: newCategoryId } : c)));
        const catName = categories.find((c) => c.id === newCategoryId)?.name || "";
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lista Firm</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Sortuj po:</label>
          <select
            value={adminSortBy}
            onChange={(e) => setAdminSortBy(e.target.value as "name" | "confirmed" | "created")}
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
                if (adminSortBy === "name") {
                  return a.name.localeCompare(b.name);
                } else if (adminSortBy === "confirmed") {
                  const dateA = a.last_confirmed_at ? new Date(a.last_confirmed_at).getTime() : 0;
                  const dateB = b.last_confirmed_at ? new Date(b.last_confirmed_at).getTime() : 0;
                  return dateA - dateB;
                } else {
                  return (a.created_at || 0) - (b.created_at || 0);
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
                          onClick={() => {
                            setEditingEmailId(null);
                            setTempEmail("");
                          }}
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
                          onClick={() => {
                            setEditingEmailId(c.id);
                            setTempEmail(c.email || "");
                          }}
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
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer ${
                        c.status === "published"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200"
                      }`}
                      title={c.status === "published" ? "Kliknij aby wycofać do szkicu" : "Kliknij aby opublikować"}
                    >
                      {c.status === "published" ? "✓ Opublikowane" : "⏳ Szkic"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => togglePromotion(c)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                        c.is_promoted ? "bg-yellow-400 border-yellow-500 text-white" : "bg-white border-slate-300 hover:border-yellow-400"
                      }`}
                    >
                      {c.is_promoted && (
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">{c.views}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                    {c.last_confirmed_at
                      ? new Date(c.last_confirmed_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "Nigdy"}
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
      {companies.length === 0 && <div className="p-10 text-center text-slate-500">Brak firm w bazie.</div>}
    </div>
  );
}
