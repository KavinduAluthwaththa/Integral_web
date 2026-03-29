import { z } from 'zod';

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
  is_hidden: boolean;
  is_limited_edition: boolean;
  images: string[];
  size_chart_images: string[];
  variants: ProductVariantInput[];
}

const variantSchema = z.object({
  id: z.string().trim().max(64).optional(),
  size: z.string().trim().min(1, 'Variant size is required').max(50),
  stock: z.number().int().min(0, 'Variant stock must be a non-negative integer'),
});

const productSchema = z
  .object({
    sku: z.string().trim().min(1, 'SKU is required').max(64),
    name: z.string().trim().min(1, 'Name is required').max(120),
    description: z.string().trim().max(4000).optional().default(''),
    price: z
      .number({ invalid_type_error: 'Price must be a number' })
      .min(0, 'Price must be non-negative')
      .max(1_000_000, 'Price is too large'),
    category: z.string().trim().min(1, 'Category is required').max(64),
    color: z.string().trim().min(1, 'Color is required').max(64),
    is_featured: z.boolean(),
    is_hidden: z.boolean(),
    is_limited_edition: z.boolean(),
    images: z
      .array(z.string().trim().min(1))
      .max(20, 'Too many product images (max 20)')
      .default([]),
    size_chart_images: z
      .array(z.string().trim().min(1))
      .max(10, 'Too many size chart images (max 10)')
      .default([]),
    variants: z
      .array(variantSchema)
      .min(1, 'At least one product variant is required')
      .max(50, 'Too many variants (max 50)'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const variant of value.variants) {
      const key = variant.size.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Variant sizes must be unique per product',
          path: ['variants'],
        });
        break;
      }
      seen.add(key);
    }
  });

export function normalizeProductPayload(body: any): ProductInput {
  return {
    sku: String(body?.sku || '').trim(),
    name: String(body?.name || '').trim(),
    description: String(body?.description || '').trim(),
    price: Number(body?.price || 0),
    category: String(body?.category || '').trim(),
    color: String(body?.color || '').trim(),
    is_featured: Boolean(body?.is_featured),
    is_hidden: Boolean(body?.is_hidden),
    is_limited_edition: Boolean(body?.is_limited_edition),
    images: Array.isArray(body?.images)
      ? body.images.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [],
    size_chart_images: Array.isArray(body?.size_chart_images)
      ? body.size_chart_images.map((value: unknown) => String(value).trim()).filter(Boolean)
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
  const result = productSchema.safeParse(payload);
  if (result.success) {
    return null;
  }

  const firstError = result.error.errors[0];
  return firstError?.message || 'Invalid product payload';
}
