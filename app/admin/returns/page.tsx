'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getAllReturnRequests,
  getReturnRequestDetails,
  approveReturnRequest,
  rejectReturnRequest,
  updateReturnStatus,
  createRefundTransaction,
  completeRefundTransaction,
  ReturnRequest,
  ReturnItem,
  RefundTransaction,
  ReturnStatus,
  TransactionType,
  getReturnStatusBadgeColor,
  getReturnStatusLabel,
} from '@/lib/returns-service';
import { Clock, CircleCheck as CheckCircle2, Circle as XCircle, Package, CircleAlert as AlertCircle, DollarSign } from 'lucide-react';

export default function AdminReturnsPage() {
  const { itemCount } = useCart();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [transactions, setTransactions] = useState<RefundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'status' | 'refund' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ReturnStatus>('processing');
  const [refundType, setRefundType] = useState<TransactionType>('refund');
  const [refundAmount, setRefundAmount] = useState('0');

  const loadReturns = async () => {
    setLoading(true);
    const data = await getAllReturnRequests();
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
    setRefundAmount(returnRequest.refund_amount.toString());
  };

  const handleApprove = async () => {
    if (!selectedReturn) return;

    const result = await approveReturnRequest(selectedReturn.id, adminNotes);
    if (result.success) {
      setActionDialog(null);
      setAdminNotes('');
      loadReturns();
      if (selectedReturn) {
        handleViewDetails({ ...selectedReturn, status: 'approved' });
      }
    } else {
      alert(result.error || 'Failed to approve return');
    }
  };

  const handleReject = async () => {
    if (!selectedReturn || !adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const result = await rejectReturnRequest(selectedReturn.id, adminNotes);
    if (result.success) {
      setActionDialog(null);
      setAdminNotes('');
      loadReturns();
      if (selectedReturn) {
        handleViewDetails({ ...selectedReturn, status: 'rejected' });
      }
    } else {
      alert(result.error || 'Failed to reject return');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReturn) return;

    const result = await updateReturnStatus(selectedReturn.id, newStatus, adminNotes);
    if (result.success) {
      setActionDialog(null);
      setAdminNotes('');
      setNewStatus('processing');
      loadReturns();
      if (selectedReturn) {
        handleViewDetails({ ...selectedReturn, status: newStatus });
      }
    } else {
      alert(result.error || 'Failed to update status');
    }
  };

  const handleCreateRefund = async () => {
    if (!selectedReturn) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }

    const result = await createRefundTransaction({
      returnRequestId: selectedReturn.id,
      transactionType: refundType,
      amount,
      paymentMethod: 'credit_card',
      notes: adminNotes,
    });

    if (result.success) {
      setActionDialog(null);
      setAdminNotes('');
      if (selectedReturn) {
        handleViewDetails(selectedReturn);
      }
    } else {
      alert(result.error || 'Failed to create refund transaction');
    }
  };

  const handleCompleteTransaction = async (transactionId: string) => {
    const result = await completeRefundTransaction(transactionId);
    if (result.success) {
      if (selectedReturn) {
        handleViewDetails(selectedReturn);
      }
    } else {
      alert(result.error || 'Failed to complete transaction');
    }
  };

  const pendingReturns = returns.filter(r => r.status === 'pending');
  const approvedReturns = returns.filter(r => r.status === 'approved');
  const processingReturns = returns.filter(r => r.status === 'processing');
  const completedReturns = returns.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status));

  const ReturnCard = ({ returnRequest }: { returnRequest: ReturnRequest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{returnRequest.return_number}</CardTitle>
            <CardDescription className="mt-1">
              Order: {returnRequest.order_id.slice(0, 8)}... • Requested on {new Date(returnRequest.requested_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={getReturnStatusBadgeColor(returnRequest.status)}>
            {getReturnStatusLabel(returnRequest.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
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
        </div>

        <Button variant="outline" size="sm" onClick={() => handleViewDetails(returnRequest)}>
          View & Manage
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />
      <main className="min-h-screen bg-background py-5xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-light tracking-wide">Returns Management</h1>
            <p className="text-muted-foreground mt-1">Review and process return requests</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingReturns.length}</div>
                <p className="text-xs text-muted-foreground">Needs approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedReturns.length}</div>
                <p className="text-xs text-muted-foreground">Ready to process</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processingReturns.length}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedReturns.length}</div>
                <p className="text-xs text-muted-foreground">Fully processed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingReturns.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedReturns.length})</TabsTrigger>
              <TabsTrigger value="processing">Processing ({processingReturns.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedReturns.length})</TabsTrigger>
              <TabsTrigger value="all">All ({returns.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingReturns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending returns</p>
                  </CardContent>
                </Card>
              ) : (
                pendingReturns.map(returnRequest => (
                  <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {approvedReturns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No approved returns</p>
                  </CardContent>
                </Card>
              ) : (
                approvedReturns.map(returnRequest => (
                  <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
                ))
              )}
            </TabsContent>

            <TabsContent value="processing" className="space-y-4">
              {processingReturns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No returns being processed</p>
                  </CardContent>
                </Card>
              ) : (
                processingReturns.map(returnRequest => (
                  <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedReturns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No completed returns</p>
                  </CardContent>
                </Card>
              ) : (
                completedReturns.map(returnRequest => (
                  <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Loading returns...</p>
                  </CardContent>
                </Card>
              ) : (
                returns.map(returnRequest => (
                  <ReturnCard key={returnRequest.id} returnRequest={returnRequest} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReturn.return_number}</DialogTitle>
              <DialogDescription>Return request management</DialogDescription>
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
                    <p className="text-sm text-muted-foreground mb-1">Customer Description</p>
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
                                <Badge variant="outline" className="mt-1">
                                  {item.condition}
                                </Badge>
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
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium capitalize">{transaction.transaction_type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {transaction.status} • {new Date(transaction.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                                {transaction.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteTransaction(transaction.id)}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {selectedReturn.status === 'pending' && (
                    <>
                      <Button onClick={() => setActionDialog('approve')}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => setActionDialog('reject')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  {['approved', 'processing'].includes(selectedReturn.status) && (
                    <>
                      <Button onClick={() => setActionDialog('status')}>
                        Update Status
                      </Button>
                      <Button variant="outline" onClick={() => setActionDialog('refund')}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Process Refund
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Return Request</DialogTitle>
            <DialogDescription>Approve this return and allow processing to begin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Return Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this return.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-notes">Rejection Reason *</Label>
              <Textarea
                id="reject-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain why this return is being rejected..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleReject}>Reject Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'status'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Return Status</DialogTitle>
            <DialogDescription>Change the status of this return request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ReturnStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-notes">Notes (Optional)</Label>
              <Textarea
                id="status-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'refund'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>Create a refund transaction for this return.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-type">Transaction Type</Label>
              <Select value={refundType} onValueChange={(value) => setRefundType(value as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="refund-notes">Notes (Optional)</Label>
              <Textarea
                id="refund-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this refund..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleCreateRefund}>Create Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
