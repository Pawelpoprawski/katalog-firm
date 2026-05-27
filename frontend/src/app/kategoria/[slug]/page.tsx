import { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryPageClient from "./CategoryPageClient";
import { Category } from "@/types";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) {
    return {
      title: "Kategoria nie znaleziona",
      robots: { index: false, follow: false },
    };
  }

  const catName = category.name.toLowerCase();
  const title = `${category.name} — polskie firmy w Szwajcarii`;
  const description = category.description
    ? `${category.description} · Polskie firmy w kategorii ${catName} w Szwajcarii. Sprawdzone usługi polonijne — kontakt, opinie, lokalizacja.`
    : `Sprawdzone polskie firmy w kategorii ${catName} w Szwajcarii. Polonijny katalog z opisami, kontaktami i opiniami. Dodaj swoją firmę za darmo.`;

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
      url: `https://katalog-firm.ch/kategoria/${params.slug}`,
      siteName: "Katalog Firm Polonijnych w Szwajcarii",
      locale: "pl_PL",
      images: [
        {
          url: "https://katalog-firm.ch/og.png",
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
      images: ["https://katalog-firm.ch/og.png"],
    },
    alternates: {
      canonical: `https://katalog-firm.ch/kategoria/${params.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory(params.slug);
  if (!category) {
    notFound();
  }
  return <CategoryPageClient categorySlug={params.slug} />;
}
