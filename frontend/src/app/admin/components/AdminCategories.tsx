"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Category } from "@/types";

interface AdminCategoriesProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function AdminCategories({ categories, setCategories, apiUrl, getAuthHeaders }: AdminCategoriesProps) {
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "", emoji: "🏢" });
  const [deletingCategory, setDeletingCategory] = useState<number | null>(null);

  const addCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.slug.trim()) {
      toast.error("Nazwa i slug są wymagane");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/admin/categories`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newCategory),
      });
      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setNewCategory({ name: "", slug: "", description: "", emoji: "🏢" });
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
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));

    try {
      const res = await fetch(`${apiUrl}/admin/categories/${categoryId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">📂</span>
          Zarządzanie Kategoriami
        </h2>
        <p className="text-sm text-slate-500 mt-1">Dodawaj lub usuwaj branże widoczne w filtrze i przy dodawaniu ogłoszeń</p>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">➕ Dodaj nową kategorię</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Emoji</label>
            <input
              type="text"
              value={newCategory.emoji}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, emoji: e.target.value }))}
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
              onChange={(e) =>
                setNewCategory((prev) => ({
                  ...prev,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
              placeholder="np. IT & Software"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Opis</label>
            <input
              type="text"
              value={newCategory.description}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
              placeholder="Krótki opis kategorii"
            />
          </div>
          <div className="flex items-end">
            <button onClick={addCategory} className="w-full px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors">
              Dodaj
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">📋 Istniejące kategorie ({categories.length})</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.description?.match(/^[\p{Emoji}]/u)?.[0] || "🏢"}</span>
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
                {deletingCategory === cat.id ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
        {categories.length === 0 && <div className="p-10 text-center text-slate-500">Brak kategorii w bazie.</div>}
      </div>
    </div>
  );
}
