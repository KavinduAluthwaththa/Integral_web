'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReturnRequestForm } from '@/components/returns/return-request-form';
import {
  getUserReturnRequests,
  getReturnRequestDetails,
  cancelReturnRequest,
  ReturnRequest,
  ReturnItem,
  RefundTransaction,
} from '@/lib/returns-service';
import { getReturnStatusBadgeColor, getReturnStatusLabel } from '@/lib/returns/status-ui';
import { PackageOpen, Clock, CircleCheck as CheckCircle2, Package } from 'lucide-react';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [transactions, setTransactions] = useState<RefundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReturnDialog, setShowNewReturnDialog] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    const data = await getUserReturnRequests();
    setReturns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleViewDetails = async (returnRequest: ReturnRequest) => {
    setSelectedReturn(returnRequest);
    setDetailsLoading(true);
    const details = await getReturnRequestDetails(returnRequest.id);
    setReturnItems(details.items);
    setTransactions(details.transactions);
    setDetailsLoading(false);
  };

  const handleCancelReturn = async (returnId: string) => {
    if (!confirm('Are you sure you want to cancel this return request?')) {
      return;
    }

    const result = await cancelReturnRequest(returnId);
    if (result.success) {
      loadReturns();
      setSelectedReturn(null);
    } else {
      alert(result.error || 'Failed to cancel return');
    }
  };

  const pendingReturns = returns.filter(r => r.status === 'pending');
  const activeReturns = returns.filter(r => ['approved', 'processing'].includes(r.status));
  const completedReturns = returns.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status));

  const ReturnCard = ({ returnRequest }: { returnRequest: ReturnRequest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{returnRequest.return_number}</CardTitle>
            <CardDescription className="mt-1">
              Requested on {new Date(returnRequest.requested_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={getReturnStatusBadgeColor(returnRequest.status)}>
            {getReturnStatusLabel(returnRequest.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Reason:</span>
            <p className="font-medium">{returnRequest.reason.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Refund Amount:</span>
            <p className="font-medium">${returnRequest.refund_amount.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Refund Method:</span>
            <p className="font-medium">
              {returnRequest.refund_method === 'original_payment'
                ? 'Original Payment'
                : returnRequest.refund_method === 'store_credit'
                ? 'Store Credit'
                : 'Exchange'}
            </p>
          </div>
          {returnRequest.approved_at && (
            <div>
              <span className="text-muted-foreground">Processed on:</span>
              <p className="font-medium">{new Date(returnRequest.approved_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {returnRequest.admin_notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Admin Notes:</p>
            <p className="text-sm">{returnRequest.admin_notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleViewDetails(returnRequest)}>
            View Details
          </Button>
          {returnRequest.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelReturn(returnRequest.id)}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-wide">Returns & Refunds</h1>
            <p className="text-muted-foreground mt-1">Manage your return requests</p>
          </div>
          <Button onClick={() => setShowNewReturnDialog(true)}>
            New Return Request
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReturns.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeReturns.length}</div>
              <p className="text-xs text-muted-foreground">Being processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReturns.length}</div>
              <p className="text-xs text-muted-foreground">Total processed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Returns ({returns.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingReturns.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeReturns.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedReturns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading returns...</p>
                </CardContent>
              </Card>
            ) : returns.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="No Return Requests"
                description="You haven't made any return requests yet."
              />
            ) : (
              returns.map(returnRequest => (
                <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingReturns.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Pending Returns"
                description="You don't have any pending return requests."
              />
            ) : (
              pendingReturns.map(returnRequest => (
                <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeReturns.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Active Returns"
                description="You don't have any returns being processed."
              />
            ) : (
              activeReturns.map(returnRequest => (
                <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedReturns.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No Completed Returns"
                description="You don't have any completed returns yet."
              />
            ) : (
              completedReturns.map(returnRequest => (
                <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showNewReturnDialog} onOpenChange={setShowNewReturnDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Return Request</DialogTitle>
            <DialogDescription>
              Select one of your delivered or shipped orders and choose the items to return.
            </DialogDescription>
          </DialogHeader>
          <ReturnRequestForm
            onSuccess={() => {
              setShowNewReturnDialog(false);
              loadReturns();
            }}
          />
        </DialogContent>
      </Dialog>

      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReturn.return_number}</DialogTitle>
              <DialogDescription>Return request details</DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading details...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getReturnStatusBadgeColor(selectedReturn.status)}>
                      {getReturnStatusLabel(selectedReturn.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested On</p>
                    <p className="font-medium">{new Date(selectedReturn.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Method</p>
                    <p className="font-medium">
                      {selectedReturn.refund_method === 'original_payment'
                        ? 'Original Payment'
                        : selectedReturn.refund_method === 'store_credit'
                        ? 'Store Credit'
                        : 'Exchange'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Amount</p>
                    <p className="font-medium text-lg">${selectedReturn.refund_amount.toFixed(2)}</p>
                  </div>
                </div>

                {selectedReturn.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedReturn.description}</p>
                  </div>
                )}

                {selectedReturn.admin_notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                    <p className="text-sm">{selectedReturn.admin_notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-3">Return Items</h3>
                  <div className="space-y-2">
                    {returnItems.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                SKU: {item.product_sku} • Size: {item.size} • Qty: {item.quantity}
                              </p>
                              {item.condition && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Condition: {item.condition}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${item.refund_amount.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {transactions.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Refund Transactions</h3>
                    <div className="space-y-2">
                      {transactions.map(transaction => (
                        <Card key={transaction.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">{transaction.transaction_type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {transaction.status} • {new Date(transaction.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
