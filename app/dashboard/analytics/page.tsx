'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import {
  getAnalyticsSummary,
  getTrafficSourceStats,
  getTopProducts,
  getSizeDemand,
  getSignupsOverTime,
  getRevenueOverTime,
  AnalyticsSummary,
} from '@/lib/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, ShoppingCart, DollarSign, Eye, Shirt } from 'lucide-react';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trafficSources, setTrafficSources] = useState<Array<{ source: string; count: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sku: string; count: number }>>([]);
  const [sizeDemand, setSizeDemand] = useState<Array<{ size: string; count: number }>>([]);
  const [signupsOverTime, setSignupsOverTime] = useState<Array<{ date: string; count: number }>>([]);
  const [revenueOverTime, setRevenueOverTime] = useState<Array<{ date: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [summaryData, trafficData, productsData, sizesData, signupsData, revenueData] = await Promise.all([
      getAnalyticsSummary(startDate, endDate),
      getTrafficSourceStats(startDate, endDate),
      getTopProducts(startDate, endDate, 10),
      getSizeDemand(startDate, endDate),
      getSignupsOverTime(startDate, endDate),
      getRevenueOverTime(startDate, endDate),
    ]);

    setSummary(summaryData);
    setTrafficSources(trafficData);
    setTopProducts(productsData);
    setSizeDemand(sizesData);
    setSignupsOverTime(signupsData);
    setRevenueOverTime(revenueData);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-wide">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights into your e-commerce performance
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary?.total_revenue || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.total_orders || 0} orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary?.avg_order_value || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per transaction
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.conversion_rate.toFixed(2) || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.total_sessions || 0} sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Product Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.total_product_views || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total views
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Analytics</CardTitle>
                  <CardDescription>New vs returning users and signups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total Signups</span>
                    </div>
                    <span className="text-2xl font-bold">{summary?.total_signups || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">New Users</span>
                    </div>
                    <span className="text-xl font-semibold">{summary?.new_users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Returning Users</span>
                    </div>
                    <span className="text-xl font-semibold">{summary?.returning_users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Abandoned Registrations</span>
                    </div>
                    <span className="text-xl font-semibold">{summary?.abandoned_registrations || 0}</span>
                  </div>

                  {signupsOverTime.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Signups Over Time</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {signupsOverTime.slice(-7).map((item, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{item.date}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where your visitors come from</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trafficSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No traffic data available</p>
                    ) : (
                      trafficSources.map((item, index) => {
                        const total = trafficSources.reduce((sum, s) => sum + s.count, 0);
                        const percentage = ((item.count / total) * 100).toFixed(1);
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span>{getSourceIcon(item.source)}</span>
                                <span className="capitalize">{item.source}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.count}</span>
                                <span className="text-muted-foreground">({percentage}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-foreground h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Products</CardTitle>
                  <CardDescription>Most viewed products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No product data available</p>
                    ) : (
                      topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-medium">
                              #{index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{product.count}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Size Demand</CardTitle>
                  <CardDescription>Most popular sizes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sizeDemand.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No size data available</p>
                    ) : (
                      sizeDemand.map((item, index) => {
                        const total = sizeDemand.reduce((sum, s) => sum + s.count, 0);
                        const percentage = ((item.count / total) * 100).toFixed(1);
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Shirt className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Size {item.size}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.count}</span>
                                <span className="text-muted-foreground">({percentage}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-foreground h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {revenueOverTime.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>Daily revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {revenueOverTime.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">{item.date}</span>
                        <span className="font-medium">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}