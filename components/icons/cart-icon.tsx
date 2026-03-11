'use client';

import { Heart, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps {
  count?: number;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export function CartIcon({ count, className, onClick }: IconProps) {
  return (
    <button
      onClick={onClick}
      className={cn('relative p-0 hover:opacity-75 transition-opacity', className)}
      aria-label="Shopping cart"
    >
      <ShoppingBag size={24} />
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export function FavoriteIcon({ isActive, className, onClick }: IconProps) {
  return (
    <button
      onClick={onClick}
      className={cn('relative p-0 hover:opacity-75 transition-opacity', className)}
      aria-label="Add to favorites"
    >
      <Heart
        size={24}
        fill={isActive ? 'currentColor' : 'none'}
        strokeWidth={1.5}
      />
    </button>
  );
}
