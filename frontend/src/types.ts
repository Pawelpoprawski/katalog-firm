/** POWIĄZANIA
 * Cel: typy TypeScript (Company, Category, Review, Report).
 * Przy zmianie: zgodne z backend/schemas.py.
 * AUTO używany przez: frontend/src/app/admin/components/AdminCategories.tsx, frontend/src/app/admin/components/AdminCompanies.tsx, frontend/src/app/admin/page.tsx, frontend/src/app/categories/[slug]/page.tsx, frontend/src/app/companies/[slug]/page.tsx, frontend/src/app/dodaj/page.tsx, frontend/src/app/edycja/[token]/page.tsx, frontend/src/app/firma/[slug]/CompanyPageClient.tsx (+6, pełna lista: POWIAZANIA.md)
 */
export type Company = {
  id: number;
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  offer?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  address?: string;
  city: string;
  canton: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  tags?: string;
  is_verified: boolean;
  is_active: boolean;
  owner_id: number;
  category_id?: number;
  category?: string;
  rating?: number;
  rating_count?: number;
  img?: string;
  photos?: string[];
  is_promoted?: boolean;
  status?: string;
  created_at?: number;
  updated_at?: number;
  views?: number;
  clicks?: number;
  edit_token?: string;
  last_confirmed_at?: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type Review = {
  id: number;
  author_id: number;
  company_id: number;
  rating: number;
  comment?: string;
  created_at?: number;
};

export type Report = {
  id: number;
  review_id: number;
  reason: string;
  created_at: number;
};
