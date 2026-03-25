/**
 * Price display component with currency conversion
 */

'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/lib/currency-context-geo';
import { convertCurrency, formatPrice } from '@/lib/currency-service-api';


interface PriceDisplayProps {
  amount: number;
  baseCurrency?: string;
  className?: string;
  showCurrencyCode?: boolean;
}

export function PriceDisplay({
  amount,
  baseCurrency = 'USD',
  className = '',
  showCurrencyCode = false,
}: PriceDisplayProps) {
  const { currentCurrency } = useCurrency();
  const [displayPrice, setDisplayPrice] = useState<string>('–');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const convertAndFormat = async () => {
      try {
        const convertedAmount = await convertCurrency(amount, baseCurrency, currentCurrency);
        const formatted = formatPrice(convertedAmount, currentCurrency);
        setDisplayPrice(formatted);
      } catch (error) {
        console.error('Error converting currency:', error);
        setDisplayPrice(formatPrice(amount, baseCurrency));
      } finally {
        setIsLoading(false);
      }
    };

    convertAndFormat();
  }, [amount, baseCurrency, currentCurrency]);

  if (isLoading) {
    return <span className={className}>–</span>;
  }

  const shouldShowCurrencyCode =
    showCurrencyCode && !displayPrice.toUpperCase().includes(currentCurrency.toUpperCase());

  return (
    <span className={className}>
      {displayPrice}
      {shouldShowCurrencyCode && <span className="text-xs ml-1">({currentCurrency})</span>}
    </span>
  );
}
