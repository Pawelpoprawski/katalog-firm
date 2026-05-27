"use client";

import { useEffect, useState } from "react";

type AiSearch = {
  ts: number;          // unix seconds
  query: string;
  ip: string;
  result_count: number;
};

type Props = {
  apiUrl: string;
  getAuthHeaders: () => Record<string, string>;
};

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h temu`;
  return d.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

function maskIp(ip: string): string {
  // Show first 3 octets + xxx (privacy + still identifiable)
  if (!ip) return "—";
  if (ip.includes(":")) {
    // IPv6 — show first 4 groups
    return ip.split(":").slice(0, 4).join(":") + ":…";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  return ip;
}

export default function AdminAiSearches({ apiUrl, getAuthHeaders }: Props) {
  const [searches, setSearches] = useState<AiSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullIp, setShowFullIp] = useState(false);
  const [limit, setLimit] = useState(100);

  const fetchSearches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/ai-searches?limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AiSearch[] = await res.json();
      setSearches(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Aggregate stats
  const now = Math.floor(Date.now() / 1000);
  const last24h = searches.filter((s) => now - s.ts < 86400).length;
  const last1h = searches.filter((s) => now - s.ts < 3600).length;
  const uniqueIps24h = new Set(searches.filter((s) => now - s.ts < 86400).map((s) => s.ip)).size;

  // Top queries (most frequent)
  const queryCounts = new Map<string, number>();
  for (const s of searches) {
    const q = s.query.toLowerCase().trim();
    queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
  }
  const topQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Wyszukiwania AI</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Czego użytkownicy szukają przez AI-search ({searches.length} ostatnich, max 500)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFullIp(!showFullIp)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            {showFullIp ? "Ukryj pełne IP" : "Pokaż pełne IP"}
          </button>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            <option value={50}>50 ostatnich</option>
            <option value={100}>100 ostatnich</option>
            <option value={200}>200 ostatnich</option>
            <option value={500}>500 ostatnich</option>
          </select>
          <button
            onClick={fetchSearches}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-dark"
            disabled={loading}
          >
            {loading ? "..." : "Odśwież"}
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Ostatnia godzina</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{last1h}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Ostatnie 24h</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{last24h}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Unikalne IP / 24h</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{uniqueIps24h}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Wszystkie w logu</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{searches.length}</div>
        </div>
      </div>

      {/* Top queries */}
      {topQueries.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Top zapytania</h4>
          <div className="flex flex-wrap gap-2">
            {topQueries.map(([q, count]) => (
              <span
                key={q}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold"
              >
                {q}
                <span className="text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Błąd: {error}
        </div>
      )}

      {/* Queries table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 px-2 font-bold">Czas</th>
              <th className="py-2 px-2 font-bold">Zapytanie</th>
              <th className="py-2 px-2 font-bold text-right">IDs</th>
              <th className="py-2 px-2 font-bold">IP</th>
            </tr>
          </thead>
          <tbody>
            {searches.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                  Brak wyszukiwań AI w logu.
                </td>
              </tr>
            )}
            {searches.map((s, i) => (
              <tr
                key={`${s.ts}-${i}`}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{formatTs(s.ts)}</td>
                <td className="py-2 px-2 font-medium text-slate-900 dark:text-white">{s.query}</td>
                <td className="py-2 px-2 text-right">
                  <span
                    className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded text-xs font-bold ${
                      s.result_count > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.result_count}
                  </span>
                </td>
                <td className="py-2 px-2 text-xs text-slate-500 font-mono whitespace-nowrap">
                  {showFullIp ? (s.ip || "—") : maskIp(s.ip)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
