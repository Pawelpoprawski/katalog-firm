import { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryPageClient from "./CategoryPageClient";
import { Category, Company } from "@/types";
import { SITE_URL } from "@/lib/siteUrl";
import { metaDesc } from "@/lib/utils";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const revalidate = 300;

type Props = { params: { slug: string } };

async function getCategory(slug: string): Promise<Category | null> {
  try {
    const res = await fetch(`${apiUrl}/categories/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const categories: Category[] = await res.json();
    return categories.find((c) => c.slug === slug) || null;
  } catch {
    return null;
  }
}

async function getCompanies(categoryId: number): Promise<Company[] | null> {
  try {
    const res = await fetch(`${apiUrl}/companies/`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const all: Company[] = Array.isArray(data) ? data : data.companies || [];
    const list = all.filter((c) => c.category_id === categoryId && (c as { is_active?: boolean }).is_active !== false);
    console.log(`[kategoria] firmy z API: ${all.length}, w kategorii ${categoryId}: ${list.length}`);
    return list;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) {
    return {
      title: "Kategoria nie znaleziona",
      robots: { index: false, follow: false },
    };
  }

  const catName = category.name.toLowerCase();
  const title = `${category.name}: polskie firmy w Szwajcarii`;
  const description = metaDesc(category.description
    ? `${category.description}. Polskie firmy w kategorii ${catName} w Szwajcarii: kontakt, opinie, lokalizacja.`
    : `Sprawdzone polskie firmy w kategorii ${catName} w Szwajcarii. Polonijny katalog z opisami, kontaktami i opiniami. Dodaj swoją firmę za darmo.`);

  return {
    title,
    description,
    keywords: [
      `polski ${catName} Szwajcaria`,
      `polski ${catName} Zurich`,
      `polski ${catName} Bern`,
      `${category.name} po polsku`,
      `${category.name} polonijne`,
      `${category.name} w Szwajcarii`,
      "polskie firmy polonijne",
      "firmy polskie Szwajcaria",
      "katalog firm polonijnych",
    ],
    openGraph: {
      title: `${category.name} | Katalog Firm Polonijnych`,
      description,
      type: "website",
      url: `${SITE_URL}/kategoria/${params.slug}`,
      siteName: "Katalog Firm Polonijnych w Szwajcarii",
      locale: "pl_PL",
      images: [
        {
          url: `${SITE_URL}/og.png`,
          width: 1200,
          height: 630,
          alt: `${category.name} — polskie firmy w Szwajcarii`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | Katalog Firm`,
      description,
      images: [`${SITE_URL}/og.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/kategoria/${params.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory(params.slug);
  if (!category) {
    notFound();
  }
  // Firmy pobrane na serwerze: lista i H1 są w HTML od razu (audyt SEO 05.10 - wcześniej Google dostawał sam szkielet ładowania).
  const companies = await getCompanies(category!.id);
  return <CategoryPageClient categorySlug={params.slug} initialCategory={category} initialCompanies={companies} />;
}
