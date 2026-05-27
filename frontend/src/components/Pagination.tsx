"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    document.getElementById("oferty")?.scrollIntoView({ behavior: "smooth" });
  };

  // Compact page list: 1 … current-1 current current+1 … last
  const pages: (number | "…")[] = [];
  const add = (p: number | "…") => pages.push(p);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    if (currentPage > 3) add("…");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) add(i);
    if (currentPage < totalPages - 2) add("…");
    add(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        type="button"
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-10 w-10 flex items-center justify-center rounded border border-[#E0E3E8] bg-white text-[#0D2240] hover:border-[#E1002A] hover:text-[#E1002A] disabled:opacity-30 disabled:hover:border-[#E0E3E8] disabled:hover:text-[#0D2240] transition-colors"
        aria-label="Poprzednia strona"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex gap-1.5">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="h-10 w-10 flex items-center justify-center text-[#888] text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`h-10 w-10 rounded text-sm font-semibold transition-colors ${
                currentPage === p
                  ? "bg-[#E1002A] text-white"
                  : "bg-white border border-[#E0E3E8] text-[#0D2240] hover:border-[#E1002A] hover:text-[#E1002A]"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        type="button"
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-10 w-10 flex items-center justify-center rounded border border-[#E0E3E8] bg-white text-[#0D2240] hover:border-[#E1002A] hover:text-[#E1002A] disabled:opacity-30 disabled:hover:border-[#E0E3E8] disabled:hover:text-[#0D2240] transition-colors"
        aria-label="Następna strona"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
