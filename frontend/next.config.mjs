/** @type {import('next').NextConfig} */

const PUBLIC_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const ROBOTS_CACHE = "public, max-age=3600";

const cachePublicHeader = [{ key: "Cache-Control", value: PUBLIC_CACHE }];

// Security headers — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection,
// Referrer-Policy oraz CSP są ustawiane przez nginx (production) — nie duplikujemy
// ich tutaj, żeby uniknąć podwójnych wartości w response headers.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },

      // Public, cacheable pages — fix dla Googlebot crawl budget
      { source: '/', headers: cachePublicHeader },
      { source: '/firma/:slug*', headers: cachePublicHeader },
      { source: '/kategoria/:slug*', headers: cachePublicHeader },
      { source: '/jak-to-dziala', headers: cachePublicHeader },
      { source: '/polityka-prywatnosci', headers: cachePublicHeader },
      { source: '/dodaj', headers: cachePublicHeader },

      // Robots — sitemap zarządza się sam przez `export const revalidate` w sitemap.ts
      // (dodanie tutaj zduplikowało Cache-Control header → must-revalidate wygrywał).
      { source: '/robots.txt', headers: [{ key: 'Cache-Control', value: ROBOTS_CACHE }] },
    ];
  },
};

export default nextConfig;
