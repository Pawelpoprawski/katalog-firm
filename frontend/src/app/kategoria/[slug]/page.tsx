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
      title: "Kategoria nie znaleziona | PolacySzwajcaria",
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} – Polskie usługi w Szwajcarii | PolacySzwajcaria`;
  const description = category.description
    ? `${category.description}. Znajdź sprawdzone polskie firmy w kategorii ${category.name} w Szwajcarii.`
    : `Polskie firmy w kategorii ${category.name} w Szwajcarii. Katalog sprawdzonych usług polonijnych.`;

  return {
    title,
    description,
    keywords: [category.name, "polskie usługi", "Szwajcaria", "firmy polonijne", "katalog firm"],
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://katalog-firm.ch/kategoria/${params.slug}`,
      siteName: "Polskie Usługi w Szwajcarii",
      locale: "pl_PL",
      images: [
        {
          url: "https://katalog-firm.ch/logo.png",
          width: 512,
          height: 512,
          alt: `${category.name} - Polskie Usługi w Szwajcarii`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://katalog-firm.ch/logo.png"],
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
