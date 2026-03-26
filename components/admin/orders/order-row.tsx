import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderDraft, OrderRecord } from '@/lib/admin/page-types';

interface OrderRowProps {
  order: OrderRecord;
  draft: OrderDraft;
  allowedStatuses: string[];
  updatingOrderId: string | null;
  onUpdateDraft: (orderId: string, patch: Partial<OrderDraft>) => void;
  onSave: (orderId: string, status: string) => void;
}

export function OrderRow({
  order,
  draft,
  allowedStatuses,
  updatingOrderId,
  onUpdateDraft,
  onSave,
}: OrderRowProps) {
  const shipping = order.shipping_addresses?.[0];

  return (
    <div className="space-y-4 px-lg py-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-light tracking-wide">{order.order_number}</h3>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {shipping ? `${shipping.full_name} • ${shipping.email}` : 'No shipping address attached'}
          </p>
          <p className="text-sm font-light tracking-wide text-muted-foreground">
            Total ${order.total.toFixed(2)} • Subtotal ${order.subtotal.toFixed(2)} • Tax ${order.tax.toFixed(2)} • Shipping ${order.shipping_cost.toFixed(2)}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Payment ID: {order.payment_id || 'Not available'}
          </p>
          <p className="text-xs text-muted-foreground">
            Fulfilled: {order.fulfilled_at ? new Date(order.fulfilled_at).toLocaleString() : '-'} • Shipped: {order.shipped_at ? new Date(order.shipped_at).toLocaleString() : '-'} • Delivered: {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '-'}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select
            value={draft.status}
            onValueChange={(value) => onUpdateDraft(order.id, { status: value })}
            disabled={updatingOrderId === order.id}
          >
            <SelectTrigger className="h-10 w-full rounded-none border-2 border-foreground/40 bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[180px]">
              <SelectValue placeholder="Status" className="uppercase tracking-[0.12em]" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-foreground/40 bg-background text-foreground">
              {allowedStatuses.map((status) => (
                <SelectItem key={status} value={status} className="rounded-none focus:bg-foreground focus:text-background uppercase tracking-[0.12em]">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => onSave(order.id, draft.status)}
            disabled={updatingOrderId === order.id}
            className="inline-flex h-10 w-full items-center justify-center border-2 border-foreground/40 px-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {updatingOrderId === order.id ? 'Saving...' : 'Save Actions'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carrier</p>
          <Input
            value={draft.shippingCarrier}
            onChange={(event) => onUpdateDraft(order.id, { shippingCarrier: event.target.value })}
            placeholder="UPS, FedEx, DHL..."
            disabled={updatingOrderId === order.id}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tracking Number</p>
          <Input
            value={draft.trackingNumber}
            onChange={(event) => onUpdateDraft(order.id, { trackingNumber: event.target.value })}
            placeholder="Shipment tracking"
            disabled={updatingOrderId === order.id}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cancellation Note</p>
          <Textarea
            value={draft.cancellationNote}
            onChange={(event) => onUpdateDraft(order.id, { cancellationNote: event.target.value })}
            placeholder="Required for cancelled status"
            rows={2}
            disabled={updatingOrderId === order.id}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Items</p>
          <div className="space-y-2 border-2 border-foreground/40 p-md">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p>{item.products?.name || 'Unknown product'}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.products?.sku || 'No SKU'} • {item.product_variants?.size || 'No size'}
                  </p>
                </div>
                <div className="text-left text-muted-foreground sm:text-right">
                  {item.quantity} × ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shipping</p>
          <div className="border-2 border-foreground/40 p-md text-sm text-muted-foreground">
            {shipping ? (
              <>
                <p className="text-foreground">{shipping.full_name}</p>
                <p>{shipping.email}</p>
                <p>{shipping.phone}</p>
                <p>{shipping.address_line1}</p>
                {shipping.address_line2 && <p>{shipping.address_line2}</p>}
                <p>{shipping.city}, {shipping.state} {shipping.postal_code}</p>
                <p>{shipping.country}</p>
              </>
            ) : (
              <p>No shipping details available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}