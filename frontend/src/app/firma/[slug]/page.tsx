import { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyPageClient from "./CompanyPageClient";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Props = { params: { slug: string } };

async function getCompany(slug: string) {
  try {
    // Try by slug first
    const res = await fetch(`${apiUrl}/companies/by-slug/${slug}`, {
      next: { revalidate: 60 }, // Revalidate every minute for SSG
    });
    if (res.ok) {
      return await res.json();
    }

    // Fallback: if slug is a number, try by ID
    const id = parseInt(slug, 10);
    if (!isNaN(id)) {
      const resById = await fetch(`${apiUrl}/companies/${id}`, {
        next: { revalidate: 60 },
      });
      if (resById.ok) {
        return await resById.json();
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await getCompany(params.slug);
  if (!company) {
    return {
      title: "Firma nie znaleziona | PolacySzwajcaria",
    };
  }

  const categoryName = company.category || "Usługi";
  const location = [company.city, company.canton].filter(Boolean).join(", ") || "Szwajcaria";
  const title = `${company.name} – ${categoryName}, ${location} | PolacySzwajcaria`;
  const description = company.short_description || company.description || `Polska firma ${company.name} w Szwajcarii. ${categoryName}. ${location}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://polacyszwajcaria.com/uslugi/firma/${params.slug}`,
      images: company.img ? [{ url: company.img }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: company.img ? [company.img] : [],
    },
    alternates: {
      canonical: `https://polacyszwajcaria.com/uslugi/firma/${params.slug}`,
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const company = await getCompany(params.slug);

  if (!company) {
    notFound();
  }

  return <CompanyPageClient company={company} slug={params.slug} />;
}

