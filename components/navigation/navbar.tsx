'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Menu,
  ShoppingBag,
  X,
} from 'lucide-react';
import { CartIcon } from '@/components/icons/cart-icon';

import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context-geo';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/lib/currencies';

const NAV_CURRENCY_CODES: readonly CurrencyCode[] = ['LKR', 'USD', 'GBP', 'EUR', 'AUD'];

interface NavbarProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
}

export function Navbar({ cartCount = 0, onCartClick, onSearchClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { currentCurrency, setCurrency } = useCurrency();

  const currencyOptions = useMemo(
    () => NAV_CURRENCY_CODES.map((code) => SUPPORTED_CURRENCIES[code]),
    []
  );



  const socialLinks = [
    { href: 'https://youtube.com', label: 'YouTube' },
    { href: 'https://instagram.com', label: 'Instagram' },
    { href: 'https://facebook.com', label: 'Facebook' },
    { href: 'https://tiktok.com', label: 'TikTok' },
  ];

  const accountLink = { href: user ? '/dashboard' : '/login', label: 'Account' };

  return (
    <nav className="w-full bg-background sticky top-0 z-50" aria-label="Main navigation">
      <div className="hidden md:block h-12 w-full border-b-2 border-foreground/40">
        <div className="relative h-full w-full">
          <div className="absolute left-0 top-0 flex h-full">
          {socialLinks.map((link) => {
            return (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-12 w-12 items-center justify-center border-r-2 border-foreground/40 text-foreground/75 transition-colors duration-300 hover:border-white hover:bg-foreground"
                aria-label={link.label}
              >
                {link.label === 'YouTube' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="transition-colors duration-300 group-hover:text-background">
                    <path d="M164.44,121.34l-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32ZM120,145.05V111l25.58,17ZM234.33,69.52a24,24,0,0,0-14.49-16.4C185.56,39.88,131,40,128,40s-57.56-.12-91.84,13.12a24,24,0,0,0-14.49,16.4C19.08,79.5,16,97.74,16,128s3.08,48.5,5.67,58.48a24,24,0,0,0,14.49,16.41C69,215.56,120.4,216,127.34,216h1.32c6.94,0,58.37-.44,91.18-13.11a24,24,0,0,0,14.49-16.41c2.59-10,5.67-28.22,5.67-58.48S236.92,79.5,234.33,69.52Zm-15.49,113a8,8,0,0,1-4.77,5.49c-31.65,12.22-85.48,12-86,12H128c-.54,0-54.33.2-86-12a8,8,0,0,1-4.77-5.49C34.8,173.39,32,156.57,32,128s2.8-45.39,5.16-54.47A8,8,0,0,1,41.93,68c30.52-11.79,81.66-12,85.85-12h.27c.54,0,54.38-.18,86,12a8,8,0,0,1,4.77,5.49C221.2,82.61,224,99.43,224,128S221.2,173.39,218.84,182.47Z" />
                  </svg>
                ) : link.label === 'Instagram' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="transition-colors duration-300 group-hover:text-background">
                    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z" />
                  </svg>
                ) : link.label === 'Facebook' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="transition-colors duration-300 group-hover:text-background">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,191.63V152h24a8,8,0,0,0,0-16H136V112a16,16,0,0,1,16-16h16a8,8,0,0,0,0-16H152a32,32,0,0,0-32,32v24H96a8,8,0,0,0,0,16h24v63.63a88,88,0,1,1,16,0Z" />
                  </svg>
                ) : link.label === 'TikTok' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="transition-colors duration-300 group-hover:text-background">
                    <path d="M224,72a48.05,48.05,0,0,1-48-48,8,8,0,0,0-8-8H128a8,8,0,0,0-8,8V156a20,20,0,1,1-28.57-18.08A8,8,0,0,0,96,130.69V88a8,8,0,0,0-9.4-7.88C50.91,86.48,24,119.1,24,156a76,76,0,0,0,152,0V116.29A103.25,103.25,0,0,0,224,128a8,8,0,0,0,8-8V80A8,8,0,0,0,224,72Zm-8,39.64a87.19,87.19,0,0,1-43.33-16.15A8,8,0,0,0,160,102v54a60,60,0,0,1-120,0c0-25.9,16.64-49.13,40-57.6v27.67A36,36,0,1,0,136,156V32h24.5A64.14,64.14,0,0,0,216,87.5Z" />
                  </svg>
                ) : null}
              </Link>
            );
          })}
          </div>

          <Link
            href="/"
            className="absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-center justify-center px-10 font-display text-[44px] lowercase leading-none tracking-tight hover:opacity-80 transition-opacity"
            aria-label="Integral home"
          >
            <span
              className="h-9 w-[170px] bg-foreground"
              style={{
                WebkitMaskImage: "url('/brand/logo/logo.svg')",
                maskImage: "url('/brand/logo/logo.svg')",
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
              aria-hidden="true"
            />
          </Link>

          <div className="absolute right-0 top-0 flex h-full">
          <div className="hidden lg:flex h-12 items-center border-l-2 border-foreground/40 px-4 relative group">
            <button
              className="text-sm font-mono uppercase tracking-[0.18em] focus:outline-none"
              title={currentCurrency}
              aria-haspopup="listbox"
              aria-expanded="false"
              tabIndex={0}
            >
              {currentCurrency}
            </button>
            <div className="absolute right-0 top-12 z-50 hidden group-focus-within:block group-hover:block bg-background border border-foreground/20 rounded shadow-lg min-w-[120px]">
              <ul className="py-1 px-0" tabIndex={-1} role="listbox">
                {NAV_CURRENCY_CODES.map((code) => (
                  <li key={code}>
                    <button
                      className={`block w-full px-3 py-1.5 text-base text-center hover:bg-foreground/10 ${currentCurrency === code ? 'font-bold' : ''}`}
                      onClick={() => setCurrency(code)}
                      role="option"
                      aria-selected={currentCurrency === code}
                    >
                      <span className="font-mono">{code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link
            href="/shop"
            className="group flex h-12 w-12 items-center justify-center border-l-2 border-foreground/40 text-foreground/75 transition-colors duration-300 hover:border-white hover:bg-foreground"
            aria-label="Shop"
          >
            <ShoppingBag size={20} strokeWidth={1.5} className="transition-colors duration-300 group-hover:text-background" />
          </Link>

          <div className="group flex h-12 w-12 items-center justify-center border-l-2 border-foreground/40 text-foreground/75 transition-colors duration-300 hover:border-white hover:bg-foreground">
            <CartIcon count={cartCount} onClick={onCartClick} className="group text-inherit transition-colors duration-300 hover:opacity-100" />
          </div>

          <Link
            href="/favorites"
            className="group flex h-12 w-12 items-center justify-center border-l-2 border-foreground/40 text-foreground/75 transition-colors duration-300 hover:border-white hover:bg-foreground"
            aria-label="Favorites"
          >
            <Heart size={20} strokeWidth={1.5} className="transition-colors duration-300 group-hover:text-background" />
          </Link>

          <Link
            href={accountLink.href}
            className="group flex h-12 w-12 items-center justify-center border-l-2 border-foreground/40 text-foreground/75 transition-colors duration-300 hover:border-white hover:bg-foreground"
            aria-label={accountLink.label}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="transition-colors duration-300 group-hover:text-background">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
            </svg>
          </Link>
          </div>
        </div>
      </div>

      <div className="md:hidden h-14 border-b-2 border-foreground/40 px-md flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground/75 hover:text-foreground transition-colors"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>

        <Link href="/" className="font-display text-3xl lowercase tracking-tight leading-none" aria-label="Integral home">
          <span
            className="block h-7 w-[130px] bg-foreground"
            style={{
              WebkitMaskImage: "url('/brand/logo/logo.svg')",
              maskImage: "url('/brand/logo/logo.svg')",
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
            aria-hidden="true"
          />
        </Link>

        <div className="flex items-center gap-sm">
          <CartIcon count={cartCount} onClick={onCartClick} />
          <Link
            href="/favorites"
            className="text-foreground/75 hover:text-foreground transition-colors"
            aria-label="Favorites"
          >
            <Heart size={20} strokeWidth={1.5} />
          </Link>
          <Link
            href="/shop"
            className="text-foreground/75 hover:text-foreground transition-colors"
            aria-label="Shop"
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {isOpen && (
        <div id="mobile-menu" className="md:hidden border-t-2 border-foreground/40 bg-background animate-fade-in" role="navigation" aria-label="Mobile navigation">
          <div className="container mx-auto px-lg py-lg flex flex-col gap-md">
            <Link
              href="/shop"
              className="text-xs uppercase tracking-widest font-medium text-foreground/75 hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Shop
            </Link>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Currency</span>
              <select
                className="border-2 border-foreground/30 bg-background px-2 py-2 text-xs uppercase tracking-[0.18em] text-foreground"
                value={currentCurrency}
                onChange={(event) => setCurrency(event.target.value as any)}
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.symbol}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href={user ? '/dashboard' : '/login'}
              className="text-xs uppercase tracking-widest font-medium text-foreground/75 hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Account
            </Link>
            {socialLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-widest font-medium text-foreground/75 hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
