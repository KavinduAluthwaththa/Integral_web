import { supabase } from './supabase';
import { sendReturnConfirmationEmail } from './email-service';

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
export type RefundMethod = 'original_payment' | 'store_credit' | 'exchange';
export type TransactionType = 'refund' | 'store_credit' | 'exchange';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface ReturnRequest {
  id: string;
  user_id: string;
  order_id: string;
  return_number: string;
  status: ReturnStatus;
  reason: string;
  description?: string;
  refund_method: RefundMethod;
  refund_amount: number;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  requested_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id?: string;
  product_sku: string;
  product_name: string;
  size: string;
  quantity: number;
  price: number;
  refund_amount: number;
  condition?: string;
  created_at: string;
}

export interface RefundTransaction {
  id: string;
  return_request_id: string;
  transaction_type: TransactionType;
  amount: number;
  payment_method?: string;
  transaction_id?: string;
  status: TransactionStatus;
  processed_by?: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
}

export interface CreateReturnRequestParams {
  orderId: string;
  reason: string;
  description?: string;
  refundMethod: RefundMethod;
  items: Array<{
    orderItemId: string;
    quantity: number;
    condition?: string;
  }>;
}

export interface ReturnableOrderItem {
  id: string;
  quantity: number;
  price: number;
  products: {
    sku: string;
    name: string;
  } | null;
  product_variants: {
    size: string;
  } | null;
}

export interface ReturnableOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  order_items: ReturnableOrderItem[];
}

