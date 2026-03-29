export interface OrderItemRecord {
  id: string;
  quantity: number;
  price: number;
  products: {
    id: string;
    name: string;
    sku: string;
  } | null;
  product_variants: {
    id: string;
    size: string;
  } | null;
}

export interface ShippingAddressRecord {
  full_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  status: string;
  payment_id: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  created_at: string;
  cancellation_note: string | null;
  fulfilled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_addresses: ShippingAddressRecord[];
  order_items: OrderItemRecord[];
}

export interface OrderDraft {
  status: string;
  cancellationNote: string;
  trackingNumber: string;
  shippingCarrier: string;
}

export interface ProductVariant {
  id?: string;
  size: string;
  stock: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: string;
  color: string;
  is_featured: boolean;
  is_hidden: boolean;
  is_limited_edition: boolean;
  images: string[];
  size_chart_images: string[];
  created_at: string;
  product_variants: ProductVariant[];
}

export interface ProductFormState {
  sku: string;
  name: string;
  description: string;
  price: string;
  category: string;
  color: string;
  is_featured: boolean;
  is_hidden: boolean;
  is_limited_edition: boolean;
  images: string;
  size_chart_images: string;
  variants: ProductVariant[];
}