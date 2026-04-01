import { supabase } from './supabase';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem('analytics_visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('analytics_visitor_id', visitorId);
  }

  return visitorId;
}

export function getUTMParams() {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

export async function trackTrafficSource() {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const visitorId = getVisitorId();

  const { data: existing } = await supabase
    .from('traffic_sources')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) return;

  const utmParams = getUTMParams();
  const referrer = document.referrer || null;
  const landingPage = window.location.pathname;

  const { data: sourceData } = await supabase.rpc('get_traffic_source', {
    p_referrer: referrer,
    p_utm_source: utmParams.utm_source || null,
  });

  await supabase.from('traffic_sources').insert({
    session_id: sessionId,
    visitor_id: visitorId,
    source: sourceData || 'direct',
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
    referrer,
    landing_page: landingPage,
  });
}

export async function trackSession(userId?: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();
  const visitorId = getVisitorId();

  const isReturning = localStorage.getItem('has_visited') === 'true';

  if (!isReturning) {
    localStorage.setItem('has_visited', 'true');
  }

  const { data: existing, error: selectError } = await supabase
    .from('session_analytics')
    .select('id, page_views')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('session_analytics select error', selectError.message);
    return;
  }

  if (existing) {
    const nextPageViews = (existing.page_views || 0) + 1;
    const { error: updateError } = await supabase
      .from('session_analytics')
      .update({
        last_activity: new Date().toISOString(),
        page_views: nextPageViews,
        user_id: userId || null,
        visitor_id: visitorId,
      })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('session_analytics update error', updateError.message);
    }
  } else {
    const { error: upsertError } = await supabase
      .from('session_analytics')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId || null,
          visitor_id: visitorId,
          is_returning: isReturning,
          page_views: 1,
        },
        {
          onConflict: 'session_id',
        }
      );

    if (upsertError) {
      console.error('session_analytics upsert error', upsertError.message);
    }
  }
}

export async function trackUserRegistrationStarted(email?: string) {
  const sessionId = getSessionId();
  const utmParams = getUTMParams();
  const referrer = typeof window !== 'undefined' ? document.referrer || null : null;

  await supabase.from('user_analytics').insert({
    session_id: sessionId,
    event_type: 'registration_started',
    email: email || null,
    referrer,
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
  });
}

export async function trackUserRegistrationCompleted(userId: string, email: string) {
  const sessionId = getSessionId();
  const utmParams = getUTMParams();

  await supabase.rpc('track_user_signup', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_email: email,
    p_utm_source: utmParams.utm_source || null,
    p_utm_medium: utmParams.utm_medium || null,
    p_utm_campaign: utmParams.utm_campaign || null,
  });
}

export async function trackProductView(productId: string, userId?: string) {
  const sessionId = getSessionId();
  const referrer = typeof window !== 'undefined' ? document.referrer || null : null;

  await supabase.from('product_analytics').insert({
    session_id: sessionId,
    user_id: userId || null,
    product_id: productId,
    event_type: 'view',
    referrer,
  });
}

export async function trackProductClick(productId: string, userId?: string) {
  const sessionId = getSessionId();
  const referrer = typeof window !== 'undefined' ? document.referrer || null : null;

  await supabase.from('product_analytics').insert({
    session_id: sessionId,
    user_id: userId || null,
    product_id: productId,
    event_type: 'click',
    referrer,
  });
}

export async function trackSizeSelect(
  productId: string,
  variantId: string,
  size: string,
  userId?: string
) {
  const sessionId = getSessionId();

  await supabase.from('product_analytics').insert({
    session_id: sessionId,
    user_id: userId || null,
    product_id: productId,
    variant_id: variantId,
    event_type: 'size_select',
    size,
  });
}

export async function trackAddToCart(
  productId: string,
  variantId: string,
  size: string,
  userId?: string
) {
  const sessionId = getSessionId();

  await supabase.from('product_analytics').insert({
    session_id: sessionId,
    user_id: userId || null,
    product_id: productId,
    variant_id: variantId,
    event_type: 'add_to_cart',
    size,
  });
}

export interface AnalyticsSummary {
  total_signups: number;
  new_users: number;
  returning_users: number;
  abandoned_registrations: number;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  conversion_rate: number;
  total_sessions: number;
  total_product_views: number;
}

export async function getAnalyticsSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_end_date: endDate?.toISOString() || new Date().toISOString(),
  });

  if (error) {
    console.error('Error fetching analytics summary:', error);
    return null;
  }

  return data;
}

export async function getTrafficSourceStats(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('traffic_sources')
    .select('source')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    console.error('Error fetching traffic sources:', error);
    return [];
  }

  const sourceCounts: Record<string, number> = {};
  data.forEach((item) => {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  });

  return Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
  }));
}

export async function getTopProducts(startDate?: Date, endDate?: Date, limit = 10) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('product_analytics')
    .select('product_id, products(name, sku)')
    .eq('event_type', 'view')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    console.error('Error fetching top products:', error);
    return [];
  }

  const productCounts: Record<string, { name: string; sku: string; count: number }> = {};

  data.forEach((item: any) => {
    if (item.products) {
      if (!productCounts[item.product_id]) {
        productCounts[item.product_id] = {
          name: item.products.name,
          sku: item.products.sku,
          count: 0,
        };
      }
      productCounts[item.product_id].count++;
    }
  });

  return Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getSizeDemand(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('product_analytics')
    .select('size')
    .in('event_type', ['size_select', 'add_to_cart'])
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .not('size', 'is', null);

  if (error) {
    console.error('Error fetching size demand:', error);
    return [];
  }

  const sizeCounts: Record<string, number> = {};
  data.forEach((item) => {
    if (item.size) {
      sizeCounts[item.size] = (sizeCounts[item.size] || 0) + 1;
    }
  });

  return Object.entries(sizeCounts)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getSignupsOverTime(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('user_analytics')
    .select('created_at')
    .eq('event_type', 'registration_completed')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching signups over time:', error);
    return [];
  }

  const dailyCounts: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item.created_at).toLocaleDateString();
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });

  return Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getRevenueOverTime(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total')
    .neq('status', 'cancelled')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching revenue over time:', error);
    return [];
  }

  const dailyRevenue: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item.created_at).toLocaleDateString();
    dailyRevenue[date] = (dailyRevenue[date] || 0) + item.total;
  });

  return Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue: Math.round(revenue * 100) / 100,
  }));
}