export async function createReturnRequest(params: CreateReturnRequestParams): Promise<{ success: boolean; returnRequest?: ReturnRequest; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  if (!params.items.length) {
    return { success: false, error: 'Select at least one order item to return' };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orderError || !order) {
    return { success: false, error: 'Order not found' };
  }

  if (order.status === 'pending' || order.status === 'cancelled') {
    return { success: false, error: 'This order is not eligible for returns yet' };
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      price,
      products (sku, name),
      product_variants (size)
    `)
    .eq('order_id', params.orderId);

  if (orderItemsError || !orderItems) {
    return { success: false, error: 'Unable to load order items for return validation' };
  }

  const orderItemById = new Map<string, any>(orderItems.map((item: any) => [item.id, item]));
  const seenOrderItemIds = new Set<string>();

  let normalizedItems: Array<{
    order_item_id: string;
    product_sku: string;
    product_name: string;
    size: string;
    quantity: number;
    price: number;
    refund_amount: number;
    condition: string | null;
  }> = [];

  try {
    normalizedItems = params.items.map((requestedItem) => {
      if (!requestedItem.orderItemId || seenOrderItemIds.has(requestedItem.orderItemId)) {
        throw new Error('Duplicate or invalid order item selection');
      }

      seenOrderItemIds.add(requestedItem.orderItemId);
      const orderItem = orderItemById.get(requestedItem.orderItemId);

      if (!orderItem) {
        throw new Error('One or more selected items do not belong to this order');
      }

      if (!Number.isInteger(requestedItem.quantity) || requestedItem.quantity <= 0) {
        throw new Error('Return quantity must be a positive whole number');
      }

      if (requestedItem.quantity > orderItem.quantity) {
        throw new Error('Return quantity cannot exceed purchased quantity');
      }

      const price = Number(orderItem.price || 0);
      const refundAmount = price * requestedItem.quantity;

      return {
        order_item_id: requestedItem.orderItemId,
        product_sku: orderItem.products?.sku || 'UNKNOWN',
        product_name: orderItem.products?.name || 'Unknown Product',
        size: orderItem.product_variants?.size || 'N/A',
        quantity: requestedItem.quantity,
        price,
        refund_amount: refundAmount,
        condition: requestedItem.condition || null,
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid return request items',
    };
  }

  const totalRefundAmount = normalizedItems.reduce((sum, item) => sum + item.refund_amount, 0);

  const { data: returnRequest, error: returnError } = await supabase
    .from('return_requests')
    .insert({
      user_id: user.id,
      order_id: params.orderId,
      return_number: '',
      status: 'pending',
      reason: params.reason,
      description: params.description,
      refund_method: params.refundMethod,
      refund_amount: totalRefundAmount,
    })
    .select()
    .single();

  if (returnError || !returnRequest) {
    return { success: false, error: 'Failed to create return request' };
  }

  const itemsToInsert = normalizedItems.map(item => ({
    return_request_id: returnRequest.id,
    order_item_id: item.order_item_id,
    product_sku: item.product_sku,
    product_name: item.product_name,
    size: item.size,
    quantity: item.quantity,
    price: item.price,
    refund_amount: item.refund_amount,
    condition: item.condition,
  }));

  const { error: itemsError } = await supabase
    .from('return_items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('return_requests').delete().eq('id', returnRequest.id);
    return { success: false, error: 'Failed to add return items' };
  }

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const customerEmail = userProfile?.email || user.email;
  const customerName = userProfile?.full_name || user.email?.split('@')[0] || 'Customer';

  if (customerEmail) {
    await sendReturnConfirmationEmail({
      returnNumber: returnRequest.return_number,
      orderNumber: order.order_number || params.orderId,
      customerName,
      customerEmail,
      returnDate: new Date(returnRequest.requested_at).toLocaleDateString(),
      items: normalizedItems.map(item => ({
        name: item.product_name,
        sku: item.product_sku,
        size: item.size,
        quantity: item.quantity,
        refundAmount: item.refund_amount,
      })),
      totalRefund: totalRefundAmount,
      refundMethod: params.refundMethod === 'original_payment' ? 'Original Payment Method' :
                    params.refundMethod === 'store_credit' ? 'Store Credit' : 'Exchange',
      processingTime: '5-7 business days',
    });
  }

  return { success: true, returnRequest };
}

export async function getUserOrdersForReturn(): Promise<ReturnableOrder[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      created_at,
      total,
      order_items (
        id,
        quantity,
        price,
        products (sku, name),
        product_variants (size)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['processing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch returnable orders:', error);
    return [];
  }

  const normalizedOrders: ReturnableOrder[] = (data || []).map((order: any) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    total: Number(order.total || 0),
    order_items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      products: Array.isArray(item.products) ? item.products[0] || null : item.products,
      product_variants: Array.isArray(item.product_variants)
        ? item.product_variants[0] || null
        : item.product_variants,
    })),
  }));

  return normalizedOrders.filter((order) => order.order_items?.length > 0);
}

export async function getUserReturnRequests(): Promise<ReturnRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('return_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch return requests:', error);
    return [];
  }

  return data || [];
}

export async function getReturnRequestDetails(returnId: string): Promise<{ returnRequest?: ReturnRequest; items: ReturnItem[]; transactions: RefundTransaction[] }> {
  const { data: returnRequest } = await supabase
    .from('return_requests')
    .select('*')
    .eq('id', returnId)
    .maybeSingle();

  const { data: items } = await supabase
    .from('return_items')
    .select('*')
    .eq('return_request_id', returnId)
    .order('created_at', { ascending: true });

  const { data: transactions } = await supabase
    .from('refund_transactions')
    .select('*')
    .eq('return_request_id', returnId)
    .order('created_at', { ascending: false });

  return {
    returnRequest: returnRequest || undefined,
    items: items || [],
    transactions: transactions || [],
  };
}

export async function getAllReturnRequests(status?: ReturnStatus): Promise<ReturnRequest[]> {
  let query = supabase
    .from('return_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch all return requests:', error);
    return [];
  }

  return data || [];
}

export async function approveReturnRequest(returnId: string, adminNotes?: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('return_requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_notes: adminNotes,
    })
    .eq('id', returnId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function rejectReturnRequest(returnId: string, adminNotes: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('return_requests')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_notes: adminNotes,
    })
    .eq('id', returnId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateReturnStatus(returnId: string, status: ReturnStatus, notes?: string): Promise<{ success: boolean; error?: string }> {
  const updates: any = { status };

  if (notes) {
    updates.admin_notes = notes;
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('return_requests')
    .update(updates)
    .eq('id', returnId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function createRefundTransaction(params: {
  returnRequestId: string;
  transactionType: TransactionType;
  amount: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}): Promise<{ success: boolean; transaction?: RefundTransaction; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: transaction, error } = await supabase
    .from('refund_transactions')
    .insert({
      return_request_id: params.returnRequestId,
      transaction_type: params.transactionType,
      amount: params.amount,
      payment_method: params.paymentMethod,
      transaction_id: params.transactionId,
      status: 'pending',
      processed_by: user.id,
      notes: params.notes,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, transaction };
}

export async function completeRefundTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('refund_transactions')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelReturnRequest(returnId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: returnRequest } = await supabase
    .from('return_requests')
    .select('user_id, status')
    .eq('id', returnId)
    .maybeSingle();

  if (!returnRequest) {
    return { success: false, error: 'Return request not found' };
  }

  if (returnRequest.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (returnRequest.status !== 'pending') {
    return { success: false, error: 'Can only cancel pending returns' };
  }

  const { error } = await supabase
    .from('return_requests')
    .update({ status: 'cancelled' })
    .eq('id', returnId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
