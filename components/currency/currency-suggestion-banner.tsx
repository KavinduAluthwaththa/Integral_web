/**
 * Currency suggestion banner
 * Shows when auto-detected location suggests a different currency
 */

'use client';

import { useCurrency } from '@/lib/currency-context-geo';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

export function CurrencySuggestionBanner() {
  const { suggestedCurrency, acceptSuggestion, currentCurrency } = useCurrency();
  const [dismissed, setDismissed] = useState(false);

  if (!suggestedCurrency || dismissed || suggestedCurrency === currentCurrency) {
    return null;
  }

  const suggestedInfo = SUPPORTED_CURRENCIES[suggestedCurrency];
  const currentInfo = SUPPORTED_CURRENCIES[currentCurrency];

  return (
    <div className="bg-blue-50 border-b-2 border-foreground px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="text-sm">
          <p className="text-foreground font-medium mb-1">
            We detected you&apos;re in {suggestedInfo.name.split(' ')[0]}
          </p>
          <p className="text-sm text-muted-foreground">
            Would you like to switch from {currentInfo.code} to {suggestedInfo.code}?
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              acceptSuggestion(suggestedCurrency);
              setDismissed(true);
            }}
            className="text-xs"
          >
            Use {suggestedInfo.code}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
            aria-label="Dismiss suggestion"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
