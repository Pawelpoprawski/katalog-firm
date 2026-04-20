"use client";

import { useState } from "react";

type AnalyticsDay = {
  date: string;
  views: number;
  unique_ips: number;
  new_companies: number;
  new_reviews: number;
  confirmation_emails_sent: number;
  confirmations_received: number;
};

type Stats = {
  total_companies: number;
  total_reviews: number;
  total_views: number;
  total_clicks: number;
  history: Array<{ date: string; views: number; clicks: number }>;
};

const chartLines = [
  { key: "views" as const, label: "Wyświetlenia", color: "#3b82f6" },
  { key: "unique_ips" as const, label: "Unikalni użytkownicy (IP)", color: "#10b981" },
  { key: "new_companies" as const, label: "Nowe firmy", color: "#f59e0b" },
  { key: "new_reviews" as const, label: "Nowe opinie", color: "#ef4444" },
  { key: "confirmation_emails_sent" as const, label: "Wysłane prośby o potwierdzenie", color: "#8b5cf6" },
  { key: "confirmations_received" as const, label: "Otrzymane potwierdzenia", color: "#06b6d4" },
];

// Cron wysyłki maili: 0 10 */5 * * = dni 5, 10, 15, 20, 25, 30 miesiąca o 10:00
// Zwraca najbliższą datę w przyszłości kiedy cron się odpali.
function getNextEmailRun(from: Date = new Date()): Date {
  const targetDays = [5, 10, 15, 20, 25, 30];
  const probe = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 10, 0, 0);
  for (let i = 0; i < 40; i++) {
    if (targetDays.includes(probe.getDate()) && probe.getTime() > from.getTime()) {
      return probe;
    }
    probe.setDate(probe.getDate() + 1);
    probe.setHours(10, 0, 0, 0);
  }
  return probe;
}

