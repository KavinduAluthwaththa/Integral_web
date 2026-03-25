import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase-service';
import { convertCurrency } from '@/lib/currency-service-api';
import { buildWebhookSignature, getPayHereConfig, isPayHereSupportedCurrency } from '@/lib/payhere';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const notifyData = Object.fromEntries(form.entries()) as Record<string, string>;

  const { merchantId, merchantSecret } = getPayHereConfig();
  const serviceClient = getServiceSupabaseClient();
  const alertWebhookUrl = process.env.PAYHERE_ALERT_WEBHOOK_URL;

  const maybeSendAlert = async (key: string, message: string, context: Record<string, string | number | null>) => {
    if (!alertWebhookUrl) return;

    try {
      const { data } = await serviceClient
        .from('payhere_alert_state')
        .select('last_sent_at, muted_until')
        .eq('key', key)
        .maybeSingle();

      const now = new Date();
      if (data?.muted_until && new Date(data.muted_until) > now) {
        return;
      }

      const lastSent = data?.last_sent_at ? new Date(data.last_sent_at) : null;
      if (lastSent && now.getTime() - lastSent.getTime() < 60 * 60 * 1000) {
        return;
      }

      await serviceClient
        .from('payhere_alert_state')
        .upsert({ key, last_sent_at: now.toISOString() }, { onConflict: 'key' });

      await fetch(alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message, context }),
      });
    } catch (error) {
      console.error('payhere: failed to send alert', error);
    }
  };

  const logEvent = async (entry: {
    orderId?: string;
    merchant?: string;
    payhereAmount?: string;
    payhereCurrency?: string;
    statusCode?: string;
    paymentId?: string;
    success: boolean;
    reason: string;
    rawPayload: Record<string, string>;
  }) => {
    try {
      await serviceClient.from('payhere_webhook_events').insert({
        order_id: entry.orderId || null,
        merchant_id: entry.merchant || null,
        payhere_amount: entry.payhereAmount || null,
        payhere_currency: entry.payhereCurrency || null,
        status_code: entry.statusCode || null,
        payment_id: entry.paymentId || null,
        success: entry.success,
        reason: entry.reason,
        raw_payload: entry.rawPayload,
      });
    } catch (error) {
      console.error('payhere: failed to log webhook event', error);
    }
  };

  const alertRepeatedFailures = async (orderId: string) => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await serviceClient
        .from('payhere_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('success', false)
        .gte('created_at', oneHourAgo);

      if (count && count >= 3 && count % 3 === 0) {
        console.warn('payhere: repeated webhook failures', { orderId, failuresLastHour: count });
        await maybeSendAlert(
          'payhere-failures-hourly',
          `PayHere webhook failures: ${count} in the last hour for order ${orderId}`,
          { orderId, failuresLastHour: count }
        );
      }
    } catch (error) {
      console.error('payhere: failure counting alerts', error);
    }
  };

  const orderId = notifyData.order_id;
  const merchant = notifyData.merchant_id;
  const payhereAmount = notifyData.payhere_amount;
  const payhereCurrency = String(notifyData.payhere_currency || 'LKR').toUpperCase();
  const statusCode = notifyData.status_code;
  const signature = notifyData.md5sig;
  const paymentId = notifyData.payment_id;

  if (!orderId || !payhereAmount || !statusCode || !signature) {
    console.warn('payhere: invalid payload', notifyData);
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'missing fields',
      rawPayload: notifyData,
    });
    if (orderId) {
      await alertRepeatedFailures(orderId);
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (merchant && merchant !== merchantId) {
    console.warn('payhere: merchant mismatch', { merchant, expected: merchantId, orderId });
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'merchant mismatch',
      rawPayload: notifyData,
    });
    await alertRepeatedFailures(orderId);
    await maybeSendAlert(
      'payhere-suspicious-merchant',
      `PayHere merchant mismatch for order ${orderId || 'unknown'}`,
      { orderId, merchant, expected: merchantId }
    );
    return NextResponse.json({ error: 'Merchant mismatch' }, { status: 400 });
  }

  const expectedSig = buildWebhookSignature({
    merchantId,
    merchantSecret,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode,
  });

  if (expectedSig !== signature) {
    console.warn('payhere: signature mismatch', { orderId, signature, expectedSig });
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'signature mismatch',
      rawPayload: notifyData,
    });
    await alertRepeatedFailures(orderId);
    await maybeSendAlert(
      'payhere-suspicious-signature',
      `PayHere signature mismatch for order ${orderId}`,
      { orderId, paymentId, signature }
    );
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }

  if (!isPayHereSupportedCurrency(payhereCurrency)) {
    console.warn('payhere: unsupported currency', { orderId, payhereCurrency });
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'unsupported currency',
      rawPayload: notifyData,
    });
    await alertRepeatedFailures(orderId);
    return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 });
  }

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id, total, payment_status, payment_id')
    .eq('order_number', orderId)
    .maybeSingle();

  if (orderError || !order) {
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'order not found',
      rawPayload: notifyData,
    });
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const baseCurrency = 'USD';
  const baseAmount = Number(order.total || 0);
  const expectedAmount = payhereCurrency === baseCurrency
    ? baseAmount
    : await convertCurrency(baseAmount, baseCurrency, payhereCurrency);

  const amountMatches = Number.isFinite(expectedAmount)
    && Math.abs(Number(payhereAmount) - expectedAmount) <= 0.01;
  if (!amountMatches) {
    console.warn('payhere: amount mismatch', {
      orderId,
      expected: Number(expectedAmount).toFixed(2),
      got: Number(payhereAmount).toFixed(2),
      currency: payhereCurrency,
      baseCurrency,
      baseAmount: Number(baseAmount).toFixed(2),
    });
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'amount mismatch',
      rawPayload: notifyData,
    });
    await alertRepeatedFailures(orderId);
    await maybeSendAlert(
      'payhere-suspicious-amount',
      `PayHere amount mismatch for order ${orderId}: expected ${Number(expectedAmount).toFixed(2)} ${payhereCurrency}, got ${Number(payhereAmount).toFixed(2)} ${payhereCurrency}`,
      {
        orderId,
        expected: Number(expectedAmount).toFixed(2),
        got: Number(payhereAmount).toFixed(2),
        currency: payhereCurrency,
        baseCurrency,
        baseAmount: Number(baseAmount).toFixed(2),
      }
    );
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const status = statusCode === '2' ? 'paid' : statusCode === '0' ? 'pending' : 'failed';

  // Idempotency: if already paid with same payment_id, return success
  if (order.payment_status === 'paid' && paymentId && order.payment_id === paymentId) {
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: true,
      reason: 'idempotent replay',
      rawPayload: notifyData,
    });
    return NextResponse.json({ success: true, note: 'Already processed payment_id' });
  }

  if (order.payment_status === 'paid' && status !== 'paid') {
    console.warn('payhere: downgrade attempt on paid order', { orderId, current: order.payment_status, incoming: status, paymentId });
    await logEvent({
      orderId,
      merchant,
      payhereAmount,
      payhereCurrency,
      statusCode,
      paymentId,
      success: false,
      reason: 'downgrade attempt on paid order',
      rawPayload: notifyData,
    });
    await alertRepeatedFailures(orderId);
    return NextResponse.json({ success: true, note: 'Ignoring downgrade for paid order' });
  }

  if (order.payment_status === status && status !== 'paid') {
    return NextResponse.json({ success: true, note: 'No status change' });
  }

  await serviceClient
    .from('orders')
    .update({ payment_status: status, payment_method: 'payhere', payment_id: paymentId || null })
    .eq('id', order.id);

  await logEvent({
    orderId,
    merchant,
    payhereAmount,
    payhereCurrency,
    statusCode,
    paymentId,
    success: status === 'paid',
    reason: status === 'paid' ? 'paid' : status,
    rawPayload: notifyData,
  });

  // Alert on elevated failure rate (24h) if webhook configured
  try {
    if (alertWebhookUrl) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ count: failures24h }, { count: total24h }] = await Promise.all([
        serviceClient
          .from('payhere_webhook_events')
          .select('id', { count: 'exact', head: true })
          .eq('success', false)
          .gte('created_at', oneDayAgo),
        serviceClient
          .from('payhere_webhook_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo),
      ]);

      if (total24h && failures24h && total24h > 0) {
        const rate = (failures24h / total24h) * 100;
        if (rate >= 10) {
          await maybeSendAlert(
            'payhere-failure-rate',
            `PayHere webhook failure rate ${rate.toFixed(1)}% over last 24h (${failures24h}/${total24h})`,
            { failures24h, total24h, rate: Number(rate.toFixed(1)) }
          );
        }
      }
    }
  } catch (error) {
    console.error('payhere: failure rate alert calc error', error);
  }

  return NextResponse.json({ success: true });
}