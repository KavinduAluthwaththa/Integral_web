'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from 'lucide-react';
import {
  createReturnRequest,
  getUserOrdersForReturn,
  RefundMethod,
  ReturnableOrder,
} from '@/lib/returns-service';

interface SelectedReturnItemState {
  selected: boolean;
  quantity: number;
  condition: string;
}

interface ReturnRequestFormProps {
  onSuccess?: () => void;
}

export function ReturnRequestForm({ onSuccess }: ReturnRequestFormProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original_payment');
  const [orders, setOrders] = useState<ReturnableOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedReturnItemState>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      setLoadingOrders(true);
      const data = await getUserOrdersForReturn();
      setOrders(data);
      if (data.length > 0) {
        setSelectedOrderId(data[0].id);
      }
      setLoadingOrders(false);
    };

    void loadOrders();
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedItems({});
      return;
    }

    const initialItems: Record<string, SelectedReturnItemState> = {};
    selectedOrder.order_items.forEach((item) => {
      initialItems[item.id] = {
        selected: false,
        quantity: 1,
        condition: 'new',
      };
    });

    setSelectedItems(initialItems);
  }, [selectedOrder]);

  const totalRefundAmount = useMemo(() => {
    if (!selectedOrder) return 0;

    return selectedOrder.order_items.reduce((sum, orderItem) => {
      const state = selectedItems[orderItem.id];
      if (!state?.selected) return sum;
      return sum + Number(orderItem.price || 0) * state.quantity;
    }, 0);
  }, [selectedItems, selectedOrder]);

  const hasSelectedItems = useMemo(
    () => Object.values(selectedItems).some((item) => item.selected),
    [selectedItems]
  );

  const updateSelectedItem = (orderItemId: string, patch: Partial<SelectedReturnItemState>) => {
    setSelectedItems((current) => ({
      ...current,
      [orderItemId]: {
        ...(current[orderItemId] || { selected: false, quantity: 1, condition: 'new' }),
        ...patch,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrder) {
      setStatus('error');
      setMessage('Select an order to continue.');
      return;
    }

    if (!reason.trim()) {
      setStatus('error');
      setMessage('Please select a return reason.');
      return;
    }

    if (!hasSelectedItems) {
      setStatus('error');
      setMessage('Select at least one item from your order to return.');
      return;
    }

    setSubmitting(true);
    setStatus('idle');
    setMessage('');

    const items = selectedOrder.order_items
      .filter((item) => selectedItems[item.id]?.selected)
      .map((item) => ({
        orderItemId: item.id,
        quantity: selectedItems[item.id].quantity,
        condition: selectedItems[item.id].condition,
      }));

    const result = await createReturnRequest({
      orderId: selectedOrder.id,
      reason,
      description: description.trim() || undefined,
      refundMethod,
      items,
    });

    if (!result.success) {
      setStatus('error');
      setMessage(result.error || 'Failed to create return request.');
      setSubmitting(false);
      return;
    }

    setStatus('success');
    setMessage(`Return request ${result.returnRequest?.return_number || ''} created successfully.`);

    setReason('');
    setDescription('');
    setRefundMethod('original_payment');

    if (selectedOrder) {
      const resetItems: Record<string, SelectedReturnItemState> = {};
      selectedOrder.order_items.forEach((item) => {
        resetItems[item.id] = {
          selected: false,
          quantity: 1,
          condition: 'new',
        };
      });
      setSelectedItems(resetItems);
    }

    setSubmitting(false);

    if (onSuccess) {
      setTimeout(() => onSuccess(), 1200);
    }
  };

  if (loadingOrders) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading your eligible orders...
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No delivered or shipped orders are currently eligible for returns.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Return</CardTitle>
        <CardDescription>Select an order and the items you want to return.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="order">Order *</Label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger id="order">
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - ${order.total.toFixed(2)} - {new Date(order.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Return Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wrong_size">Wrong Size</SelectItem>
                <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                <SelectItem value="damaged">Damaged or Defective</SelectItem>
                <SelectItem value="not_as_described">Not as Described</SelectItem>
                <SelectItem value="quality_issues">Quality Issues</SelectItem>
                <SelectItem value="changed_mind">Changed Mind</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refundMethod">Refund Method *</Label>
            <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as RefundMethod)}>
              <SelectTrigger id="refundMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original_payment">Original Payment Method</SelectItem>
                <SelectItem value="store_credit">Store Credit</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context for the return request..."
              rows={3}
            />
          </div>

          {selectedOrder && (
            <div className="space-y-3">
              <Label>Order Items *</Label>
              <div className="space-y-3">
                {selectedOrder.order_items.map((item) => {
                  const state = selectedItems[item.id] || { selected: false, quantity: 1, condition: 'new' };

                  return (
                    <div key={item.id} className="border border-foreground/10 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={state.selected}
                            onChange={(e) => updateSelectedItem(item.id, { selected: e.target.checked })}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-medium">{item.products?.name || 'Unknown product'}</span>
                            <span className="block text-muted-foreground text-xs">
                              {item.products?.sku || 'SKU unavailable'} / Size {item.product_variants?.size || 'N/A'}
                            </span>
                          </span>
                        </label>
                        <span className="text-sm text-muted-foreground">
                          ${Number(item.price || 0).toFixed(2)} each
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`qty-${item.id}`}>Quantity to Return</Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min={1}
                            max={item.quantity}
                            disabled={!state.selected}
                            value={state.quantity}
                            onChange={(e) => {
                              const parsed = Number.parseInt(e.target.value, 10) || 1;
                              const bounded = Math.min(Math.max(parsed, 1), item.quantity);
                              updateSelectedItem(item.id, { quantity: bounded });
                            }}
                          />
                          <p className="text-xs text-muted-foreground">Purchased qty: {item.quantity}</p>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`condition-${item.id}`}>Condition</Label>
                          <Select
                            value={state.condition}
                            onValueChange={(value) => updateSelectedItem(item.id, { condition: value })}
                            disabled={!state.selected}
                          >
                            <SelectTrigger id={`condition-${item.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New/Unused</SelectItem>
                              <SelectItem value="used">Gently Used</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <span className="font-medium">Estimated Refund</span>
            <span className="text-lg font-semibold">${totalRefundAmount.toFixed(2)}</span>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Return Request'}
          </Button>

          {status === 'success' && (
            <div className="flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3 text-green-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
