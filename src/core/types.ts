export type User = {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  phone?: string | null;
  phone_verified?: boolean;
  account_verified?: boolean;
  account_type: "individual" | "company";
  is_carrier?: boolean;
  company: null | { workspace_id: number; role: string; status: string };
};
export type Listing = {
  id: number;
  slug: string;
  title: string;
  type: string;
  category: string | null;
  country: string | null;
  city: string | null;
  price: string | null;
  currency: string;
  description?: string;
  reviewed: boolean;
  media: { type: string; url: string }[];
  commercial_details?: Record<string, unknown>;
  vessel?: Record<string, unknown> | null;
};
export type OwnListing = {
  id: number;
  slug: string;
  title: string;
  description: string;
  notes: string | null;
  marketplace_state: string;
  is_public: boolean;
  revision: string;
  estimated_value: string | null;
  currency: string;
  category: string | null;
  opportunity_type: string;
};
export type Offer = {
  id: number;
  integrity: boolean;
  opportunity_id: number;
  sender_workspace_id: number;
  publisher_workspace_id: number;
  status: string;
  version: number;
  quantity: string;
  unit: string;
  unit_price: string;
  base_amount: string;
  currency: string;
  valid_until: string;
  tax_basis: string;
  delivery_days: number;
  payment_terms: string;
  notes: string | null;
  snapshot: { title: string; sender: string; publisher: string };
  attachments: { index: number; size: number; download_path: string }[];
};
export type Message = {
  id: number;
  body: string;
  author_name: string;
  mine: boolean;
  created_at: string;
};
export type Feed = {
  data: Message[];
  meta: { has_more: boolean; first_id: number | null; last_id: number | null };
  room: {
    writable: boolean;
    own_read_up_to: number;
    other_read_up_to: number;
    unread: number;
  };
};
export type Notice = {
  id: string;
  type: string;
  title: string;
  offer_id: number | null;
  opportunity_id: number | null;
  read_at: string | null;
  created_at: string;
};
export type Page<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    unread?: number;
  };
};
export type Catalog = {
  types: string[];
  categories: string[];
  subcategories: Record<string, string[]>;
  currencies: string[];
  units: string[];
  languages: string[];
};
export type Workspace = {
  id: number;
  status: string;
  free_launch: boolean;
  plan: {
    code: string;
    name_ar: string;
    name_en: string;
    seats: number;
    active_opportunities: number;
    monthly_applications: number;
  };
};
