'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Trash2 } from 'lucide-react';
import { createReturnRequest, RefundMethod } from '@/lib/returns-service';

interface ReturnItem {
  productSku: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
  refundAmount: number;
  condition: string;
}

interface ReturnRequestFormProps {
  orderId: string;
  orderNumber: string;
  onSuccess?: () => void;
}

export function ReturnRequestForm({ orderId, orderNumber, onSuccess }: ReturnRequestFormProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original_payment');
  const [items, setItems] = useState<ReturnItem[]>([{
    productSku: '',
    productName: '',
    size: '',
    quantity: 1,
    price: 0,
    refundAmount: 0,
    condition: 'new',
  }]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const addItem = () => {
    setItems([...items, {
      productSku: '',
      productName: '',
      size: '',
      quantity: 1,
      price: 0,
      refundAmount: 0,
      condition: 'new',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'price') {
      newItems[index].refundAmount = newItems[index].quantity * newItems[index].price;
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setStatus('error');
      setMessage('Please select a return reason');
      return;
    }

    const hasEmptyItem = items.some(item =>
      !item.productSku || !item.productName || !item.size || item.price <= 0
    );

    if (hasEmptyItem) {
      setStatus('error');
      setMessage('Please fill in all item details');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await createReturnRequest({
        orderId,
        reason,
        description: description.trim() || undefined,
        refundMethod,
        items: items.map(item => ({
          productSku: item.productSku,
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          refundAmount: item.refundAmount,
          condition: item.condition,
        })),
      });

      if (result.success) {
        setStatus('success');
        setMessage(`Return request ${result.returnRequest?.return_number} created successfully!`);

        setReason('');
        setDescription('');
        setRefundMethod('original_payment');
        setItems([{
          productSku: '',
          productName: '',
          size: '',
          quantity: 1,
          price: 0,
          refundAmount: 0,
          condition: 'new',
        }]);

        if (onSuccess) {
          setTimeout(() => onSuccess(), 2000);
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to create return request');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totalRefund = items.reduce((sum, item) => sum + item.refundAmount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Return</CardTitle>
        <CardDescription>Order #{orderNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reason">Return Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
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
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional information about your return..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refundMethod">Refund Method *</Label>
            <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as RefundMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original_payment">Original Payment Method</SelectItem>
                <SelectItem value="store_credit">Store Credit</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items to Return *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`sku-${index}`}>Product SKU</Label>
                          <Input
                            id={`sku-${index}`}
                            value={item.productSku}
                            onChange={(e) => updateItem(index, 'productSku', e.target.value)}
                            placeholder="e.g., TSH-001"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`name-${index}`}>Product Name</Label>
                          <Input
                            id={`name-${index}`}
                            value={item.productName}
                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                            placeholder="e.g., Classic White T-Shirt"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`size-${index}`}>Size</Label>
                          <Input
                            id={`size-${index}`}
                            value={item.size}
                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                            placeholder="e.g., M"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`price-${index}`}>Price per Item</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`condition-${index}`}>Condition</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) => updateItem(index, 'condition', value)}
                          >
                            <SelectTrigger>
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

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Refund Amount: <span className="font-medium text-foreground">${item.refundAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Total Refund Amount:</span>
            <span className="text-lg font-semibold">${totalRefund.toFixed(2)}</span>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Return Request'}
          </Button>

          {status === 'success' && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{message}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
