"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface AdminSettingsProps {
  newsletterCount: number;
  setNewsletterCount: (n: number) => void;
  sortOrder: "newest" | "random" | "alphabetical";
  setSortOrder: (s: "newest" | "random" | "alphabetical") => void;
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function AdminSettings({
  newsletterCount,
  setNewsletterCount,
  sortOrder,
  setSortOrder,
  apiUrl,
  getAuthHeaders,
}: AdminSettingsProps) {
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [savingSortOrder, setSavingSortOrder] = useState(false);

  const saveNewsletterCount = async () => {
    setSavingNewsletter(true);
    try {
      const res = await fetch(`${apiUrl}/admin/settings/newsletter-count`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ count: newsletterCount }),
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
        body: JSON.stringify({ sort_order: sortOrder }),
      });
      if (res.ok) {
        const labels = { newest: "Od najnowszych", random: "Losowo", alphabetical: "Alfabetycznie A-Z" };
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">📧 Ustawienia Newslettera</h2>
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
              onChange={(e) => setSortOrder(e.target.value as "newest" | "random" | "alphabetical")}
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
            {savingSortOrder ? "Zapisuję..." : "Zapisz"}
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
            {savingNewsletter ? "Zapisuję..." : "Zapisz"}
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
  );
}
