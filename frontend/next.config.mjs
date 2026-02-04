/** @type {import('next').NextConfig} */
const nextConfig = {
  // Warunkowy basePath: pusty dla dev, /uslugi dla produkcji
  basePath: process.env.NODE_ENV === 'production' ? '/uslugi' : '',
  reactStrictMode: true,
  // Removed basePath and assetPrefix - they were causing redirect loops
  // The app should work directly on / for local development


  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },

  // Enable static export for better SEO (optional, can use SSR instead)
  // output: "export",
};

export default nextConfig;

