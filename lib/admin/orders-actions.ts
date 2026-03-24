export interface OrderActionInput {
  status: string;
  cancellationNote?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}

export interface ExistingOrderState {
  status: string;
  fulfilled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export const allowedOrderStatuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

export function buildOrderUpdatePatch(
  existing: ExistingOrderState,
  input: OrderActionInput,
  nowIso: string = new Date().toISOString()
): Record<string, unknown> {
  const nextStatus = String(input.status || '').trim();
  if (!allowedOrderStatuses.has(nextStatus)) {
    throw new Error('Invalid order status');
  }

  const patch: Record<string, unknown> = {
    status: nextStatus,
  };

  if (typeof input.trackingNumber !== 'undefined') {
    const value = input.trackingNumber.trim();
    patch.tracking_number = value || null;
  }

  if (typeof input.shippingCarrier !== 'undefined') {
    const value = input.shippingCarrier.trim();
    patch.shipping_carrier = value || null;
  }

  const statusChanged = existing.status !== nextStatus;
  const cancellationNote = (input.cancellationNote || '').trim();

  if (statusChanged && nextStatus === 'processing' && !existing.fulfilled_at) {
    patch.fulfilled_at = nowIso;
  }

  if (statusChanged && nextStatus === 'shipped') {
    if (!existing.fulfilled_at) {
      patch.fulfilled_at = nowIso;
    }
    if (!existing.shipped_at) {
      patch.shipped_at = nowIso;
    }
  }

  if (statusChanged && nextStatus === 'delivered') {
    if (!existing.fulfilled_at) {
      patch.fulfilled_at = nowIso;
    }
    if (!existing.shipped_at) {
      patch.shipped_at = nowIso;
    }
    if (!existing.delivered_at) {
      patch.delivered_at = nowIso;
    }
  }

  if (nextStatus === 'cancelled') {
    if (!cancellationNote) {
      throw new Error('Cancellation note is required when cancelling an order');
    }

    patch.cancellation_note = cancellationNote;

    if (!existing.cancelled_at) {
      patch.cancelled_at = nowIso;
    }
  } else if (statusChanged && cancellationNote) {
    // Preserve optional audit note updates when not cancelled.
    patch.cancellation_note = cancellationNote;
  }

  return patch;
}
