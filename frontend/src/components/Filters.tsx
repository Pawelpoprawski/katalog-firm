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
    <div className="bg-white border border-[#E0E3E8] rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* Category dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          className="flex items-center gap-3 rounded border border-[#E0E3E8] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D2240] hover:border-[#E1002A] focus:border-[#E1002A] outline-none transition-colors w-full sm:w-auto sm:min-w-[220px]"
        >
          <svg className="w-4 h-4 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="flex-1 text-left">
            {selectedCategory
              ? categories.find((c) => c.id === selectedCategory)?.name
              : "Wszystkie branże"}
          </span>
          <svg
            className={`w-4 h-4 text-[#888] transition-transform duration-200 ${
              isCategoryDropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isCategoryDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)} />
            <div className="absolute z-20 mt-2 w-full min-w-[280px] rounded-md border border-[#E0E3E8] bg-white shadow-xl overflow-hidden animate-fade-in">
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`hays-cat-card w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm font-medium transition-colors ${
                    !selectedCategory
                      ? "bg-[#FFF0F3] text-[#E1002A] font-semibold"
                      : "text-[#0D2240] hover:bg-[#F5F6F8]"
                  }`}
                >
                  <span className="flex-1">Wszystkie branże</span>
                  <span className="text-xs text-[#888]">{companies.length}</span>
                </button>
                <div className="border-t border-[#E0E3E8]" />
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`hays-cat-card w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-[#FFF0F3] text-[#E1002A] font-semibold"
                        : "text-[#0D2240] hover:bg-[#F5F6F8]"
                    }`}
                  >
                    <span className="flex-1">{cat.name}</span>
                    <span className="text-xs text-[#888]">
                      {companies.filter((c) => c.category_id === cat.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search bar */}
      <div className="relative w-full sm:flex-1 sm:max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#888]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj firmy, miasta, branży..."
          className="w-full pl-10 pr-4 py-2.5 rounded border border-[#E0E3E8] bg-white text-sm focus:border-[#E1002A] focus:ring-2 focus:ring-[#E1002A]/10 transition-all outline-none placeholder:text-[#888]"
        />
      </div>

      {/* Results count */}
      {!loading && (
        <div className="hidden md:flex items-center gap-2 ml-auto text-sm text-[#555]">
          <span className="font-bold text-[#E1002A]">{totalResults}</span>
          <span>wyników</span>
        </div>
      )}
    </div>
  );
}
