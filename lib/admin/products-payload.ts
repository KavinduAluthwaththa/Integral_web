export interface ProductVariantInput {
  id?: string;
  size: string;
  stock: number;
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  color: string;
  is_featured: boolean;
  images: string[];
  variants: ProductVariantInput[];
}

export function normalizeProductPayload(body: any): ProductInput {
  return {
    sku: String(body?.sku || '').trim(),
    name: String(body?.name || '').trim(),
    description: String(body?.description || '').trim(),
    price: Number(body?.price || 0),
    category: String(body?.category || '').trim(),
    color: String(body?.color || '').trim(),
    is_featured: Boolean(body?.is_featured),
    images: Array.isArray(body?.images)
      ? body.images.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [],
    variants: Array.isArray(body?.variants)
      ? body.variants.map((variant: any) => ({
          id: variant?.id ? String(variant.id) : undefined,
          size: String(variant?.size || '').trim(),
          stock: Number(variant?.stock || 0),
        }))
      : [],
  };
}

export function validateProductPayload(payload: ProductInput): string | null {
  if (!payload.sku || !payload.name || !payload.category || !payload.color) {
    return 'SKU, name, category, and color are required';
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    return 'Price must be a valid non-negative number';
  }

  if (payload.variants.length === 0) {
    return 'At least one product variant is required';
  }

  const seenSizes = new Set<string>();
  for (const variant of payload.variants) {
    if (!variant.size) {
      return 'Each variant must include a size';
    }

    if (!Number.isInteger(variant.stock) || variant.stock < 0) {
      return 'Variant stock must be a non-negative integer';
    }

    const normalizedSize = variant.size.toLowerCase();
    if (seenSizes.has(normalizedSize)) {
      return 'Variant sizes must be unique per product';
    }
    seenSizes.add(normalizedSize);
  }

  return null;
}
