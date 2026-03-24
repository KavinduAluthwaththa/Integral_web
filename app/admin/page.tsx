'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { useAdminGuard } from '@/hooks/admin/use-admin-guard';
import {
  getSalesOverview,
  getHotProducts,
  getInventoryLevels,
  getRecommendationOverview,
  getUserRetention,
  getTrafficSources,
  SalesOverview,
  HotProduct,
  InventoryLevel,
  RecommendationOverview,
  UserRetention,
  TrafficSource,
} from '@/lib/admin-analytics';
import { getInventoryStatusColor } from '@/lib/inventory/stock-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Users, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle, Activity, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

export default function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const { isAdmin, checkingAdmin } = useAdminGuard();

  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
  const [hotProducts, setHotProducts] = useState<HotProduct[]>([]);
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [recommendationOverview, setRecommendationOverview] = useState<RecommendationOverview | null>(null);
  const [userRetention, setUserRetention] = useState<UserRetention | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [sales, products, inventory, recommendations, retention, traffic] = await Promise.all([
      getSalesOverview(startDate, endDate),
      getHotProducts(startDate, endDate, 5),
      getInventoryLevels(),
      getRecommendationOverview(startDate, endDate),
      getUserRetention(startDate, endDate),
      getTrafficSources(startDate, endDate),
    ]);

    setSalesOverview(sales);
    setHotProducts(products);
    setInventoryLevels(inventory);
    setRecommendationOverview(recommendations);
    setUserRetention(retention);
    setTrafficSources(traffic);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    if (isAdmin) {
      void loadDashboardData();
    }
  }, [isAdmin, loadDashboardData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <CheckCircle className="h-4 w-4" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4" />;
      case 'out_of_stock':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      instagram: '📸',
      facebook: '👥',
      youtube: '▶️',
      google: '🔍',
      twitter: '🐦',
      direct: '🔗',
      other: '🌐',
    };
    return icons[source] || '🌐';
  };

  if (authLoading || checkingAdmin || loading) {
    return (
      <>
        <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background pt-4xl pb-4xl">
          <div className="max-w-7xl mx-auto px-xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading admin dashboard...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background pt-4xl pb-4xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Complete overview of your e-commerce operations
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:flex">
              <button
                onClick={() => setDateRange(7)}
                className={`h-10 px-2 text-[11px] uppercase tracking-[0.18em] border-2 transition-colors sm:px-4 sm:text-xs sm:tracking-[0.2em] ${
                  dateRange === 7
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRange(30)}
                className={`h-10 px-2 text-[11px] uppercase tracking-[0.18em] border-2 transition-colors sm:px-4 sm:text-xs sm:tracking-[0.2em] ${
                  dateRange === 30
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRange(90)}
                className={`h-10 px-2 text-[11px] uppercase tracking-[0.18em] border-2 transition-colors sm:px-4 sm:text-xs sm:tracking-[0.2em] ${
                  dateRange === 90
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link href="/admin/products" className="border-2 border-foreground p-lg transition-colors hover:bg-foreground hover:text-background">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Catalog</p>
              <h2 className="mt-2 text-xl font-light tracking-wide">Manage Products</h2>
              <p className="mt-2 text-sm text-muted-foreground">Create products, edit merchandising details, and update variant stock.</p>
            </Link>
            <Link href="/admin/orders" className="border-2 border-foreground p-lg transition-colors hover:bg-foreground hover:text-background">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Fulfillment</p>
              <h2 className="mt-2 text-xl font-light tracking-wide">Manage Orders</h2>
              <p className="mt-2 text-sm text-muted-foreground">Review live orders, shipping details, and fulfillment statuses.</p>
            </Link>
            <Link href="/admin/returns" className="border-2 border-foreground p-lg transition-colors hover:bg-foreground hover:text-background">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Aftercare</p>
              <h2 className="mt-2 text-xl font-light tracking-wide">Manage Returns</h2>
              <p className="mt-2 text-sm text-muted-foreground">Approve, reject, and process return workflows.</p>
            </Link>
            <Link href="/admin/payments" className="border-2 border-foreground p-lg transition-colors hover:bg-foreground hover:text-background flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Payments</p>
                <h2 className="mt-2 text-xl font-light tracking-wide">Webhook Health</h2>
                <p className="mt-2 text-sm text-muted-foreground">Review PayHere webhook failures, events, and alerts.</p>
              </div>
            </Link>
          </section>

          {/* Sales Overview */}
          <section>
            <h2 className="text-xl font-light tracking-wide mb-4">Sales Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light tracking-tight">
                    {formatCurrency(salesOverview?.totalRevenue || 0)}
                  </div>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {salesOverview && salesOverview.revenueGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={
                        salesOverview && salesOverview.revenueGrowth >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatPercentage(salesOverview?.revenueGrowth || 0)}
                    </span>
                    <span className="text-muted-foreground">vs previous period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light tracking-tight">{salesOverview?.totalOrders || 0}</div>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {salesOverview && salesOverview.ordersGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={
                        salesOverview && salesOverview.ordersGrowth >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatPercentage(salesOverview?.ordersGrowth || 0)}
                    </span>
                    <span className="text-muted-foreground">vs previous period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Avg Order Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light tracking-tight">
                    {formatCurrency(salesOverview?.avgOrderValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                </CardContent>
              </Card>

              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Conversion Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-light tracking-tight">
                    {salesOverview?.conversionRate.toFixed(2) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Sessions to orders</p>
                </CardContent>
              </Card>
            </div>

            {salesOverview && salesOverview.revenueByDay.length > 0 && (
              <Card className="mt-4 rounded-none border-2 border-foreground shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-light tracking-wide">Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue and order breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {salesOverview.revenueByDay.slice(-14).map((day, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-light tracking-wide">{formatCurrency(day.revenue)}</span>
                          <span className="text-xs text-muted-foreground">
                            {day.orders} orders
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Hot Products & Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-light tracking-wide mb-4">Hot Products</h2>
              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-light tracking-wide">Top Performing Products</CardTitle>
                  <CardDescription>Based on revenue and sales volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hotProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No product data available</p>
                    ) : (
                      hotProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 pb-4 border-b last:border-0"
                        >
                          <div className="flex items-center justify-center w-8 h-8 border-2 border-foreground text-sm font-light shrink-0">
                            #{index + 1}
                          </div>
                          <div className="relative w-16 h-16 bg-muted rounded shrink-0">
                            {product.image && (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-light tracking-wide truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {product.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {product.sales}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-light tracking-wide">{formatCurrency(product.revenue)}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.conversionRate.toFixed(1)}% conv
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-light tracking-wide mb-4">Inventory Levels</h2>
              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-light tracking-wide">Stock Status</CardTitle>
                  <CardDescription>Current inventory across all variants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {inventoryLevels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No inventory data available</p>
                    ) : (
                      inventoryLevels.slice(0, 15).map((item) => (
                        <div
                          key={item.variantId}
                          className="flex items-center gap-3 pb-3 border-b last:border-0"
                        >
                          <div className="relative w-12 h-12 bg-muted rounded shrink-0">
                            {item.image && (
                              <Image
                                src={item.image}
                                alt={item.productName}
                                fill
                                className="object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-light tracking-wide truncate">{item.productName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Size {item.size}</span>
                              <span>•</span>
                              <span>{item.sku}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-light tracking-wide">{item.availableStock}</p>
                              <p className="text-xs text-muted-foreground">available</p>
                            </div>
                            <div className={getInventoryStatusColor(item.status)}>
                              {getStockStatusIcon(item.status)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* User Retention & Traffic Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-light tracking-wide mb-4">User Retention</h2>
              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-light tracking-wide">User Activity</CardTitle>
                  <CardDescription>New vs returning user breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total Users</p>
                      <p className="text-3xl font-light tracking-tight">{userRetention?.totalUsers || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Retention Rate</p>
                      <p className="text-3xl font-light tracking-tight">
                        {userRetention?.retentionRate.toFixed(1) || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm">New Users</span>
                      </div>
                      <span className="text-2xl font-light tracking-tight">{userRetention?.newUsers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Returning Users</span>
                      </div>
                      <span className="text-2xl font-light tracking-tight">
                        {userRetention?.returningUsers || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Avg Sessions/User</span>
                      </div>
                      <span className="text-2xl font-light tracking-tight">
                        {userRetention?.avgSessionsPerUser.toFixed(1) || 0}
                      </span>
                    </div>
                  </div>

                  {userRetention && userRetention.usersByDay.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Daily Breakdown</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {userRetention.usersByDay.slice(-7).map((day, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{day.date}</span>
                            <div className="flex gap-3">
                              <span className="text-green-600">{day.new} new</span>
                              <span className="text-blue-600">{day.returning} returning</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-light tracking-wide mb-4">Traffic Sources</h2>
              <Card className="rounded-none border-2 border-foreground shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-light tracking-wide">Visitor Origins</CardTitle>
                  <CardDescription>Where your traffic comes from</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No traffic data available</p>
                    ) : (
                      trafficSources.map((source, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <span>{getSourceIcon(source.source)}</span>
                              <span className="capitalize font-light tracking-wide">{source.source}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex sm:items-center sm:gap-3">
                              <span>{source.sessions} sessions</span>
                              <span>{source.users} users</span>
                              <span>{source.orders} orders</span>
                              <span>{formatCurrency(source.revenue)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-foreground h-2 rounded-full transition-all"
                                style={{ width: `${source.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {source.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Conversion {source.conversionRate.toFixed(1)}%
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          <section>
            <h2 className="text-xl font-light tracking-wide mb-4">Recommendation Performance</h2>
            <Card className="rounded-none border-2 border-foreground shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-light tracking-wide">Attributed Sales</CardTitle>
                <CardDescription>How recommendation clicks translate into carts and orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <div className="space-y-1">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Clicks</p>
                    <p className="text-3xl font-light tracking-tight">{recommendationOverview?.clickCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Add To Cart</p>
                    <p className="text-3xl font-light tracking-tight">{recommendationOverview?.addToCartCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Orders</p>
                    <p className="text-3xl font-light tracking-tight">{recommendationOverview?.conversionCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Click To Cart</p>
                    <p className="text-3xl font-light tracking-tight">{(recommendationOverview?.clickToCartRate ?? 0).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Revenue</p>
                    <p className="text-3xl font-light tracking-tight">{formatCurrency(recommendationOverview?.attributedRevenue || 0)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Click to order conversion: {(recommendationOverview?.clickToOrderRate ?? 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
