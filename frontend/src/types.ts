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