function formatTimeUntil(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "już wkrótce";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return `za ${hours} h`;
  if (days === 1) return "jutro";
  return `za ${days} dni`;
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
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

interface AdminStatsProps {
  stats: Stats | null;
  analytics: AnalyticsDay[];
}

export default function AdminStats({ stats, analytics }: AdminStatsProps) {
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    views: true,
    unique_ips: true,
    new_companies: true,
    new_reviews: true,
    confirmation_emails_sent: true,
    confirmations_received: true,
  });
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const nextEmailRun = getNextEmailRun();
  const nextEmailRunFormatted = nextEmailRun.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const nextEmailRunRelative = formatTimeUntil(nextEmailRun);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard title="Firmy" value={stats?.total_companies || 0} icon="building" color="blue" />
        <StatCard title="Wyświetlenia" value={stats?.total_views || 0} icon="eye" color="green" />
        <StatCard title="Unikalni (dziś)" value={analytics.length > 0 ? analytics[analytics.length - 1]?.unique_ips || 0 : 0} icon="user" color="purple" />
        <StatCard title="Opinie" value={stats?.total_reviews || 0} icon="chat" color="orange" />
      </div>

      {/* Następna cykliczna wysyłka maili potwierdzenia aktywności firm */}
      <div className="bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/30 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
            Następna wysyłka maili potwierdzenia
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-black text-slate-900 dark:text-white">{nextEmailRunRelative}</span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="font-semibold">{nextEmailRunFormatted}</span>
            <span className="text-slate-500 dark:text-slate-400"> o 10:00</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cron odpala się co 5 dni (dni 5, 10, 15, 20, 25, 30) — wysyła tylko do firm z cooldown &gt; 30 dni
          </p>
        </div>
      </div>

      {/* Analytics Line Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Statystyki (ostatnie 30 dni)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {chartLines.map((line) => {
              const total = analytics.reduce((s, d) => s + (d[line.key as keyof AnalyticsDay] as number), 0);
              const firstHalf = analytics.slice(0, 15).reduce((s, d) => s + (d[line.key as keyof AnalyticsDay] as number), 0);
              const secondHalf = analytics.slice(15).reduce((s, d) => s + (d[line.key as keyof AnalyticsDay] as number), 0);
              const pctChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : secondHalf > 0 ? 100 : 0;
              return (
                <button
                  key={line.key}
                  onClick={() => setVisibleLines((prev) => ({ ...prev, [line.key]: !prev[line.key] }))}
                  className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${
                    visibleLines[line.key]
                      ? "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50"
                      : "border-slate-100 dark:border-slate-700 opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{line.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2 pl-5">
                    <span className="text-xl font-black text-slate-900 dark:text-white">{total}</span>
                    {pctChange !== 0 && (
                      <span className={`text-xs font-bold ${pctChange > 0 ? "text-green-500" : "text-red-500"}`}>
                        {pctChange > 0 ? "+" : ""}{pctChange}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {analytics.length > 0
          ? (() => {
              const W = 900,
                H = 250,
                PX = 50,
                PY = 20;
              const days = analytics;
              const activeKeys = chartLines.filter((l) => visibleLines[l.key]).map((l) => l.key);
              const allValues = days.flatMap((d) => activeKeys.map((k) => d[k]));
              const maxY = Math.max(...allValues, 1);
              const stepX = (W - PX) / Math.max(days.length - 1, 1);

              const makePath = (key: keyof AnalyticsDay) => {
                return days
                  .map((d, i) => {
                    const x = PX + i * stepX;
                    const y = H - PY - ((d[key] as number) / maxY) * (H - 2 * PY);
                    return `${i === 0 ? "M" : "L"}${x},${y}`;
                  })
                  .join(" ");
              };

              const ySteps = 4;
              const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => Math.round((maxY / ySteps) * i));

              return (
                <div className="overflow-x-auto relative">
                  <svg
                    viewBox={`0 0 ${W} ${H + 30}`}
                    className="w-full min-w-[600px]"
                    style={{ height: 300 }}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {yLabels.map((val, i) => {
                      const y = H - PY - (val / maxY) * (H - 2 * PY);
                      return (
                        <g key={i}>
                          <line x1={PX} y1={y} x2={W} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                          <text x={PX - 8} y={y + 4} textAnchor="end" className="text-[11px]" fill="#94a3b8">
                            {val}
                          </text>
                        </g>
                      );
                    })}
                    {chartLines
                      .filter((l) => visibleLines[l.key])
                      .map((line) => (
                        <path
                          key={line.key}
                          d={makePath(line.key as keyof AnalyticsDay)}
                          fill="none"
                          stroke={line.color}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    {chartLines
                      .filter((l) => visibleLines[l.key])
                      .map((line) =>
                        days.map((d, i) => {
                          const x = PX + i * stepX;
                          const y = H - PY - ((d[line.key as keyof AnalyticsDay] as number) / maxY) * (H - 2 * PY);
                          const isHovered = hoveredDay === i;
                          return (
                            <circle
                              key={`${line.key}-${i}`}
                              cx={x}
                              cy={y}
                              r={isHovered ? 5 : 3}
                              fill={line.color}
                              opacity={isHovered ? 1 : 0.8}
                            />
                          );
                        })
                      )}
                    {hoveredDay !== null && (
                      <line
                        x1={PX + hoveredDay * stepX}
                        y1={PY}
                        x2={PX + hoveredDay * stepX}
                        y2={H - PY}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                    )}
                    {days.map((_, i) => {
                      const x = PX + i * stepX - stepX / 2;
                      return (
                        <rect
                          key={`hover-${i}`}
                          x={Math.max(x, 0)}
                          y={0}
                          width={stepX}
                          height={H + 30}
                          fill="transparent"
                          onMouseEnter={() => setHoveredDay(i)}
                        />
                      );
                    })}
                    {hoveredDay !== null &&
                      (() => {
                        const d = days[hoveredDay];
                        const tx = PX + hoveredDay * stepX;
                        const tooltipX = tx > W / 2 ? tx - 160 : tx + 10;
                        return (
                          <foreignObject x={tooltipX} y={10} width={180} height={180}>
                            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 p-3 text-xs">
                              <div className="font-bold text-slate-900 dark:text-white mb-2">{d.date}</div>
                              {chartLines
                                .filter((l) => visibleLines[l.key])
                                .map((line) => (
                                  <div key={line.key} className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                                      <span className="text-slate-500 dark:text-slate-300">{line.label.split(" ")[0]}</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{d[line.key as keyof AnalyticsDay]}</span>
                                  </div>
                                ))}
                            </div>
                          </foreignObject>
                        );
                      })()}
                    {days.map((d, i) => {
                      if (i % 5 !== 0 && i !== days.length - 1) return null;
                      const x = PX + i * stepX;
                      return (
                        <text key={i} x={x} y={H + 15} textAnchor="middle" className="text-[10px]" fill="#94a3b8">
                          {d.date.slice(5)}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              );
            })()
          : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              Brak danych analitycznych. Dane pojawią się po pierwszych wizytach.
            </div>
          )}
      </div>
    </>
  );
}
