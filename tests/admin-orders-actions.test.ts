import { describe, expect, it } from 'vitest';
import { buildOrderUpdatePatch } from '../lib/admin/orders-actions';

describe('admin order actions', () => {
  it('adds fulfillment and shipment timestamps when moving to shipped', () => {
    const now = '2026-03-12T10:00:00.000Z';
    const patch = buildOrderUpdatePatch(
      {
        status: 'pending',
        fulfilled_at: null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: null,
      },
      {
        status: 'shipped',
        shippingCarrier: 'UPS',
        trackingNumber: '1Z123',
      },
      now
    );

    expect(patch).toMatchObject({
      status: 'shipped',
      shipping_carrier: 'UPS',
      tracking_number: '1Z123',
      fulfilled_at: now,
      shipped_at: now,
    });
  });

  it('requires cancellation note when cancelling', () => {
    expect(() =>
      buildOrderUpdatePatch(
        {
          status: 'processing',
          fulfilled_at: null,
          shipped_at: null,
          delivered_at: null,
          cancelled_at: null,
        },
        {
          status: 'cancelled',
          cancellationNote: '',
        }
      )
    ).toThrow('Cancellation note is required when cancelling an order');
  });

  it('sets cancelled timestamp and note', () => {
    const now = '2026-03-12T11:00:00.000Z';
    const patch = buildOrderUpdatePatch(
      {
        status: 'processing',
        fulfilled_at: null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: null,
      },
      {
        status: 'cancelled',
        cancellationNote: 'Customer requested cancellation before shipment',
      },
      now
    );

    expect(patch).toMatchObject({
      status: 'cancelled',
      cancellation_note: 'Customer requested cancellation before shipment',
      cancelled_at: now,
    });
  });
});
