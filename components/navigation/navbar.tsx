'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, User as UserIcon } from 'lucide-react';
import { CartIcon } from '@/components/icons/cart-icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface NavbarProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
}

export function Navbar({ cartCount = 0, onCartClick, onSearchClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/newsletter', label: 'Lookbook' },
  ];

  return (
    <nav className="w-full bg-background border-b border-foreground/10 sticky top-0 z-50" aria-label="Main navigation">
      <div className="container mx-auto px-lg h-16 relative flex items-center justify-between">
        {/* Left Navigation */}
        <div className="hidden md:flex items-center gap-2xl" role="navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-widest font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Center Brand */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-display font-bold uppercase text-xl tracking-widest hover:opacity-75 transition-opacity"
          aria-label="Streetwear home"
        >
          STREETWEAR
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-lg ml-auto">
          <button
            onClick={onSearchClick}
            className="hidden sm:block p-0 text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>

          {user ? (
            <Link href="/dashboard" className="hidden sm:flex text-foreground/70 hover:text-foreground transition-colors" aria-label="Account">
              <UserIcon size={18} strokeWidth={1.5} />
            </Link>
          ) : (
            <Link href="/login" className="hidden sm:flex text-xs uppercase tracking-widest font-medium text-foreground/70 hover:text-foreground transition-colors" aria-label="Sign in">
              Sign In
            </Link>
          )}

          <CartIcon count={cartCount} onClick={onCartClick} />

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground/70 hover:text-foreground transition-colors"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-foreground/10 bg-background animate-fade-in" role="navigation" aria-label="Mobile navigation">
          <div className="container mx-auto px-lg py-lg flex flex-col gap-md">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs uppercase tracking-widest font-medium text-foreground/70 hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" className="text-xs uppercase tracking-widest font-medium text-foreground/70 hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
