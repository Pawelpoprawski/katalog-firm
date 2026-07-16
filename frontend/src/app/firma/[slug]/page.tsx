import { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyPageClient from "./CompanyPageClient";
import { SITE_URL } from "@/lib/siteUrl";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const revalidate = 300;

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

  const categoryName = company.category || "usługi";
  const city = company.city || "";
  const canton = company.canton || "";
  const location = [city, canton].filter(Boolean).join(", ") || "Szwajcaria";
  const title = `${company.name} — ${categoryName}${city ? `, ${city}` : ""}`;

  // Description — strip HTML, prefer short, fallback build w polskim
  const rawDescription = company.short_description ||
    (company.description ? company.description.replace(/<[^>]+>/g, "").trim() : "");
  const description = rawDescription
    ? rawDescription.slice(0, 200) + (rawDescription.length > 200 ? "..." : "")
    : `${company.name} — polska firma polonijna w Szwajcarii (${categoryName}, ${location}). Kontakt, opinie i lokalizacja na Katalog Firm.`;

  // Per-firma keywords (long-tail SEO)
  const keywords = [
    company.name,
    `${company.name} ${city}`.trim(),
    `${categoryName} ${city}`.trim(),
    `${categoryName} po polsku ${city}`.trim(),
    `polski ${categoryName} Szwajcaria`,
    `polska firma ${city}`.trim(),
    "polska firma w Szwajcarii",
    "firmy polonijne",
    location,
  ].filter((k) => k && k.length > 1);

  // OG image: prefer company's own image, fallback to brand OG (1200x630)
  const ogImage = company.img
    ? (company.img.startsWith("/images/") ? `${SITE_URL}/api${company.img}` : company.img)
    : `${SITE_URL}/og.png`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: `${company.name} | Katalog Firm Polonijnych`,
      description,
      type: "website",
      url: `${SITE_URL}/firma/${params.slug}`,
      siteName: "Katalog Firm Polonijnych w Szwajcarii",
      locale: "pl_PL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${company.name} — ${categoryName} w ${location}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${company.name} | Katalog Firm`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${SITE_URL}/firma/${params.slug}`,
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const company = await getCompany(params.slug);

  if (!company) {
    notFound();
  }

  const location = [company.city, company.canton].filter(Boolean).join(", ");
  const categorySlug = (company.category_slug || "").toString();
  const breadcrumbItems: Array<{ name: string; item: string }> = [
    { name: "Strona główna", item: SITE_URL },
  ];
  if (company.category && categorySlug) {
    breadcrumbItems.push({
      name: company.category,
      item: `${SITE_URL}/kategoria/${categorySlug}`,
    });
  }
  breadcrumbItems.push({
    name: company.name,
    item: `${SITE_URL}/firma/${params.slug}`,
  });
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    description: company.short_description || company.description?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
    url: company.website || `${SITE_URL}/firma/${params.slug}`,
    ...(company.img ? { image: company.img.startsWith("/images/") ? `${SITE_URL}/api${company.img}` : company.img } : {}),
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
    ...(company.rating && company.rating_count ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: company.rating,
        ratingCount: company.rating_count,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <CompanyPageClient company={company} slug={params.slug} />
    </>
  );
}

