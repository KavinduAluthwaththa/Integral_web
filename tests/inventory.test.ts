import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

import * as inventory from '@/lib/inventory';

describe('inventory service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('gets available stock from rpc', async () => {
    rpcMock.mockResolvedValue({ data: 9, error: null });

    await expect(inventory.getAvailableStock('variant-1')).resolves.toBe(9);
    expect(rpcMock).toHaveBeenCalledWith('get_available_stock', {
      p_variant_id: 'variant-1',
    });
  });

  it('returns zero available stock when rpc errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'db fail' } });

    await expect(inventory.getAvailableStock('variant-2')).resolves.toBe(0);
  });

  it('maps stock info for low stock and out of stock states', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: 3, error: null })
      .mockResolvedValueOnce({ data: 0, error: null });

    await expect(inventory.getStockInfo('variant-3')).resolves.toEqual({
      available: 3,
      isLowStock: true,
      isOutOfStock: false,
    });

    await expect(inventory.getStockInfo('variant-4')).resolves.toEqual({
      available: 0,
      isLowStock: false,
      isOutOfStock: true,
    });
  });

  it('returns reserve stock rpc data as boolean', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    await expect(inventory.reserveStock('variant-1', 2, 'session-1')).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('reserve_stock', {
      p_variant_id: 'variant-1',
      p_quantity: 2,
      p_session_id: 'session-1',
    });
  });

  it('returns false when reserve stock rpc errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'reserve fail' } });

    await expect(inventory.reserveStock('variant-1', 2, 'session-1')).resolves.toBe(false);
  });

  it('checks cart stock availability and returns fallback empty list on error', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: [{ variant_id: 'v1', requested: 2, available: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await expect(
      inventory.checkCartStockAvailability([{ variant_id: 'v1', quantity: 2 }])
    ).resolves.toEqual([{ variant_id: 'v1', requested: 2, available: 1 }]);

    await expect(
      inventory.checkCartStockAvailability([{ variant_id: 'v1', quantity: 2 }])
    ).resolves.toEqual([]);
  });

  it('processes order stock and returns false on failure', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await expect(inventory.processOrderStock('order-1', 'session-1')).resolves.toBe(true);
    await expect(inventory.processOrderStock('order-1', 'session-1')).resolves.toBe(false);
  });

  it('updates stock with optional values and handles rpc errors', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await expect(
      inventory.updateStock('variant-1', -1, 'sale', 'order-1', 'checkout')
    ).resolves.toBe(true);

    expect(rpcMock).toHaveBeenCalledWith('update_stock', {
      p_variant_id: 'variant-1',
      p_quantity_change: -1,
      p_change_type: 'sale',
      p_order_id: 'order-1',
      p_reason: 'checkout',
    });

    await expect(inventory.updateStock('variant-2', 4, 'restock')).resolves.toBe(false);
  });

  it('releases reservation by session id', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await inventory.releaseReservation('session-22');

    expect(rpcMock).toHaveBeenCalledWith('release_reservation', {
      p_session_id: 'session-22',
    });
  });
});
