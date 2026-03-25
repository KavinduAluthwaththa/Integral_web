'use client';

import { Heart } from 'lucide-react';
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
      className={cn('group relative p-0 hover:opacity-75 transition-opacity', className)}
      aria-label="Shopping cart"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="currentColor"
        viewBox="0 0 256 256"
        aria-hidden="true"
        className="transition-colors duration-300 group-hover:text-background"
      >
        <path d="M104,216a16,16,0,1,1-16-16A16,16,0,0,1,104,216Zm88-16a16,16,0,1,0,16,16A16,16,0,0,0,192,200ZM239.71,74.14l-25.64,92.28A24.06,24.06,0,0,1,191,184H92.16A24.06,24.06,0,0,1,69,166.42L33.92,40H16a8,8,0,0,1,0-16H40a8,8,0,0,1,7.71,5.86L57.19,64H232a8,8,0,0,1,7.71,10.14ZM221.47,80H61.64l22.81,82.14A8,8,0,0,0,92.16,168H191a8,8,0,0,0,7.71-5.86Z" />
      </svg>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-2 -right-2 bg-foreground text-background border border-background text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
