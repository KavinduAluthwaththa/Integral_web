import { describe, expect, it } from 'vitest';
import { normalizeProductPayload, validateProductPayload } from '../lib/admin/products-payload';

describe('admin products payload', () => {
  it('normalizes whitespace and casts numeric fields', () => {
    const payload = normalizeProductPayload({
      sku: '  SKU-1 ',
      name: ' Tee ',
      description: '  Desc ',
      price: '39.99',
      category: ' Tops ',
      color: ' Black ',
      is_featured: true,
      images: [' https://a.test/image.png '],
      variants: [{ size: ' M ', stock: '3' }],
    });

    expect(payload).toEqual({
      sku: 'SKU-1',
      name: 'Tee',
      description: 'Desc',
      price: 39.99,
      category: 'Tops',
      color: 'Black',
      is_featured: true,
      images: ['https://a.test/image.png'],
      variants: [{ id: undefined, size: 'M', stock: 3 }],
    });
  });

  it('rejects duplicate variant sizes', () => {
    const error = validateProductPayload({
      sku: 'SKU-2',
      name: 'Hoodie',
      description: '',
      price: 80,
      category: 'Hoodies',
      color: 'Gray',
      is_featured: false,
      images: [],
      variants: [
        { size: 'M', stock: 2 },
        { size: 'm', stock: 4 },
      ],
    });

    expect(error).toBe('Variant sizes must be unique per product');
  });

  it('accepts a valid payload', () => {
    const error = validateProductPayload({
      sku: 'SKU-3',
      name: 'Jacket',
      description: 'Warm jacket',
      price: 120,
      category: 'Outerwear',
      color: 'Navy',
      is_featured: false,
      images: ['https://a.test/1.png'],
      variants: [
        { size: 'S', stock: 5 },
        { size: 'M', stock: 4 },
      ],
    });

    expect(error).toBeNull();
  });
});
