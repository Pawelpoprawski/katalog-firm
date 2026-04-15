"use client";

import { useState } from "react";
import toast from "react-hot-toast";

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

interface AdminReviewsProps {
  reviews: AdminReview[];
  setReviews: React.Dispatch<React.SetStateAction<AdminReview[]>>;
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function AdminReviews({ reviews, setReviews, apiUrl, getAuthHeaders }: AdminReviewsProps) {
  const [deletingReview, setDeletingReview] = useState<number | null>(null);
  const [blockingIP, setBlockingIP] = useState<string | null>(null);

  const deleteReview = async (reviewId: number) => {
    setDeletingReview(reviewId);
    const originalReviews = reviews;
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));

    try {
      const res = await fetch(`${apiUrl}/admin/reviews/${reviewId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Recenzja usunięta");
      } else {
        setReviews(originalReviews);
        toast.error("Błąd podczas usuwania recenzji");
      }
    } catch (e) {
      setReviews(originalReviews);
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
        body: JSON.stringify({ ip_address: ipAddress }),
      });
      if (res.ok) {
        toast.success(`IP ${ipAddress} został zablokowany`);
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

  return (
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
                        className={`w-4 h-4 ${i < r.rating ? "text-yellow-400" : "text-slate-300"}`}
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
                    {r.created_at
                      ? new Date(r.created_at * 1000).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
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
      {reviews.length === 0 && <div className="p-10 text-center text-slate-500">Brak recenzji w bazie.</div>}
    </div>
  );
}
