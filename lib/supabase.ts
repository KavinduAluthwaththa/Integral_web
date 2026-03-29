import { createClient } from '@supabase/supabase-js';
export { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  color: string;
  is_featured: boolean;
  is_hidden: boolean;
  is_limited_edition: boolean;
  images: string[];
  size_chart_images: string[];
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  stock: number;
  created_at: string;
  updated_at: string;
};

export type ProductWithVariants = Product & {
  product_variants: ProductVariant[];
};
