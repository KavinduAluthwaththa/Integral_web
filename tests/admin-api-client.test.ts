import { describe, expect, it, vi, afterEach } from 'vitest';
import { createAdminApiClient } from '@/lib/admin/api-client';

describe('createAdminApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches bearer authorization and json content type', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    const apiRequest = createAdminApiClient('token-123');
    await apiRequest('/api/admin/products', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/products',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('throws the api error payload when the request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Nope' }),
    } as Response);

    const apiRequest = createAdminApiClient('token-123');

    await expect(apiRequest('/api/admin/products')).rejects.toThrow('Nope');
  });
});