import { supabase } from './supabase';

export interface SalesOverview {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
}

export interface HotProduct {
  id: string;
  name: string;
  sku: string;
  views: number;
  sales: number;
  revenue: number;
  conversionRate: number;
  image: string;
}

export interface InventoryLevel {
  productId: string;
  productName: string;
  sku: string;
  variantId: string;
  size: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image: string;
}

export interface UserRetention {
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  retentionRate: number;
  avgSessionsPerUser: number;
  usersByDay: Array<{ date: string; new: number; returning: number }>;
}

export interface TrafficSource {
  source: string;
  sessions: number;
  users: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  percentage: number;
}

export async function getSalesOverview(startDate?: Date, endDate?: Date): Promise<SalesOverview> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const previousEnd = start;

  const { data: currentOrders } = await supabase
    .from('orders')
    .select('created_at, total, status')
    .neq('status', 'cancelled')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const { data: previousOrders } = await supabase
    .from('orders')
    .select('total')
    .neq('status', 'cancelled')
    .gte('created_at', previousStart.toISOString())
    .lte('created_at', previousEnd.toISOString());

  const { data: sessions } = await supabase
    .from('session_analytics')
    .select('id')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const currentRevenue = currentOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const currentOrderCount = currentOrders?.length || 0;
  const previousRevenue = previousOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const previousOrderCount = previousOrders?.length || 0;

  const revenueGrowth = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;
  const ordersGrowth = previousOrderCount > 0
    ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
    : 0;

  const avgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
  const conversionRate = sessions && sessions.length > 0
    ? (currentOrderCount / sessions.length) * 100
    : 0;

  const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
  currentOrders?.forEach((order) => {
    const date = new Date(order.created_at).toLocaleDateString();
    if (!revenueByDay[date]) {
      revenueByDay[date] = { revenue: 0, orders: 0 };
    }
    revenueByDay[date].revenue += order.total;
    revenueByDay[date].orders += 1;
  });

  return {
    totalRevenue: currentRevenue,
    totalOrders: currentOrderCount,
    avgOrderValue,
    conversionRate,
    revenueGrowth,
    ordersGrowth,
    revenueByDay: Object.entries(revenueByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
}

export async function getHotProducts(startDate?: Date, endDate?: Date, limit = 10): Promise<HotProduct[]> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data: productViews } = await supabase
    .from('product_analytics')
    .select('product_id')
    .eq('event_type', 'view')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, quantity, price, orders!inner(created_at, status)')
    .gte('orders.created_at', start.toISOString())
    .lte('orders.created_at', end.toISOString())
    .neq('orders.status', 'cancelled');

  const productStats: Record<string, { views: number; sales: number; revenue: number }> = {};

  productViews?.forEach((view: any) => {
    if (!productStats[view.product_id]) {
      productStats[view.product_id] = { views: 0, sales: 0, revenue: 0 };
    }
    productStats[view.product_id].views += 1;
  });

  orderItems?.forEach((item: any) => {
    if (!productStats[item.product_id]) {
      productStats[item.product_id] = { views: 0, sales: 0, revenue: 0 };
    }
    productStats[item.product_id].sales += item.quantity;
    productStats[item.product_id].revenue += item.price * item.quantity;
  });

  const productIds = Object.keys(productStats);
  if (productIds.length === 0) return [];

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, images')
    .in('id', productIds);

  const hotProducts: HotProduct[] = products?.map((product) => {
    const stats = productStats[product.id];
    const conversionRate = stats.views > 0 ? (stats.sales / stats.views) * 100 : 0;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      views: stats.views,
      sales: stats.sales,
      revenue: stats.revenue,
      conversionRate,
      image: product.images[0] || '',
    };
  }) || [];

  return hotProducts
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getInventoryLevels(): Promise<InventoryLevel[]> {
  const { data: variants } = await supabase
    .from('product_variants')
    .select(`
      id,
      size,
      products (
        id,
        name,
        sku,
        images
      )
    `);

  if (!variants) return [];

  const inventoryLevels: InventoryLevel[] = [];

  for (const variant of variants) {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('current_stock, reserved_stock, available_stock')
      .eq('variant_id', variant.id)
      .maybeSingle();

    if (inventory && variant.products) {
      const product = variant.products as any;
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';

      if (inventory.available_stock === 0) {
        status = 'out_of_stock';
      } else if (inventory.available_stock <= 5) {
        status = 'low_stock';
      }

      inventoryLevels.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        variantId: variant.id,
        size: variant.size,
        currentStock: inventory.current_stock,
        reservedStock: inventory.reserved_stock,
        availableStock: inventory.available_stock,
        status,
        image: product.images[0] || '',
      });
    }
  }

  return inventoryLevels.sort((a, b) => a.availableStock - b.availableStock);
}

