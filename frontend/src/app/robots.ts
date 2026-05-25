import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://katalog-firm.ch';
const noindex = process.env.NEXT_PUBLIC_NOINDEX === 'true';

// UWAGA: Google interpretuje Disallow jako prefix match — "/admin/" NIE blokuje "/admin".
// Dlatego trzymamy oba warianty (ze slash i bez) dla każdej prywatnej ścieżki.
const privateDisallow = [
  '/admin', '/admin/',
  '/api/', '/_next/',
  '/login',
  '/rejestracja',
  '/konto', '/konto/',
  '/ulubione',
  '/edycja/',
  '/potwierdz', '/potwierdz/',
];

const aiAndSearchBots = [
  // Search engines
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Slurp',
  'Baiduspider',
  'YandexBot',
  // AI crawlers — explicit opt-in (training + retrieval)
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'Applebot',
  'Applebot-Extended',
  'cohere-ai',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Diffbot',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  if (noindex) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: baseUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privateDisallow,
      },
      ...aiAndSearchBots.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: privateDisallow,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
