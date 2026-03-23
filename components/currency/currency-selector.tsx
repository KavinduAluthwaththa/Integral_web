/**
 * Currency selector component
 */

'use client';

import { useCurrency } from '@/lib/currency-context-geo';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CurrencySelector() {
  const { currentCurrency, setCurrency, isLoading } = useCurrency();

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-muted-foreground" />
      <Select value={currentCurrency} onValueChange={(value) => void setCurrency(value as any)}>
        <SelectTrigger className="w-[140px] rounded-none border-2 border-foreground/20 bg-background text-foreground focus:border-foreground focus:outline-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border-2 border-foreground bg-background text-foreground">
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem
              key={code}
              value={code}
              className="rounded-none focus:bg-foreground focus:text-background"
            >
              {code} - {info.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
