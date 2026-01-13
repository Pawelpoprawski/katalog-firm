import { MetadataRoute } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const baseUrl = "https://polacyszwajcaria.com/uslugi";

async function getCompanies() {
  try {
    const res = await fetch(`${apiUrl}/companies/`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${apiUrl}/categories/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}


type Company = {
  slug: string;
  is_active: boolean;
  updated_at?: number;
};

type Category = {
  slug: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = (await getCompanies()) as Company[];
  const categories = (await getCategories()) as Category[];

  const companyUrls = companies
    .filter((c) => c.slug && c.is_active)
    .map((c) => ({
      url: `${baseUrl}/firma/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at * 1000) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/kategoria/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/dodaj`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...categoryUrls,
    ...companyUrls,
  ];
}

