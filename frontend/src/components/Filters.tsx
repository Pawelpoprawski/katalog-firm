"use client";

import { Company, Category } from "@/types";

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCanton: string;
  setSelectedCanton: (c: string) => void;
  selectedCategory: number | null;
  setSelectedCategory: (c: number | null) => void;
  sortOrder: "newest" | "random" | "alphabetical";
  setSortOrder: (s: "newest" | "random" | "alphabetical") => void;
  categories: Category[];
  loadingCategories: boolean;
  isCategoryDropdownOpen: boolean;
  setIsCategoryDropdownOpen: (b: boolean) => void;
  totalResults: number;
  companies: Company[];
  loading: boolean;
}

export default function Filters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  isCategoryDropdownOpen,
  setIsCategoryDropdownOpen,
  totalResults,
  companies,
  loading,
}: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* Category Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none cursor-pointer transition-all shadow-sm hover:shadow-md w-full sm:w-auto sm:min-w-[200px]"
        >
          <span className="flex-1 text-left">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : "Wszystkie branże"}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              isCategoryDropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isCategoryDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsCategoryDropdownOpen(false)}
            />
            <div className="absolute z-20 mt-2 w-full min-w-[280px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden animate-fade-in">
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm font-bold transition-all hover:bg-primary/10 ${
                    !selectedCategory
                      ? "bg-primary/20 text-primary dark:text-primary-light"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="flex-1">Wszystkie branże</span>
                  {!selectedCategory && (
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700" />
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm font-bold transition-all hover:bg-primary/10 ${
                      selectedCategory === cat.id
                        ? "bg-primary/20 text-primary dark:text-primary-light"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex-1">{cat.name}</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {companies.filter((c) => c.category_id === cat.id).length}
                    </span>
                    {selectedCategory === cat.id && (
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80 md:w-96 group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none dark:text-white"
        />
      </div>

      {/* Results count */}
      {!loading && (
        <div className="hidden md:flex items-center gap-2 ml-auto text-sm text-slate-500">
          <span className="font-bold text-primary">{totalResults}</span>
          <span>wyników</span>
        </div>
      )}
    </div>
  );
}
