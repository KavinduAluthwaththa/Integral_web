/**
 * Main header with navbar and currency suggestion banner
 */

'use client';

import { Navbar } from '@/components/navigation/navbar';
import { CurrencySuggestionBanner } from '@/components/currency/currency-suggestion-banner';

interface HeaderProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ cartCount = 0, onCartClick, onSearchClick }: HeaderProps) {
  return (
    <>
      <CurrencySuggestionBanner />
      <Navbar 
        cartCount={cartCount} 
        onCartClick={onCartClick} 
        onSearchClick={onSearchClick} 
      />
    </>
  );
}
