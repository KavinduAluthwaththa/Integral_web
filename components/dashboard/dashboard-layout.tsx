'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/navigation/navbar';
import { useCart } from '@/lib/cart-context';
import { User, MapPin, Package, Heart, Eye, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const baseNavItems = [
  { href: '/dashboard', label: 'Profile', icon: User },
  { href: '/dashboard/addresses', label: 'Address Book', icon: MapPin },
  { href: '/dashboard/orders', label: 'Order History', icon: Package },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Heart },
  { href: '/dashboard/recently-viewed', label: 'Recently Viewed', icon: Eye },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { itemCount } = useCart();

  const navItems = baseNavItems;

  return (
    <>
      <Navbar cartCount={itemCount} onCartClick={() => {}} onSearchClick={() => {}} />

      <main className="min-h-screen bg-background pt-4xl pb-3xl">
        <div className="max-w-7xl mx-auto px-xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
            <aside className="lg:col-span-1 border-b-2 lg:border-b-0 lg:border-r-2 border-foreground pb-2xl lg:pb-0 lg:pr-2xl mb-2xl lg:mb-0">
              <div className="space-y-xl">
                <div className="space-y-sm">
                  <h2 className="font-display text-sm tracking-widest uppercase">My Account</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <nav className="space-y-xs">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            'flex items-center gap-sm px-md py-sm border-2 border-transparent transition-colors duration-200',
                            'hover:bg-foreground hover:text-background',
                            isActive && 'text-foreground',
                            isActive && 'border-foreground'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon size={18} strokeWidth={1.5} />
                          <span className="text-sm tracking-wide">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}

                  <button
                    onClick={signOut}
                    className="flex items-center gap-sm px-md py-sm hover:bg-foreground hover:text-background transition-colors duration-200 w-full text-left"
                  >
                    <LogOut size={18} strokeWidth={1.5} />
                    <span className="text-sm tracking-wide">Sign Out</span>
                  </button>
                </nav>
              </div>
            </aside>

            <div className="lg:col-span-3 lg:pl-2xl">{children}</div>
          </div>
        </div>
      </main>
    </>
  );
}
