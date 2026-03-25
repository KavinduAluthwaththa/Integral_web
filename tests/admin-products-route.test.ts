import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getAdminSupabaseClientMock, normalizeProductPayloadMock, validateProductPayloadMock } = vi.hoisted(() => ({
  getAdminSupabaseClientMock: vi.fn(),
  normalizeProductPayloadMock: vi.fn(),
  validateProductPayloadMock: vi.fn(),
}));

vi.mock('@/lib/server-admin-auth', () => ({
  getAdminSupabaseClient: getAdminSupabaseClientMock,
}));

vi.mock('@/lib/admin', () => ({
  normalizeProductPayload: normalizeProductPayloadMock,
  validateProductPayload: validateProductPayloadMock,
}));

import { GET, POST } from '@/app/api/admin/products/route';

function makeJsonRequest(method: 'GET' | 'POST', body?: unknown) {
  return new NextRequest('http://localhost/api/admin/products', {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('admin products api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth response when admin auth fails', async () => {
    getAdminSupabaseClientMock.mockResolvedValueOnce({
      response: NextResponse.json({ error: 'nope' }, { status: 401 }),
    });

    const response = await GET(makeJsonRequest('GET'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'nope' });
  });

  it('returns products for GET', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [{ id: 'p1', name: 'A' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: fromMock },
      userId: 'admin-1',
    });

    const response = await GET(makeJsonRequest('GET'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'p1', name: 'A' }] });
    expect(fromMock).toHaveBeenCalledWith('products');
  });

  it('returns 500 when GET query fails', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: vi.fn().mockReturnValue({ select: selectMock }) },
      userId: 'admin-1',
    });

    const response = await GET(makeJsonRequest('GET'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'db error' });
  });

  it('returns 400 when POST payload is invalid', async () => {
    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: vi.fn() },
      userId: 'admin-1',
    });

    normalizeProductPayloadMock.mockReturnValueOnce({ sku: '' });
    validateProductPayloadMock.mockReturnValueOnce('Invalid payload');

    const response = await POST(makeJsonRequest('POST', { sku: '' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid payload' });
  });

  it('rolls back product when variant insert fails', async () => {
    const payload = {
      sku: 'SKU-1',
      name: 'Jacket',
      description: 'Desc',
      price: 100,
      category: 'Outerwear',
      color: 'Black',
      is_featured: false,
      images: ['img'],
      variants: [{ size: 'M', stock: 4 }],
    };

    normalizeProductPayloadMock.mockReturnValueOnce(payload);
    validateProductPayloadMock.mockReturnValueOnce(null);

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    const productSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    const productSelectForInsertMock = vi.fn().mockReturnValue({ single: productSingleMock });
    const productInsertMock = vi.fn().mockReturnValue({ select: productSelectForInsertMock });

    const variantsInsertMock = vi.fn().mockResolvedValue({
      error: { message: 'variant error' },
    });

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          insert: productInsertMock,
          delete: deleteMock,
        };
      }

      if (table === 'product_variants') {
        return {
          insert: variantsInsertMock,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: fromMock },
      userId: 'admin-1',
    });

    const response = await POST(makeJsonRequest('POST', payload));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'variant error' });
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'p1');
  });

  it('creates product and variants successfully', async () => {
    const payload = {
      sku: 'SKU-1',
      name: 'Jacket',
      description: 'Desc',
      price: 100,
      category: 'Outerwear',
      color: 'Black',
      is_featured: true,
      images: ['img'],
      variants: [{ size: 'M', stock: 4 }],
    };

    normalizeProductPayloadMock.mockReturnValueOnce(payload);
    validateProductPayloadMock.mockReturnValueOnce(null);

    const createdProduct = {
      id: 'p1',
      ...payload,
      product_variants: [{ id: 'v1', size: 'M', stock: 4 }],
    };

    const productSingleAfterInsertMock = vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null });
    const productSelectAfterInsertMock = vi.fn().mockReturnValue({ single: productSingleAfterInsertMock });
    const productInsertMock = vi.fn().mockReturnValue({ select: productSelectAfterInsertMock });

    const productFinalSingleMock = vi.fn().mockResolvedValue({ data: createdProduct, error: null });
    const productFinalEqMock = vi.fn().mockReturnValue({ single: productFinalSingleMock });
    const productFinalSelectMock = vi.fn().mockReturnValue({ eq: productFinalEqMock });

    const variantsInsertMock = vi.fn().mockResolvedValue({ error: null });

    let productFromCount = 0;
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'products') {
        productFromCount += 1;
        if (productFromCount === 1) {
          return {
            insert: productInsertMock,
          };
        }

        return {
          select: productFinalSelectMock,
        };
      }

      if (table === 'product_variants') {
        return { insert: variantsInsertMock };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    getAdminSupabaseClientMock.mockResolvedValueOnce({
      client: { from: fromMock },
      userId: 'admin-1',
    });

    const response = await POST(makeJsonRequest('POST', payload));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: createdProduct });
    expect(variantsInsertMock).toHaveBeenCalledWith([
      { product_id: 'p1', size: 'M', stock: 4 },
    ]);
  });
});
