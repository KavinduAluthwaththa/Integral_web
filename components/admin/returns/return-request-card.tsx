import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReturnRequest } from '@/lib/returns-service';
import { getReturnStatusBadgeColor, getReturnStatusLabel } from '@/lib/returns/status-ui';

interface ReturnRequestCardProps {
  returnRequest: ReturnRequest;
  onView: (returnRequest: ReturnRequest) => void;
}

export function ReturnRequestCard({ returnRequest, onView }: ReturnRequestCardProps) {
  const adminCardClasses = 'rounded-none border-2 border-foreground/40 shadow-none';

  return (
    <Card className={adminCardClasses}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-light tracking-wide">{returnRequest.return_number}</CardTitle>
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
            <p className="font-light tracking-wide">{returnRequest.reason.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Refund Amount:</span>
            <p className="font-light tracking-wide">${returnRequest.refund_amount.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Refund Method:</span>
            <p className="font-light tracking-wide">
              {returnRequest.refund_method === 'original_payment'
                ? 'Original Payment'
                : returnRequest.refund_method === 'store_credit'
                ? 'Store Credit'
                : 'Exchange'}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => onView(returnRequest)}>
          View & Manage
        </Button>
      </CardContent>
    </Card>
  );
}