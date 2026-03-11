'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import {
  getSalesOverview,
  getHotProducts,
  getInventoryLevels,
  getUserRetention,
  getTrafficSources,
  SalesOverview,
  HotProduct,
  InventoryLevel,
  UserRetention,
  TrafficSource,
} from '@/lib/admin-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Package, Users, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle, Activity } from 'lucide-react';
import Image from 'next/image';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { itemCount } = useCart();

  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
  const [hotProducts, setHotProducts] = useState<HotProduct[]>([]);
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [userRetention, setUserRetention] = useState<UserRetention | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [sales, products, inventory, retention, traffic] = await Promise.all([
      getSalesOverview(startDate, endDate),
      getHotProducts(startDate, endDate, 5),
      getInventoryLevels(),
      getUserRetention(startDate, endDate),
      getTrafficSources(startDate, endDate),
    ]);

    setSalesOverview(sales);
    setHotProducts(products);
    setInventoryLevels(inventory);
    setUserRetention(retention);
    setTrafficSources(traffic);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'text-green-600';
      case 'low_stock':
        return 'text-orange-600';
      case 'out_of_stock':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
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

  if (authLoading || loading) {
    return (
      <>
        <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
        <main className="min-h-screen bg-background py-5xl">
          <div className="max-w-7xl mx-auto px-xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading admin dashboard...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-7xl mx-auto px-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-wide">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Complete overview of your e-commerce operations
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDateRange(7)}
                className={`px-4 py-2 text-sm border transition-colors ${
                  dateRange === 7
                    ? 'bg-foreground text-background'
                    : 'border-foreground/20 hover:border-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRange(30)}
                className={`px-4 py-2 text-sm border transition-colors ${
                  dateRange === 30
                    ? 'bg-foreground text-background'
                    : 'border-foreground/20 hover:border-foreground'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRange(90)}
                className={`px-4 py-2 text-sm border transition-colors ${
                  dateRange === 90
                    ? 'bg-foreground text-background'
                    : 'border-foreground/20 hover:border-foreground'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>

          {/* Sales Overview */}
          <section>
            <h2 className="text-xl font-light tracking-wide mb-4">Sales Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesOverview?.totalOrders || 0}</div>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(salesOverview?.avgOrderValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {salesOverview?.conversionRate.toFixed(2) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Sessions to orders</p>
                </CardContent>
              </Card>
            </div>

            {salesOverview && salesOverview.revenueByDay.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
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
                          <span className="text-sm font-medium">{formatCurrency(day.revenue)}</span>
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
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Products</CardTitle>
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
                          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-medium shrink-0">
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
                            <p className="text-sm font-medium truncate">{product.name}</p>
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
                            <p className="text-sm font-bold">{formatCurrency(product.revenue)}</p>
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
              <Card>
                <CardHeader>
                  <CardTitle>Stock Status</CardTitle>
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
                            <p className="text-sm font-medium truncate">{item.productName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Size {item.size}</span>
                              <span>•</span>
                              <span>{item.sku}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-medium">{item.availableStock}</p>
                              <p className="text-xs text-muted-foreground">available</p>
                            </div>
                            <div className={getStockStatusColor(item.status)}>
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
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>New vs returning user breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{userRetention?.totalUsers || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Retention Rate</p>
                      <p className="text-2xl font-bold">
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
                      <span className="text-xl font-semibold">{userRetention?.newUsers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Returning Users</span>
                      </div>
                      <span className="text-xl font-semibold">
                        {userRetention?.returningUsers || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Avg Sessions/User</span>
                      </div>
                      <span className="text-xl font-semibold">
                        {userRetention?.avgSessionsPerUser.toFixed(1) || 0}
                      </span>
                    </div>
                  </div>

                  {userRetention && userRetention.usersByDay.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Daily Breakdown</h4>
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
              <Card>
                <CardHeader>
                  <CardTitle>Visitor Origins</CardTitle>
                  <CardDescription>Where your traffic comes from</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No traffic data available</p>
                    ) : (
                      trafficSources.map((source, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>{getSourceIcon(source.source)}</span>
                              <span className="capitalize font-medium">{source.source}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{source.sessions} sessions</span>
                              <span>•</span>
                              <span>{source.users} users</span>
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
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