export async function getUserRetention(startDate?: Date, endDate?: Date): Promise<UserRetention> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data: allSessions } = await supabase
    .from('session_analytics')
    .select('session_id, user_id, is_returning, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const uniqueUsers = new Set();
  let newUsers = 0;
  let returningUsers = 0;
  const usersByDay: Record<string, { new: number; returning: number }> = {};

  allSessions?.forEach((session) => {
    if (session.user_id) {
      uniqueUsers.add(session.user_id);
    }

    if (session.is_returning) {
      returningUsers += 1;
    } else {
      newUsers += 1;
    }

    const date = new Date(session.created_at).toLocaleDateString();
    if (!usersByDay[date]) {
      usersByDay[date] = { new: 0, returning: 0 };
    }
    if (session.is_returning) {
      usersByDay[date].returning += 1;
    } else {
      usersByDay[date].new += 1;
    }
  });

  const totalSessions = allSessions?.length || 0;
  const totalUsers = uniqueUsers.size || totalSessions;
  const retentionRate = totalSessions > 0 ? (returningUsers / totalSessions) * 100 : 0;
  const avgSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0;

  return {
    totalUsers,
    newUsers,
    returningUsers,
    retentionRate,
    avgSessionsPerUser,
    usersByDay: Object.entries(usersByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
}

export async function getTrafficSources(startDate?: Date, endDate?: Date): Promise<TrafficSource[]> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data: trafficData } = await supabase
    .from('traffic_sources')
    .select('source, session_id')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status')
    .neq('status', 'cancelled')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const { data: sessions } = await supabase
    .from('session_analytics')
    .select('session_id, user_id')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const sourceStats: Record<string, {
    sessionIds: Set<string>;
    userIds: Set<string>;
    orders: number;
    revenue: number
  }> = {};

  trafficData?.forEach((traffic) => {
    if (!sourceStats[traffic.source]) {
      sourceStats[traffic.source] = {
        sessionIds: new Set(),
        userIds: new Set(),
        orders: 0,
        revenue: 0,
      };
    }
    sourceStats[traffic.source].sessionIds.add(traffic.session_id);
  });

  sessions?.forEach((session) => {
    const sourceEntry = Object.values(sourceStats).find(stat =>
      stat.sessionIds.has(session.session_id)
    );
    if (sourceEntry && session.user_id) {
      sourceEntry.userIds.add(session.user_id);
    }
  });

  const totalSessions = trafficData?.length || 0;

  const trafficSources: TrafficSource[] = Object.entries(sourceStats).map(([source, stats]) => {
    const sessions = stats.sessionIds.size;
    const users = stats.userIds.size;
    const conversionRate = sessions > 0 ? (stats.orders / sessions) * 100 : 0;
    const percentage = totalSessions > 0 ? (sessions / totalSessions) * 100 : 0;

    return {
      source,
      sessions,
      users,
      orders: stats.orders,
      revenue: stats.revenue,
      conversionRate,
      percentage,
    };
  });

  return trafficSources.sort((a, b) => b.sessions - a.sessions);
}
