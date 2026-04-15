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

  const ogImage = company.img
    ? (company.img.startsWith("/images/") ? `https://katalog-firm.ch${company.img}` : company.img)
    : "https://katalog-firm.ch/logo.png";

  return {
    title,
    description,
    keywords: [company.name, categoryName, location, "polskie usługi", "Szwajcaria"],
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://katalog-firm.ch/firma/${params.slug}`,
      siteName: "Polskie Usługi w Szwajcarii",
      locale: "pl_PL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: company.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://katalog-firm.ch/firma/${params.slug}`,
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const company = await getCompany(params.slug);

  if (!company) {
    notFound();
  }

  const location = [company.city, company.canton].filter(Boolean).join(", ");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    description: company.short_description || company.description?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
    url: company.website || `https://katalog-firm.ch/firma/${params.slug}`,
    ...(company.img ? { image: company.img.startsWith("/images/") ? `https://katalog-firm.ch${company.img}` : company.img } : {}),
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.email ? { email: company.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(company.address ? { streetAddress: company.address } : {}),
      ...(company.city ? { addressLocality: company.city } : {}),
      ...(company.canton ? { addressRegion: company.canton } : {}),
      ...(company.postal_code && company.postal_code.trim() ? { postalCode: company.postal_code } : {}),
      addressCountry: "CH",
    },
    ...(company.latitude && company.longitude ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: company.latitude,
        longitude: company.longitude,
      },
    } : {}),
    ...(company.rating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: company.rating,
        bestRating: 5,
      },
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CompanyPageClient company={company} slug={params.slug} />
    </>
  );
}

